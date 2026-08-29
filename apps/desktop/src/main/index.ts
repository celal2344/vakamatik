import { readFile } from "node:fs/promises";
import path from "node:path";
import { app, BrowserWindow, dialog, ipcMain, protocol, session } from "electron";
import {
  assignImportedImage,
  createManagedCase,
  openManagedCase,
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
  caseOpenRequestSchema,
  caseSaveRequestSchema,
  caseViewSchema,
  shellAppInfoSchema,
  shellGetAppInfoRequestSchema,
  shellPingRequestSchema,
  shellPingResponseSchema,
} from "@vakamatik/desktop-contract";
import { DESKTOP_IPC_CHANNELS } from "@vakamatik/desktop-contract/ipc";
import { readThumbnailDataUrl } from "@vakamatik/media";
import { assertTrustedIpcSender, isTrustedRendererUrl, resolveApplicationAsset } from "./security.js";

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
  });
}

function registerIpcHandlers(window: BrowserWindow): void {
  for (const channel of Object.values(DESKTOP_IPC_CHANNELS)) ipcMain.removeHandler(channel);
  let activeCase: OpenManagedCase | undefined;

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
      return caseDialogResultSchema.parse({ status: "ok", case: await toCaseView(activeCase) });
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
      return caseDialogResultSchema.parse({ status: "ok", case: await toCaseView(activeCase) });
    } catch {
      throw new Error("Case open failed.");
    }
  });

  ipcMain.handle(DESKTOP_IPC_CHANNELS.saveCase, async (event, request: unknown) => {
    assertTrustedIpcSender(event, window.webContents, developmentServerUrl);
    const parsed = caseSaveRequestSchema.parse(request);
    try {
      const opened = requireActiveCase(activeCase, parsed.caseId);
      activeCase = await updateManagedCaseTitle(opened, parsed.revision, parsed.title);
      return caseViewSchema.parse(await toCaseView(activeCase));
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
}

function requireActiveCase(activeCase: OpenManagedCase | undefined, caseId: string): OpenManagedCase {
  if (activeCase === undefined || activeCase.document.caseId !== caseId) {
    throw new Error("Requested case is not active.");
  }
  return activeCase;
}

function createWindow(): BrowserWindow {
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
  registerIpcHandlers(window);

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
