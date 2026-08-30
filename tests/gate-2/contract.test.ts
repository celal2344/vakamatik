import { describe, expect, test } from "vitest";
import {
  DESKTOP_APP_ORIGIN,
  DESKTOP_GLOBAL_KEY,
  caseCreateRequestSchema,
  caseImportImageRequestSchema,
  presentationRequestSchema,
  shellAppInfoSchema,
  shellGetAppInfoRequestSchema,
  shellPingRequestSchema,
  shellPingResponseSchema,
} from "../../packages/desktop-contract/src/index.js";
import { DESKTOP_IPC_CHANNELS } from "../../packages/desktop-contract/src/ipc.js";

describe("documented desktop bridge contract", () => {
  test("contains only named shell and case operations", () => {
    expect(DESKTOP_GLOBAL_KEY).toBe("vakamatik");
    expect(DESKTOP_APP_ORIGIN).toBe("vakamatik://app");
    expect(Object.keys(DESKTOP_IPC_CHANNELS)).toEqual([
      "getAppInfo",
      "ping",
      "createCase",
      "openCase",
      "saveCase",
      "closeCase",
      "importCaseImage",
      "getPresentation",
      "exportPresentation",
    ]);
  });

  test("rejects malformed and unknown requests", () => {
    expect(() => shellGetAppInfoRequestSchema.parse({ unexpected: true })).toThrow();
    expect(() => shellPingRequestSchema.parse({ nonce: "valid", unexpected: true })).toThrow();
    expect(() => shellPingRequestSchema.parse({ nonce: "not valid with spaces" })).toThrow();
    expect(() => shellPingRequestSchema.parse({ nonce: "x".repeat(65) })).toThrow();
    expect(() => caseCreateRequestSchema.parse({ title: "Synthetic", path: "C:/secret" })).toThrow();
    expect(() =>
      caseImportImageRequestSchema.parse({
        caseId: "not-a-uuid",
        revision: 0,
        slotId: "../../outside",
      }),
    ).toThrow();
    expect(() =>
      presentationRequestSchema.parse({
        caseId: "not-a-uuid",
        revision: 0,
        path: "C:/secret",
      }),
    ).toThrow();
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
