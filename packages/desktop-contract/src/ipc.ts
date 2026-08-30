import type {
  CaseCloseRequest,
  CaseCloseResponse,
  CaseCreateRequest,
  CaseDialogResult,
  CaseImportImageRequest,
  CaseOpenRequest,
  CaseSaveRequest,
  CaseView,
  CaseClinicalSaveRequest,
  CaseAlignmentSaveRequest,
  PresentationAcknowledgeRequest,
  PresentationExportResult,
  PresentationRequest,
  PresentationView,
  ShellAppInfo,
  ShellGetAppInfoRequest,
  ShellPingRequest,
  ShellPingResponse,
} from "./index.js";

export const DESKTOP_IPC_CHANNELS = {
  getAppInfo: "vakamatik:shell:get-app-info",
  ping: "vakamatik:shell:ping",
  createCase: "vakamatik:case:create",
  openCase: "vakamatik:case:open",
  saveCase: "vakamatik:case:save",
  closeCase: "vakamatik:case:close",
  importCaseImage: "vakamatik:case:import-image",
  saveClinicalCase: "vakamatik:case:save-clinical",
  saveCaseAlignment: "vakamatik:case:save-alignment",
  acknowledgePresentationWarnings: "vakamatik:presentation:acknowledge-warnings",
  getPresentation: "vakamatik:presentation:get",
  exportPresentation: "vakamatik:presentation:export",
} as const;

export interface DesktopIpcOperationMap {
  readonly [DESKTOP_IPC_CHANNELS.getAppInfo]: {
    readonly request: ShellGetAppInfoRequest;
    readonly response: ShellAppInfo;
  };
  readonly [DESKTOP_IPC_CHANNELS.ping]: {
    readonly request: ShellPingRequest;
    readonly response: ShellPingResponse;
  };
  readonly [DESKTOP_IPC_CHANNELS.createCase]: {
    readonly request: CaseCreateRequest;
    readonly response: CaseDialogResult;
  };
  readonly [DESKTOP_IPC_CHANNELS.openCase]: {
    readonly request: CaseOpenRequest;
    readonly response: CaseDialogResult;
  };
  readonly [DESKTOP_IPC_CHANNELS.saveCase]: {
    readonly request: CaseSaveRequest;
    readonly response: CaseView;
  };
  readonly [DESKTOP_IPC_CHANNELS.closeCase]: {
    readonly request: CaseCloseRequest;
    readonly response: CaseCloseResponse;
  };
  readonly [DESKTOP_IPC_CHANNELS.importCaseImage]: {
    readonly request: CaseImportImageRequest;
    readonly response: CaseDialogResult;
  };
  readonly [DESKTOP_IPC_CHANNELS.saveClinicalCase]: {
    readonly request: CaseClinicalSaveRequest;
    readonly response: CaseView;
  };
  readonly [DESKTOP_IPC_CHANNELS.saveCaseAlignment]: {
    readonly request: CaseAlignmentSaveRequest;
    readonly response: CaseView;
  };
  readonly [DESKTOP_IPC_CHANNELS.acknowledgePresentationWarnings]: {
    readonly request: PresentationAcknowledgeRequest;
    readonly response: CaseView;
  };
  readonly [DESKTOP_IPC_CHANNELS.getPresentation]: {
    readonly request: PresentationRequest;
    readonly response: PresentationView;
  };
  readonly [DESKTOP_IPC_CHANNELS.exportPresentation]: {
    readonly request: PresentationRequest;
    readonly response: PresentationExportResult;
  };
}
