import type { ShellAppInfo, ShellGetAppInfoRequest, ShellPingRequest, ShellPingResponse } from "./index.js";

export const DESKTOP_IPC_CHANNELS = {
  getAppInfo: "vakamatik:shell:get-app-info",
  ping: "vakamatik:shell:ping",
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
}
