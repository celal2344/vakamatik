import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { app, BrowserWindow, dialog, ipcMain, protocol, session } from "electron";
import {
  assignImportedImage,
  acknowledgeManagedCaseWarnings,
  createManagedCase,
  openManagedCase,
  relinkMissingManagedAsset,
  updateManagedCaseAlignment,
  updateManagedCaseClinical,
  updateManagedCaseTitle,
  type OpenManagedCase,
} from "@vakamatik/case-store";
import {
  DESKTOP_APP_ORIGIN,
  DESKTOP_APP_SCHEME,
  caseCloseRequestSchema,
  caseCloseResponseSchema,
  caseCreateRequestSchema,
  caseDialogResultSchema,
  caseImportImageRequestSchema,
  caseAlignmentSaveRequestSchema,
  caseClinicalSaveRequestSchema,
  caseOpenRequestSchema,
  caseSessionActivateRequestSchema,
  caseSessionForgetRequestSchema,
  caseSessionForgetResponseSchema,
  caseSessionListRequestSchema,
  caseSessionListResponseSchema,
  caseSessionRelinkRequestSchema,
  caseSessionRepairAssetRequestSchema,
  caseSessionRepairAssetResultSchema,
  caseSessionUiStateSaveRequestSchema,
  caseSessionUiStateSaveResponseSchema,
  caseSaveRequestSchema,
  caseViewSchema,
  presentationExportResultSchema,
  presentationAcknowledgeRequestSchema,
  presentationRequestSchema,
  presentationSlidePreviewRequestSchema,
  presentationSlideViewSchema,
  semanticSlideIdSchema,
  presentationViewSchema,
  shellAppInfoSchema,
  shellCompleteCloseRequestSchema,
  shellCompleteCloseResponseSchema,
  shellGetAppInfoRequestSchema,
  shellPingRequestSchema,
  shellPingResponseSchema,
} from "@vakamatik/desktop-contract";
import { DESKTOP_IPC_CHANNELS } from "@vakamatik/desktop-contract/ipc";
import {
  buildPresentationDocument,
  CANONICAL_SLIDES,
  defaultLinkGroupForImage,
  hasUnacknowledgedPresentationWarnings,
  presentationWarningKey,
  type PresentationAssetKey,
} from "@vakamatik/layout-engine";
import { readThumbnailDataUrl, resolveManagedRelativePath } from "@vakamatik/media";
import { PptxGenJsExporter } from "@vakamatik/pptx-exporter";
import type { ImageElement, SlideDefinition } from "@vakamatik/export-contract";
import { renderPresentationPreviews, renderSlideToSvg } from "@vakamatik/preview";
import { RECORD_SLOTS } from "@vakamatik/domain";
import { assertTrustedIpcSender, isTrustedRendererUrl, resolveApplicationAsset } from "./security.js";
import { CaseSessionRegistry } from "./session-registry.js";
import { normalizedCoverCrop } from "./image-crop.js";

const CONTENT_SECURITY_POLICY = [
  "default-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "media-src 'none'",
  "worker-src 'none'",
].join("; ");

const MIME_TYPES: Readonly<Record<string, string>> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

protocol.registerSchemesAsPrivileged([
  {
    scheme: DESKTOP_APP_SCHEME,
    privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: false },
  },
]);

const developmentServerUrl = validateDevelopmentServerUrl(process.env.VAKAMATIK_DEV_SERVER_URL);

function validateDevelopmentServerUrl(value: string | undefined): string | undefined {
  if (value === undefined || value === "") return undefined;
  const parsed = new URL(value);
  if (parsed.protocol !== "http:" || !new Set(["127.0.0.1", "localhost"]).has(parsed.hostname)) {
    throw new Error("VAKAMATIK_DEV_SERVER_URL must be a loopback HTTP URL.");
  }
  return parsed.origin;
}

function registerRestrictedProtocol(): void {
  const rendererRoot = path.join(app.getAppPath(), ".vite", "renderer");
  protocol.handle(DESKTOP_APP_SCHEME, async (request) => {
    try {
      const assetPath = resolveApplicationAsset(rendererRoot, request.url);
      const body = await readFile(assetPath);
      return new Response(body, {
        status: 200,
        headers: {
          "Content-Security-Policy": CONTENT_SECURITY_POLICY,
          "Content-Type": MIME_TYPES[path.extname(assetPath).toLowerCase()] ?? "application/octet-stream",
          "Cross-Origin-Opener-Policy": "same-origin",
          "X-Content-Type-Options": "nosniff",
        },
      });
    } catch {
      return new Response("Not found", {
        status: 404,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }
  });
}

function installSessionSecurity(): void {
  const applicationSession = session.defaultSession;
  applicationSession.setPermissionCheckHandler(() => false);
  applicationSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });
}

async function toCaseView(opened: OpenManagedCase) {
  const assetEntries = await Promise.all(
    Object.values(opened.document.assets).map(
      async (asset) =>
        [
          asset.assetId,
          {
            assetId: asset.assetId,
            displayName: asset.displayName,
            mimeType: asset.mimeType,
            width: asset.width,
            height: asset.height,
            thumbnailDataUrl: await readThumbnailDataUrl(opened.root, asset),
          },
        ] as const,
    ),
  );
  return caseViewSchema.parse({
    caseId: opened.document.caseId,
    revision: opened.document.revision,
    title: opened.document.title,
    folderName: path.basename(opened.root),
    createdAt: opened.document.createdAt,
    updatedAt: opened.document.updatedAt,
    assets: Object.fromEntries(assetEntries),
    assignments: opened.document.assignments,
    clinical: opened.document.clinical,
    presentation: opened.document.presentation,
    alignment: opened.document.alignment,
  });
}

async function buildActivePresentation(opened: OpenManagedCase, alignment = opened.document.alignment) {
  const entries = await Promise.all(
    Object.entries(opened.document.assignments).map(async ([slotId, assetId]) => {
      const asset = opened.document.assets[assetId];
      if (asset === undefined) throw new Error("Assigned presentation asset is missing.");
      return [
        slotId as PresentationAssetKey,
        {
          assetId: asset.assetId,
          filePath: await resolveManagedRelativePath(opened.root, asset.normalizedRelativePath, {
            mustExist: true,
          }),
          previewFilePath: await resolveManagedRelativePath(opened.root, asset.thumbnailRelativePath, {
            mustExist: true,
          }),
          widthPx: asset.width,
          heightPx: asset.height,
        },
      ] as const;
    }),
  );
  const assets = Object.fromEntries(entries);
  return {
    ...buildPresentationDocument({
      title: opened.document.title,
      assets,
      clinical: opened.document.clinical,
      alignment,
      options: { slide8Behavior: opened.document.presentation.slide8Behavior },
    }),
    assets,
  };
}

function imageAdjustmentFromElement(element: ImageElement) {
  return {
    ...element.transform,
    crop:
      element.crop ??
      (element.placement === "cover"
        ? normalizedCoverCrop(
            element.source.widthPx,
            element.source.heightPx,
            element.bounds.widthPt,
            element.bounds.heightPt,
          )
        : { left: 0, top: 0, right: 0, bottom: 0 }),
  };
}

async function toPresentationView(opened: OpenManagedCase) {
  const built = await buildActivePresentation(opened);
  const baseline = buildPresentationDocument({
    title: opened.document.title,
    assets: built.assets,
    clinical: opened.document.clinical,
    options: { slide8Behavior: opened.document.presentation.slide8Behavior },
  });
  const previews = await renderPresentationPreviews(built.document);
  const titleById = new Map(CANONICAL_SLIDES.map(([id, title]) => [id, title]));
  const acknowledged = new Set(opened.document.presentation.acknowledgedWarningKeys);
  const warnings = built.warnings.map((warning) => ({
    ...warning,
    key: presentationWarningKey(warning),
    acknowledged: acknowledged.has(presentationWarningKey(warning)),
  }));
  return presentationViewSchema.parse({
    caseId: opened.document.caseId,
    revision: opened.document.revision,
    slides: previews.map((preview, index) => {
      const semanticSlideId = semanticSlideIdSchema.parse(preview.semanticId);
      const slide = built.document.slides[index];
      if (slide === undefined) throw new Error("Preview does not have a matching slide.");
      return {
        semanticSlideId,
        displayNumber: index + 1,
        title: titleById.get(semanticSlideId) ?? semanticSlideId,
        previewDataUrl: preview.svgDataUrl,
        imageLayers: imageLayersForSlide(
          opened,
          slide,
          baseline.document.slides.find((slide) => slide.semanticId === semanticSlideId),
        ),
      };
    }),
    warnings,
    hasUnacknowledgedWarnings: warnings.some((warning) => !warning.acknowledged),
  });
}

const recordLabelById = new Map<string, string>(RECORD_SLOTS.map((slot) => [slot.id, slot.label]));

function imageLayersForSlide(
  opened: OpenManagedCase,
  slide: SlideDefinition,
  baselineSlide: SlideDefinition | undefined,
  alignment = opened.document.alignment,
) {
  return slide.elements.flatMap((element) => {
    if (element.kind !== "image") return [];
    const baselineElement = baselineSlide?.elements.find(
      (candidate) => candidate.kind === "image" && candidate.id === element.id,
    );
    const configured = alignment.instances[element.id];
    const availableLinkGroup = defaultLinkGroupForImage(element.id);
    const assetKey = element.id.slice(`${slide.semanticId}-`.length);
    return [
      {
        instanceId: element.id,
        assetKey,
        label: recordLabelById.get(assetKey) ?? assetKey.replaceAll("_", " "),
        linkGroup: configured === undefined ? availableLinkGroup : configured.linkGroup,
        availableLinkGroup,
        transform: imageAdjustmentFromElement(element),
        defaultTransform:
          baselineElement?.kind === "image"
            ? imageAdjustmentFromElement(baselineElement)
            : imageAdjustmentFromElement(element),
        bounds: element.bounds,
        zIndex: element.zIndex,
      },
    ];
  });
}

function registerIpcHandlers(window: BrowserWindow, completeClose: () => void): void {
  for (const channel of Object.values(DESKTOP_IPC_CHANNELS)) ipcMain.removeHandler(channel);
  let activeCase: OpenManagedCase | undefined;
  const sessionRegistry = new CaseSessionRegistry(app.getPath("userData"));

  const registerSession = async (opened: OpenManagedCase) => {
    const view = await toCaseView(opened);
    await sessionRegistry.register(opened.root, view);
    return view;
  };

  ipcMain.handle(DESKTOP_IPC_CHANNELS.getAppInfo, (event, request: unknown) => {
    assertTrustedIpcSender(event, window.webContents, developmentServerUrl);
    shellGetAppInfoRequestSchema.parse(request);
    return shellAppInfoSchema.parse({
      name: app.getName(),
      version: app.getVersion(),
      platform: process.platform,
    });
  });

  ipcMain.handle(DESKTOP_IPC_CHANNELS.ping, (event, request: unknown) => {
    assertTrustedIpcSender(event, window.webContents, developmentServerUrl);
    const parsed = shellPingRequestSchema.parse(request);
    return shellPingResponseSchema.parse({ nonce: parsed.nonce, status: "ok" });
  });

  ipcMain.handle(DESKTOP_IPC_CHANNELS.completeClose, (event, request: unknown) => {
    assertTrustedIpcSender(event, window.webContents, developmentServerUrl);
    shellCompleteCloseRequestSchema.parse(request);
    completeClose();
    return shellCompleteCloseResponseSchema.parse({ status: "closing" });
  });

  ipcMain.handle(DESKTOP_IPC_CHANNELS.createCase, async (event, request: unknown) => {
    assertTrustedIpcSender(event, window.webContents, developmentServerUrl);
    const parsed = caseCreateRequestSchema.parse(request);
    const selection = await dialog.showOpenDialog(window, {
      title: "Vakaların kaydedileceği klasörü seçin",
      buttonLabel: "Burada oluştur",
      properties: ["openDirectory", "createDirectory"],
    });
    if (selection.canceled || selection.filePaths[0] === undefined) {
      return caseDialogResultSchema.parse({ status: "cancelled" });
    }
    try {
      activeCase = await createManagedCase(selection.filePaths[0], parsed.title);
      return caseDialogResultSchema.parse({ status: "ok", case: await registerSession(activeCase) });
    } catch {
      throw new Error("Case creation failed.");
    }
  });

  ipcMain.handle(DESKTOP_IPC_CHANNELS.openCase, async (event, request: unknown) => {
    assertTrustedIpcSender(event, window.webContents, developmentServerUrl);
    caseOpenRequestSchema.parse(request);
    const selection = await dialog.showOpenDialog(window, {
      title: "Vaka klasörünü açın",
      buttonLabel: "Vakayı aç",
      properties: ["openDirectory"],
    });
    if (selection.canceled || selection.filePaths[0] === undefined) {
      return caseDialogResultSchema.parse({ status: "cancelled" });
    }
    try {
      activeCase = await openManagedCase(selection.filePaths[0]);
      return caseDialogResultSchema.parse({ status: "ok", case: await registerSession(activeCase) });
    } catch {
      throw new Error("Case open failed.");
    }
  });

  ipcMain.handle(DESKTOP_IPC_CHANNELS.listCaseSessions, async (event, request: unknown) => {
    assertTrustedIpcSender(event, window.webContents, developmentServerUrl);
    caseSessionListRequestSchema.parse(request);
    return caseSessionListResponseSchema.parse({ sessions: await sessionRegistry.list() });
  });

  ipcMain.handle(DESKTOP_IPC_CHANNELS.activateCaseSession, async (event, request: unknown) => {
    assertTrustedIpcSender(event, window.webContents, developmentServerUrl);
    const parsed = caseSessionActivateRequestSchema.parse(request);
    const root = await sessionRegistry.rootFor(parsed.caseId);
    if (root === undefined) throw new Error("Case session was not found.");
    try {
      const opened = await openManagedCase(root);
      if (opened.document.caseId !== parsed.caseId) throw new Error("Case identity changed.");
      activeCase = opened;
      return caseViewSchema.parse(await registerSession(opened));
    } catch {
      throw new Error("Case session could not be activated.");
    }
  });

  ipcMain.handle(DESKTOP_IPC_CHANNELS.forgetCaseSession, async (event, request: unknown) => {
    assertTrustedIpcSender(event, window.webContents, developmentServerUrl);
    const parsed = caseSessionForgetRequestSchema.parse(request);
    if (activeCase?.document.caseId === parsed.caseId) activeCase = undefined;
    await sessionRegistry.forget(parsed.caseId);
    return caseSessionForgetResponseSchema.parse({ status: "forgotten" });
  });

  ipcMain.handle(DESKTOP_IPC_CHANNELS.relinkCaseSession, async (event, request: unknown) => {
    assertTrustedIpcSender(event, window.webContents, developmentServerUrl);
    const parsed = caseSessionRelinkRequestSchema.parse(request);
    const selection = await dialog.showOpenDialog(window, {
      title: "Vaka klasörünü yeniden bağlayın",
      buttonLabel: "Yeniden bağla",
      properties: ["openDirectory"],
    });
    if (selection.canceled || selection.filePaths[0] === undefined) {
      return caseDialogResultSchema.parse({ status: "cancelled" });
    }
    try {
      const opened = await openManagedCase(selection.filePaths[0]);
      if (opened.document.caseId !== parsed.caseId)
        throw new Error("Selected folder belongs to another case.");
      activeCase = opened;
      return caseDialogResultSchema.parse({ status: "ok", case: await registerSession(opened) });
    } catch {
      throw new Error("Case session relink failed.");
    }
  });

  ipcMain.handle(DESKTOP_IPC_CHANNELS.repairMissingCaseAsset, async (event, request: unknown) => {
    assertTrustedIpcSender(event, window.webContents, developmentServerUrl);
    const parsed = caseSessionRepairAssetRequestSchema.parse(request);
    const root = await sessionRegistry.rootFor(parsed.caseId);
    if (root === undefined) throw new Error("Case session was not found.");
    const selection = await dialog.showOpenDialog(window, {
      title: "Eksik yönetilen görüntünün özgün dosyasını seçin",
      buttonLabel: "Eksik görüntüyü onar",
      properties: ["openFile"],
      filters: [{ name: "Desteklenen görüntüler", extensions: ["jpg", "jpeg", "png"] }],
    });
    if (selection.canceled || selection.filePaths[0] === undefined) {
      return caseSessionRepairAssetResultSchema.parse({ status: "cancelled" });
    }
    try {
      const repaired = await relinkMissingManagedAsset(root, selection.filePaths[0]);
      if (repaired.remainingMissingAssetIds.length > 0) {
        return caseSessionRepairAssetResultSchema.parse({
          status: "partial",
          remainingMissingAssets: repaired.remainingMissingAssetIds.length,
        });
      }
      activeCase = await openManagedCase(root);
      return caseSessionRepairAssetResultSchema.parse({
        status: "ok",
        case: await registerSession(activeCase),
      });
    } catch {
      throw new Error("Missing managed asset repair failed.");
    }
  });

  ipcMain.handle(DESKTOP_IPC_CHANNELS.saveCaseSessionUiState, async (event, request: unknown) => {
    assertTrustedIpcSender(event, window.webContents, developmentServerUrl);
    const parsed = caseSessionUiStateSaveRequestSchema.parse(request);
    await sessionRegistry.saveUiState(parsed.caseId, parsed.uiState);
    return caseSessionUiStateSaveResponseSchema.parse({ status: "saved" });
  });

  ipcMain.handle(DESKTOP_IPC_CHANNELS.saveCase, async (event, request: unknown) => {
    assertTrustedIpcSender(event, window.webContents, developmentServerUrl);
    const parsed = caseSaveRequestSchema.parse(request);
    try {
      const opened = requireActiveCase(activeCase, parsed.caseId);
      activeCase = await updateManagedCaseTitle(opened, parsed.revision, parsed.title);
      return caseViewSchema.parse(await registerSession(activeCase));
    } catch {
      throw new Error("Case save failed.");
    }
  });

  ipcMain.handle(DESKTOP_IPC_CHANNELS.closeCase, (event, request: unknown) => {
    assertTrustedIpcSender(event, window.webContents, developmentServerUrl);
    const parsed = caseCloseRequestSchema.parse(request);
    requireActiveCase(activeCase, parsed.caseId);
    activeCase = undefined;
    return caseCloseResponseSchema.parse({ status: "closed" });
  });

  ipcMain.handle(DESKTOP_IPC_CHANNELS.importCaseImage, async (event, request: unknown) => {
    assertTrustedIpcSender(event, window.webContents, developmentServerUrl);
    const parsed = caseImportImageRequestSchema.parse(request);
    const opened = requireActiveCase(activeCase, parsed.caseId);
    const selection = await dialog.showOpenDialog(window, {
      title: "Yerel görüntü seçin",
      buttonLabel: "Kayda ata",
      properties: ["openFile"],
      filters: [{ name: "Görüntüler", extensions: ["jpg", "jpeg", "png"] }],
    });
    if (selection.canceled || selection.filePaths[0] === undefined) {
      return caseDialogResultSchema.parse({ status: "cancelled" });
    }
    try {
      activeCase = await assignImportedImage(opened, parsed.revision, parsed.slotId, selection.filePaths[0]);
      return caseDialogResultSchema.parse({ status: "ok", case: await toCaseView(activeCase) });
    } catch {
      throw new Error("Image import failed.");
    }
  });

  ipcMain.handle(DESKTOP_IPC_CHANNELS.saveClinicalCase, async (event, request: unknown) => {
    assertTrustedIpcSender(event, window.webContents, developmentServerUrl);
    const parsed = caseClinicalSaveRequestSchema.parse(request);
    try {
      activeCase = await updateManagedCaseClinical(
        requireActiveCase(activeCase, parsed.caseId),
        parsed.revision,
        parsed.clinical,
        parsed.presentation,
      );
      return caseViewSchema.parse(await toCaseView(activeCase));
    } catch {
      throw new Error("Clinical case save failed.");
    }
  });

  ipcMain.handle(DESKTOP_IPC_CHANNELS.saveCaseAlignment, async (event, request: unknown) => {
    assertTrustedIpcSender(event, window.webContents, developmentServerUrl);
    const parsed = caseAlignmentSaveRequestSchema.parse(request);
    try {
      activeCase = await updateManagedCaseAlignment(
        requireActiveCase(activeCase, parsed.caseId),
        parsed.revision,
        parsed.alignment,
      );
      return caseViewSchema.parse(await toCaseView(activeCase));
    } catch {
      throw new Error("Image alignment save failed.");
    }
  });

  ipcMain.handle(DESKTOP_IPC_CHANNELS.acknowledgePresentationWarnings, async (event, request: unknown) => {
    assertTrustedIpcSender(event, window.webContents, developmentServerUrl);
    const parsed = presentationAcknowledgeRequestSchema.parse(request);
    try {
      const opened = requireActiveCase(activeCase, parsed.caseId, parsed.revision);
      const built = await buildActivePresentation(opened);
      const actualKeys = [...new Set(built.warnings.map(presentationWarningKey))].sort();
      if (actualKeys.join("|") !== [...new Set(parsed.warningKeys)].sort().join("|")) {
        throw new Error("Warning acknowledgement is stale.");
      }
      activeCase = await acknowledgeManagedCaseWarnings(opened, parsed.revision, actualKeys);
      return caseViewSchema.parse(await toCaseView(activeCase));
    } catch {
      throw new Error("Warning acknowledgement failed.");
    }
  });

  ipcMain.handle(DESKTOP_IPC_CHANNELS.getPresentation, async (event, request: unknown) => {
    assertTrustedIpcSender(event, window.webContents, developmentServerUrl);
    const parsed = presentationRequestSchema.parse(request);
    try {
      return await toPresentationView(requireActiveCase(activeCase, parsed.caseId, parsed.revision));
    } catch {
      throw new Error("Presentation preview failed.");
    }
  });

  ipcMain.handle(DESKTOP_IPC_CHANNELS.previewPresentationSlide, async (event, request: unknown) => {
    assertTrustedIpcSender(event, window.webContents, developmentServerUrl);
    const parsed = presentationSlidePreviewRequestSchema.parse(request);
    try {
      const opened = requireActiveCase(activeCase, parsed.caseId, parsed.revision);
      const built = await buildActivePresentation(opened, parsed.alignment);
      const slide = built.document.slides.find(
        (candidate) => candidate.semanticId === parsed.semanticSlideId,
      );
      if (slide === undefined) throw new Error("Slide is not part of this presentation.");
      const baseline = buildPresentationDocument({
        title: opened.document.title,
        assets: built.assets,
        clinical: opened.document.clinical,
        options: { slide8Behavior: opened.document.presentation.slide8Behavior },
      }).document.slides.find((candidate) => candidate.semanticId === parsed.semanticSlideId);
      const svg = await renderSlideToSvg(slide);
      const title =
        CANONICAL_SLIDES.find(([id]) => id === parsed.semanticSlideId)?.[1] ?? parsed.semanticSlideId;
      return presentationSlideViewSchema.parse({
        semanticSlideId: parsed.semanticSlideId,
        displayNumber:
          built.document.slides.findIndex((candidate) => candidate.semanticId === parsed.semanticSlideId) + 1,
        title,
        previewDataUrl: `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`,
        imageLayers: imageLayersForSlide(opened, slide, baseline, parsed.alignment),
      });
    } catch {
      throw new Error("Presentation slide preview failed.");
    }
  });

  ipcMain.handle(DESKTOP_IPC_CHANNELS.exportPresentation, async (event, request: unknown) => {
    assertTrustedIpcSender(event, window.webContents, developmentServerUrl);
    const parsed = presentationRequestSchema.parse(request);
    const opened = requireActiveCase(activeCase, parsed.caseId, parsed.revision);
    const exportsDirectory = path.join(opened.root, "exports");
    await mkdir(exportsDirectory, { recursive: true });
    const safeTitle =
      opened.document.title.replaceAll(/[<>:"/\\|?*\u0000-\u001F]/gu, "-").trim() || "vakamatik-sunum";
    const selection = await dialog.showSaveDialog(window, {
      title: "PowerPoint sunumunu dışa aktar",
      buttonLabel: "PowerPoint oluştur",
      defaultPath: path.join(exportsDirectory, `${safeTitle}.pptx`),
      filters: [{ name: "PowerPoint", extensions: ["pptx"] }],
    });
    if (selection.canceled || selection.filePath === "") {
      return presentationExportResultSchema.parse({ status: "cancelled" });
    }
    try {
      const built = await buildActivePresentation(opened);
      if (
        hasUnacknowledgedPresentationWarnings(
          built.warnings,
          opened.document.presentation.acknowledgedWarningKeys,
        )
      ) {
        throw new Error("Missing clinical content must be acknowledged before export.");
      }
      const result = await new PptxGenJsExporter().export(built.document, selection.filePath);
      if (!result.validation.ok) throw new Error("Presentation validation failed.");
      return presentationExportResultSchema.parse({
        status: "ok",
        fileName: path.basename(selection.filePath),
        slideCount: built.document.slides.length,
      });
    } catch {
      throw new Error("Presentation export failed.");
    }
  });
}

function requireActiveCase(
  activeCase: OpenManagedCase | undefined,
  caseId: string,
  revision?: number,
): OpenManagedCase {
  if (activeCase === undefined || activeCase.document.caseId !== caseId) {
    throw new Error("Requested case is not active.");
  }
  if (revision !== undefined && activeCase.document.revision !== revision) {
    throw new Error("Requested case revision is stale.");
  }
  return activeCase;
}

function createWindow(): BrowserWindow {
  let closeApproved = false;
  const window = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 760,
    minHeight: 560,
    show: process.env.VAKAMATIK_SMOKE_TEST !== "1",
    backgroundColor: "#f6f4ed",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-attach-webview", (event) => {
    event.preventDefault();
  });
  window.webContents.on("will-navigate", (event, url) => {
    if (!isTrustedRendererUrl(url, developmentServerUrl)) event.preventDefault();
  });
  registerIpcHandlers(window, () => {
    closeApproved = true;
    window.close();
  });
  window.on("close", (event) => {
    if (closeApproved || window.webContents.isDestroyed()) return;
    event.preventDefault();
    window.webContents.send(DESKTOP_IPC_CHANNELS.closeRequested);
  });

  const loadPromise =
    developmentServerUrl === undefined
      ? window.loadURL(`${DESKTOP_APP_ORIGIN}/index.html`)
      : window.loadURL(developmentServerUrl);

  void loadPromise.catch((error: unknown) => {
    console.error("Vakamatik renderer failed to load.", error);
    if (process.env.VAKAMATIK_SMOKE_TEST === "1") app.exit(1);
  });

  if (process.env.VAKAMATIK_SMOKE_TEST === "1") {
    window.webContents.once("did-finish-load", () => {
      console.log("VAKAMATIK_SMOKE_READY");
      app.quit();
    });
  }
  return window;
}

void app.whenReady().then(() => {
  registerRestrictedProtocol();
  installSessionSecurity();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
