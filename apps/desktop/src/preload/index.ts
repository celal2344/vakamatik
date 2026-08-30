import { contextBridge, ipcRenderer } from "electron";
import {
  DESKTOP_GLOBAL_KEY,
  caseCloseRequestSchema,
  caseCloseResponseSchema,
  caseCreateRequestSchema,
  caseDialogResultSchema,
  caseImportImageRequestSchema,
  caseOpenRequestSchema,
  caseSaveRequestSchema,
  caseViewSchema,
  presentationExportResultSchema,
  presentationRequestSchema,
  presentationViewSchema,
  shellAppInfoSchema,
  shellGetAppInfoRequestSchema,
  shellPingRequestSchema,
  shellPingResponseSchema,
  type ShellPingRequest,
  type CaseCloseRequest,
  type CaseCreateRequest,
  type CaseImportImageRequest,
  type CaseOpenRequest,
  type CaseSaveRequest,
  type PresentationRequest,
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
  getPresentation: async (request: PresentationRequest) => {
    const validatedRequest = presentationRequestSchema.parse(request);
    const response: unknown = await ipcRenderer.invoke(
      DESKTOP_IPC_CHANNELS.getPresentation,
      validatedRequest,
    );
    return presentationViewSchema.parse(response);
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
