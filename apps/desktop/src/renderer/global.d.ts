import type { VakamatikDesktopApi } from "@vakamatik/desktop-contract";

declare global {
  interface Window {
    readonly vakamatik: VakamatikDesktopApi;
  }
}

export {};
