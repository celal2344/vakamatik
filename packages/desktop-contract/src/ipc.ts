import type {
  CaseCloseRequest,
  CaseCloseResponse,
  CaseCreateRequest,
  CaseDialogResult,
  CaseImportImageRequest,
  CaseOpenRequest,
  CaseSaveRequest,
  CaseView,
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
}
