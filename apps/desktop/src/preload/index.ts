import { contextBridge, ipcRenderer } from "electron";
import {
  DESKTOP_GLOBAL_KEY,
  shellAppInfoSchema,
  shellGetAppInfoRequestSchema,
  shellPingRequestSchema,
  shellPingResponseSchema,
  type ShellPingRequest,
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
});

contextBridge.exposeInMainWorld(DESKTOP_GLOBAL_KEY, desktopApi);
