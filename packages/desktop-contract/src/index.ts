import { z } from "zod";

export const DESKTOP_GLOBAL_KEY = "vakamatik" as const;
export const DESKTOP_APP_SCHEME = "vakamatik" as const;
export const DESKTOP_APP_HOST = "app" as const;
export const DESKTOP_APP_ORIGIN = `${DESKTOP_APP_SCHEME}://${DESKTOP_APP_HOST}` as const;

export const shellGetAppInfoRequestSchema = z.object({}).strict();

export const shellAppInfoSchema = z
  .object({
    name: z.string().min(1).max(80),
    version: z.string().min(1).max(40),
    platform: z.enum(["win32", "darwin", "linux"]),
  })
  .strict();

export const shellPingRequestSchema = z
  .object({
    nonce: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/u),
  })
  .strict();

export const shellPingResponseSchema = z
  .object({
    nonce: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/u),
    status: z.literal("ok"),
  })
  .strict();

export type ShellGetAppInfoRequest = z.infer<typeof shellGetAppInfoRequestSchema>;
export type ShellAppInfo = z.infer<typeof shellAppInfoSchema>;
export type ShellPingRequest = z.infer<typeof shellPingRequestSchema>;
export type ShellPingResponse = z.infer<typeof shellPingResponseSchema>;

export interface VakamatikDesktopApi {
  readonly getAppInfo: () => Promise<ShellAppInfo>;
  readonly ping: (request: ShellPingRequest) => Promise<ShellPingResponse>;
}
