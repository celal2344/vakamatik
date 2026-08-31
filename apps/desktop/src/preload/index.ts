import { contextBridge, ipcRenderer } from "electron";
import {
  DESKTOP_GLOBAL_KEY,
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
  presentationViewSchema,
  shellAppInfoSchema,
  shellCompleteCloseRequestSchema,
  shellCompleteCloseResponseSchema,
  shellGetAppInfoRequestSchema,
  shellPingRequestSchema,
  shellPingResponseSchema,
  type ShellPingRequest,
  type ShellCompleteCloseRequest,
  type CaseCloseRequest,
  type CaseCreateRequest,
  type CaseImportImageRequest,
  type CaseAlignmentSaveRequest,
  type CaseClinicalSaveRequest,
  type CaseOpenRequest,
  type CaseSessionActivateRequest,
  type CaseSessionForgetRequest,
  type CaseSessionListRequest,
  type CaseSessionRelinkRequest,
  type CaseSessionRepairAssetRequest,
  type CaseSessionUiStateSaveRequest,
  type CaseSaveRequest,
  type PresentationRequest,
  type PresentationSlidePreviewRequest,
  type PresentationAcknowledgeRequest,
  type VakamatikDesktopApi,
} from "@vakamatik/desktop-contract";
import { DESKTOP_IPC_CHANNELS } from "@vakamatik/desktop-contract/ipc";

const desktopApi: VakamatikDesktopApi = Object.freeze({
  getAppInfo: async () => {
    const request = shellGetAppInfoRequestSchema.parse({});
    const response: unknown = await ipcRenderer.invoke(DESKTOP_IPC_CHANNELS.getAppInfo, request);
    return shellAppInfoSchema.parse(response);
  },
  ping: async (request: ShellPingRequest) => {
    const validatedRequest = shellPingRequestSchema.parse(request);
    const response: unknown = await ipcRenderer.invoke(DESKTOP_IPC_CHANNELS.ping, validatedRequest);
    return shellPingResponseSchema.parse(response);
  },
  onCloseRequested: (listener: () => void) => {
    const handler = (): void => listener();
    ipcRenderer.on(DESKTOP_IPC_CHANNELS.closeRequested, handler);
    return () => ipcRenderer.removeListener(DESKTOP_IPC_CHANNELS.closeRequested, handler);
  },
  completeClose: async (request: ShellCompleteCloseRequest) => {
    const validatedRequest = shellCompleteCloseRequestSchema.parse(request);
    const response: unknown = await ipcRenderer.invoke(DESKTOP_IPC_CHANNELS.completeClose, validatedRequest);
    return shellCompleteCloseResponseSchema.parse(response);
  },
  createCase: async (request: CaseCreateRequest) => {
    const validatedRequest = caseCreateRequestSchema.parse(request);
    const response: unknown = await ipcRenderer.invoke(DESKTOP_IPC_CHANNELS.createCase, validatedRequest);
    return caseDialogResultSchema.parse(response);
  },
  openCase: async (request: CaseOpenRequest) => {
    const validatedRequest = caseOpenRequestSchema.parse(request);
    const response: unknown = await ipcRenderer.invoke(DESKTOP_IPC_CHANNELS.openCase, validatedRequest);
    return caseDialogResultSchema.parse(response);
  },
  listCaseSessions: async (request: CaseSessionListRequest) => {
    const validatedRequest = caseSessionListRequestSchema.parse(request);
    const response: unknown = await ipcRenderer.invoke(
      DESKTOP_IPC_CHANNELS.listCaseSessions,
      validatedRequest,
    );
    return caseSessionListResponseSchema.parse(response);
  },
  activateCaseSession: async (request: CaseSessionActivateRequest) => {
    const validatedRequest = caseSessionActivateRequestSchema.parse(request);
    const response: unknown = await ipcRenderer.invoke(
      DESKTOP_IPC_CHANNELS.activateCaseSession,
      validatedRequest,
    );
    return caseViewSchema.parse(response);
  },
  forgetCaseSession: async (request: CaseSessionForgetRequest) => {
    const validatedRequest = caseSessionForgetRequestSchema.parse(request);
    const response: unknown = await ipcRenderer.invoke(
      DESKTOP_IPC_CHANNELS.forgetCaseSession,
      validatedRequest,
    );
    return caseSessionForgetResponseSchema.parse(response);
  },
  relinkCaseSession: async (request: CaseSessionRelinkRequest) => {
    const validatedRequest = caseSessionRelinkRequestSchema.parse(request);
    const response: unknown = await ipcRenderer.invoke(
      DESKTOP_IPC_CHANNELS.relinkCaseSession,
      validatedRequest,
    );
    return caseDialogResultSchema.parse(response);
  },
  repairMissingCaseAsset: async (request: CaseSessionRepairAssetRequest) => {
    const validatedRequest = caseSessionRepairAssetRequestSchema.parse(request);
    const response: unknown = await ipcRenderer.invoke(
      DESKTOP_IPC_CHANNELS.repairMissingCaseAsset,
      validatedRequest,
    );
    return caseSessionRepairAssetResultSchema.parse(response);
  },
  saveCaseSessionUiState: async (request: CaseSessionUiStateSaveRequest) => {
    const validatedRequest = caseSessionUiStateSaveRequestSchema.parse(request);
    const response: unknown = await ipcRenderer.invoke(
      DESKTOP_IPC_CHANNELS.saveCaseSessionUiState,
      validatedRequest,
    );
    return caseSessionUiStateSaveResponseSchema.parse(response);
  },
  saveCase: async (request: CaseSaveRequest) => {
    const validatedRequest = caseSaveRequestSchema.parse(request);
    const response: unknown = await ipcRenderer.invoke(DESKTOP_IPC_CHANNELS.saveCase, validatedRequest);
    return caseViewSchema.parse(response);
  },
  closeCase: async (request: CaseCloseRequest) => {
    const validatedRequest = caseCloseRequestSchema.parse(request);
    const response: unknown = await ipcRenderer.invoke(DESKTOP_IPC_CHANNELS.closeCase, validatedRequest);
    return caseCloseResponseSchema.parse(response);
  },
  importCaseImage: async (request: CaseImportImageRequest) => {
    const validatedRequest = caseImportImageRequestSchema.parse(request);
    const response: unknown = await ipcRenderer.invoke(
      DESKTOP_IPC_CHANNELS.importCaseImage,
      validatedRequest,
    );
    return caseDialogResultSchema.parse(response);
  },
  saveClinicalCase: async (request: CaseClinicalSaveRequest) => {
    const validatedRequest = caseClinicalSaveRequestSchema.parse(request);
    const response: unknown = await ipcRenderer.invoke(
      DESKTOP_IPC_CHANNELS.saveClinicalCase,
      validatedRequest,
    );
    return caseViewSchema.parse(response);
  },
  saveCaseAlignment: async (request: CaseAlignmentSaveRequest) => {
    const validatedRequest = caseAlignmentSaveRequestSchema.parse(request);
    const response: unknown = await ipcRenderer.invoke(
      DESKTOP_IPC_CHANNELS.saveCaseAlignment,
      validatedRequest,
    );
    return caseViewSchema.parse(response);
  },
  acknowledgePresentationWarnings: async (request: PresentationAcknowledgeRequest) => {
    const validatedRequest = presentationAcknowledgeRequestSchema.parse(request);
    const response: unknown = await ipcRenderer.invoke(
      DESKTOP_IPC_CHANNELS.acknowledgePresentationWarnings,
      validatedRequest,
    );
    return caseViewSchema.parse(response);
  },
  getPresentation: async (request: PresentationRequest) => {
    const validatedRequest = presentationRequestSchema.parse(request);
    const response: unknown = await ipcRenderer.invoke(
      DESKTOP_IPC_CHANNELS.getPresentation,
      validatedRequest,
    );
    return presentationViewSchema.parse(response);
  },
  previewPresentationSlide: async (request: PresentationSlidePreviewRequest) => {
    const validatedRequest = presentationSlidePreviewRequestSchema.parse(request);
    const response: unknown = await ipcRenderer.invoke(
      DESKTOP_IPC_CHANNELS.previewPresentationSlide,
      validatedRequest,
    );
    return presentationSlideViewSchema.parse(response);
  },
  exportPresentation: async (request: PresentationRequest) => {
    const validatedRequest = presentationRequestSchema.parse(request);
    const response: unknown = await ipcRenderer.invoke(
      DESKTOP_IPC_CHANNELS.exportPresentation,
      validatedRequest,
    );
    return presentationExportResultSchema.parse(response);
  },
});

contextBridge.exposeInMainWorld(DESKTOP_GLOBAL_KEY, desktopApi);
