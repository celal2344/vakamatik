import path from "node:path";
import { _electron as electron, expect, test } from "@playwright/test";

test("hardened shell launches with only its documented bridge", async () => {
  const application = await electron.launch({
    args: [path.resolve("apps/desktop")],
    env: Object.fromEntries(
      Object.entries({ ...process.env, ELECTRON_DISABLE_SECURITY_WARNINGS: "false" }).filter(
        (entry): entry is [string, string] => entry[1] !== undefined,
      ),
    ),
  });

  try {
    const page = await application.firstWindow();
    await expect(page).toHaveTitle("Vakamatik");
    await page.screenshot({ path: "test-results/electron-shell.png", fullPage: true });

    const boundary = await page.evaluate(async () => {
      const globalRecord = globalThis as Record<string, unknown>;
      const apiRecord = window.vakamatik as unknown as Record<string, unknown>;
      const ping = await window.vakamatik.ping({ nonce: "e2e_nonce" });
      let malformedRejected = false;
      let malformedCaseRejected = false;
      try {
        await window.vakamatik.ping({ nonce: "bad nonce", extra: true } as never);
      } catch {
        malformedRejected = true;
      }
      try {
        await window.vakamatik.createCase({ title: "Synthetic", path: "C:/secret" } as never);
      } catch {
        malformedCaseRejected = true;
      }
      return {
        apiKeys: Object.keys(apiRecord).sort(),
        hasBuffer: "Buffer" in globalRecord,
        hasGenericInvoke: "invoke" in apiRecord,
        hasProcess: "process" in globalRecord,
        hasRequire: "require" in globalRecord,
        malformedCaseRejected,
        malformedRejected,
        ping,
      };
    });

    expect(boundary).toEqual({
      apiKeys: [
        "acknowledgePresentationWarnings",
        "activateCaseSession",
        "closeCase",
        "completeClose",
        "createCase",
        "exportPresentation",
        "forgetCaseSession",
        "getAppInfo",
        "getPresentation",
        "importCaseImage",
        "listCaseSessions",
        "onCloseRequested",
        "openCase",
        "ping",
        "previewPresentationSlide",
        "relinkCaseSession",
        "repairMissingCaseAsset",
        "saveCase",
        "saveCaseAlignment",
        "saveCaseSessionUiState",
        "saveClinicalCase",
      ],
      hasBuffer: false,
      hasGenericInvoke: false,
      hasProcess: false,
      hasRequire: false,
      malformedCaseRejected: true,
      malformedRejected: true,
      ping: { nonce: "e2e_nonce", status: "ok" },
    });

    const originalUrl = page.url();
    await page.evaluate(() => window.location.assign("https://example.com/"));
    await page.waitForTimeout(250);
    expect(page.url()).toBe(originalUrl);

    const popup = await page.evaluate(() => window.open("https://example.com/"));
    expect(popup).toBeNull();
    expect(application.windows()).toHaveLength(1);

    const permissionState = await page.evaluate(
      async () => (await navigator.permissions.query({ name: "geolocation" })).state,
    );
    expect(permissionState).toBe("denied");

    const remoteFetchBlocked = await page.evaluate(async () => {
      try {
        await fetch("https://example.com/");
        return false;
      } catch {
        return true;
      }
    });
    expect(remoteFetchBlocked).toBe(true);

    const inlineScriptBlocked = await page.evaluate(async () => {
      const probe = document.createElement("script");
      probe.textContent = "globalThis.__vakamatikInlineProbe = true";
      document.head.append(probe);
      await new Promise((resolve) => setTimeout(resolve, 50));
      return !("__vakamatikInlineProbe" in globalThis);
    });
    expect(inlineScriptBlocked).toBe(true);
  } finally {
    await application.close();
  }
});
