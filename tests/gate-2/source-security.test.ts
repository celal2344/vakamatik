import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

const read = (file: string): string => readFileSync(file, "utf8");

describe("Electron security configuration", () => {
  const main = read("apps/desktop/src/main/index.ts");
  const preload = read("apps/desktop/src/preload/index.ts");
  const html = read("apps/desktop/src/renderer/index.html");
  const forge = read("apps/desktop/forge.config.cjs");

  test("uses isolation, sandbox, web security, and deny-by-default handlers", () => {
    expect(main).toContain("contextIsolation: true");
    expect(main).toContain("nodeIntegration: false");
    expect(main).toContain("sandbox: true");
    expect(main).toContain("webSecurity: true");
    expect(main).toContain("setWindowOpenHandler");
    expect(main).toContain('action: "deny"');
    expect(main).toContain("setPermissionCheckHandler(() => false)");
    expect(main).toContain("callback(false)");
    expect(main).not.toMatch(/\bshell\.(?:openExternal|openPath)\b/u);
  });

  test("preload exposes one named API and no generic IPC operation", () => {
    expect(preload).toContain("contextBridge.exposeInMainWorld(DESKTOP_GLOBAL_KEY, desktopApi)");
    expect(preload).not.toMatch(/exposeInMainWorld\([^,]+,\s*ipcRenderer/u);
    expect(preload).not.toMatch(/\b(?:send|sendSync|on|once|postMessage)\s*:/u);
    expect(preload).not.toContain("node:fs");
    expect(preload).not.toContain("node:path");
  });

  test("production CSP excludes unsafe script execution and remote network origins", () => {
    expect(html).toContain("default-src 'none'");
    expect(html).toContain("script-src 'self'");
    expect(html).not.toContain("unsafe-eval");
    expect(html).not.toContain("script-src 'self' 'unsafe-inline'");
    expect(html).not.toMatch(/https?:\/\//u);
  });

  test("Forge hardens the packaged runtime and contains no update or telemetry integration", () => {
    expect(forge).toContain("RunAsNode]: false");
    expect(forge).toContain("EnableNodeOptionsEnvironmentVariable]: false");
    expect(forge).toContain("EnableNodeCliInspectArguments]: false");
    expect(forge).toContain("EnableEmbeddedAsarIntegrityValidation]: true");
    expect(forge).toContain("OnlyLoadAppFromAsar]: true");
    expect(forge).toContain("LoadBrowserProcessSpecificV8Snapshot]: false");
    expect(forge).toContain("GrantFileProtocolExtraPrivileges]: false");
    expect(`${main}\n${preload}\n${forge}`).not.toMatch(/analytics|telemetry|crashReporter|autoUpdater/iu);
  });
});
