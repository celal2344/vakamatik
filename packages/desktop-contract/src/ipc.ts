import type {
  CaseCloseRequest,
  CaseCloseResponse,
  CaseCreateRequest,
  CaseDialogResult,
  CaseImportImageRequest,
  CaseOpenRequest,
  CaseSessionActivateRequest,
  CaseSessionForgetRequest,
  CaseSessionForgetResponse,
  CaseSessionListRequest,
  CaseSessionListResponse,
  CaseSessionRelinkRequest,
  CaseSessionRepairAssetRequest,
  CaseSessionRepairAssetResult,
  CaseSessionUiStateSaveRequest,
  CaseSessionUiStateSaveResponse,
  CaseSaveRequest,
  CaseView,
  CaseClinicalSaveRequest,
  CaseAlignmentSaveRequest,
  PresentationAcknowledgeRequest,
  PresentationExportResult,
  PresentationRequest,
  PresentationView,
  PresentationSlidePreviewRequest,
  PresentationSlideView,
  ShellAppInfo,
  ShellCompleteCloseRequest,
  ShellCompleteCloseResponse,
  ShellGetAppInfoRequest,
  ShellPingRequest,
  ShellPingResponse,
} from "./index.js";

export const DESKTOP_IPC_CHANNELS = {
  getAppInfo: "vakamatik:shell:get-app-info",
  ping: "vakamatik:shell:ping",
  closeRequested: "vakamatik:shell:close-requested",
  completeClose: "vakamatik:shell:complete-close",
  createCase: "vakamatik:case:create",
  openCase: "vakamatik:case:open",
  listCaseSessions: "vakamatik:session:list",
  activateCaseSession: "vakamatik:session:activate",
  forgetCaseSession: "vakamatik:session:forget",
  relinkCaseSession: "vakamatik:session:relink",
  repairMissingCaseAsset: "vakamatik:session:repair-missing-asset",
  saveCaseSessionUiState: "vakamatik:session:save-ui-state",
  saveCase: "vakamatik:case:save",
  closeCase: "vakamatik:case:close",
  importCaseImage: "vakamatik:case:import-image",
  saveClinicalCase: "vakamatik:case:save-clinical",
  saveCaseAlignment: "vakamatik:case:save-alignment",
  acknowledgePresentationWarnings: "vakamatik:presentation:acknowledge-warnings",
  getPresentation: "vakamatik:presentation:get",
  previewPresentationSlide: "vakamatik:presentation:preview-slide",
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
  readonly [DESKTOP_IPC_CHANNELS.completeClose]: {
    readonly request: ShellCompleteCloseRequest;
    readonly response: ShellCompleteCloseResponse;
  };
  readonly [DESKTOP_IPC_CHANNELS.createCase]: {
    readonly request: CaseCreateRequest;
    readonly response: CaseDialogResult;
  };
  readonly [DESKTOP_IPC_CHANNELS.openCase]: {
    readonly request: CaseOpenRequest;
    readonly response: CaseDialogResult;
  };
  readonly [DESKTOP_IPC_CHANNELS.listCaseSessions]: {
    readonly request: CaseSessionListRequest;
    readonly response: CaseSessionListResponse;
  };
  readonly [DESKTOP_IPC_CHANNELS.activateCaseSession]: {
    readonly request: CaseSessionActivateRequest;
    readonly response: CaseView;
  };
  readonly [DESKTOP_IPC_CHANNELS.forgetCaseSession]: {
    readonly request: CaseSessionForgetRequest;
    readonly response: CaseSessionForgetResponse;
  };
  readonly [DESKTOP_IPC_CHANNELS.relinkCaseSession]: {
    readonly request: CaseSessionRelinkRequest;
    readonly response: CaseDialogResult;
  };
  readonly [DESKTOP_IPC_CHANNELS.repairMissingCaseAsset]: {
    readonly request: CaseSessionRepairAssetRequest;
    readonly response: CaseSessionRepairAssetResult;
  };
  readonly [DESKTOP_IPC_CHANNELS.saveCaseSessionUiState]: {
    readonly request: CaseSessionUiStateSaveRequest;
    readonly response: CaseSessionUiStateSaveResponse;
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
  readonly [DESKTOP_IPC_CHANNELS.previewPresentationSlide]: {
    readonly request: PresentationSlidePreviewRequest;
    readonly response: PresentationSlideView;
  };
  readonly [DESKTOP_IPC_CHANNELS.exportPresentation]: {
    readonly request: PresentationRequest;
    readonly response: PresentationExportResult;
  };
}
