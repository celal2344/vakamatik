import { describe, expect, test } from "vitest";
import {
  DESKTOP_APP_ORIGIN,
  DESKTOP_GLOBAL_KEY,
  shellAppInfoSchema,
  shellGetAppInfoRequestSchema,
  shellPingRequestSchema,
  shellPingResponseSchema,
} from "../../packages/desktop-contract/src/index.js";
import { DESKTOP_IPC_CHANNELS } from "../../packages/desktop-contract/src/ipc.js";

describe("frozen desktop bridge contract", () => {
  test("contains only the two named shell operations", () => {
    expect(DESKTOP_GLOBAL_KEY).toBe("vakamatik");
    expect(DESKTOP_APP_ORIGIN).toBe("vakamatik://app");
    expect(Object.keys(DESKTOP_IPC_CHANNELS)).toEqual(["getAppInfo", "ping"]);
  });

  test("rejects malformed and unknown requests", () => {
    expect(() => shellGetAppInfoRequestSchema.parse({ unexpected: true })).toThrow();
    expect(() => shellPingRequestSchema.parse({ nonce: "valid", unexpected: true })).toThrow();
    expect(() => shellPingRequestSchema.parse({ nonce: "not valid with spaces" })).toThrow();
    expect(() => shellPingRequestSchema.parse({ nonce: "x".repeat(65) })).toThrow();
  });

  test("validates responses strictly", () => {
    expect(shellPingResponseSchema.parse({ nonce: "abc_123", status: "ok" })).toEqual({
      nonce: "abc_123",
      status: "ok",
    });
    expect(() => shellPingResponseSchema.parse({ nonce: "abc", status: "ok", path: "C:/secret" })).toThrow();
    expect(() =>
      shellAppInfoSchema.parse({ name: "Vakamatik", version: "1", platform: "browser" }),
    ).toThrow();
  });
});
