import path from "node:path";
import { describe, expect, test } from "vitest";
import {
  assertTrustedIpcSender,
  isTrustedRendererUrl,
  resolveApplicationAsset,
} from "../../apps/desktop/src/main/security.js";

const rendererRoot = path.resolve("apps/desktop/.vite/renderer");

describe("renderer trust boundary", () => {
  test("accepts the packaged origin and an explicitly configured loopback dev origin", () => {
    expect(isTrustedRendererUrl("vakamatik://app/index.html")).toBe(true);
    expect(isTrustedRendererUrl("http://127.0.0.1:5173/", "http://127.0.0.1:5173")).toBe(true);
    expect(isTrustedRendererUrl("http://localhost:5173/", "http://localhost:5173")).toBe(true);
  });

  test("rejects remote, lookalike, and mismatched origins", () => {
    expect(isTrustedRendererUrl("https://example.com")).toBe(false);
    expect(isTrustedRendererUrl("https://127.0.0.1:5173/", "http://127.0.0.1:5173")).toBe(false);
    expect(isTrustedRendererUrl("http://127.0.0.1:9999/", "http://127.0.0.1:5173")).toBe(false);
    expect(isTrustedRendererUrl("vakamatik://evil/index.html")).toBe(false);
    expect(isTrustedRendererUrl("vakamatik://app/assets/index.js")).toBe(false);
    expect(isTrustedRendererUrl("http://127.0.0.1:5173/other", "http://127.0.0.1:5173")).toBe(false);
  });
});

describe("IPC sender validation", () => {
  test("accepts only the expected web contents and its trusted main frame", () => {
    const mainFrame = { url: "vakamatik://app/index.html" };
    const expectedWebContents = { mainFrame };
    expect(() =>
      assertTrustedIpcSender(
        { sender: expectedWebContents, senderFrame: mainFrame } as never,
        expectedWebContents as never,
      ),
    ).not.toThrow();

    expect(() =>
      assertTrustedIpcSender({ sender: {}, senderFrame: mainFrame } as never, expectedWebContents as never),
    ).toThrow(/untrusted sender/u);
    expect(() =>
      assertTrustedIpcSender(
        { sender: expectedWebContents, senderFrame: { url: "https://example.com" } } as never,
        expectedWebContents as never,
      ),
    ).toThrow(/untrusted sender/u);
  });
});

describe("restricted application protocol", () => {
  test("resolves only approved renderer assets inside the renderer root", () => {
    expect(resolveApplicationAsset(rendererRoot, "vakamatik://app/")).toBe(
      path.join(rendererRoot, "index.html"),
    );
    expect(resolveApplicationAsset(rendererRoot, "vakamatik://app/assets/index-abc.js")).toBe(
      path.join(rendererRoot, "assets", "index-abc.js"),
    );
  });

  test.each([
    "vakamatik://app/%2e%2e/secret.js",
    "vakamatik://app/%252e%252e/secret.js",
    "vakamatik://app/assets%2f..%2fsecret.js",
    "vakamatik://app/readme.txt",
    "vakamatik://evil/index.html",
    "https://app/index.html",
    "vakamatik://app/index.html?file=secret",
  ])("rejects traversal or unauthorized URL %s", (url) => {
    expect(() => resolveApplicationAsset(rendererRoot, url)).toThrow();
  });
});
