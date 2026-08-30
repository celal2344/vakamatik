import { z } from "zod";
import { assetIdSchema, caseIdSchema, recordSlotIdSchema } from "@vakamatik/domain";
import { CANONICAL_SLIDE_ORDER } from "@vakamatik/export-contract";

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

export const caseAssetViewSchema = z
  .object({
    assetId: assetIdSchema,
    displayName: z.string().min(1).max(180),
    mimeType: z.enum(["image/jpeg", "image/png"]),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    thumbnailDataUrl: z.string().startsWith("data:image/webp;base64,"),
  })
  .strict();

export const caseViewSchema = z
  .object({
    caseId: caseIdSchema,
    revision: z.number().int().nonnegative(),
    title: z.string().min(1).max(120),
    folderName: z
      .string()
      .min(1)
      .max(180)
      .refine((value) => !/[\\/]/u.test(value)),
    createdAt: z.string().datetime({ offset: true }),
    updatedAt: z.string().datetime({ offset: true }),
    assets: z.record(assetIdSchema, caseAssetViewSchema),
    assignments: z.partialRecord(recordSlotIdSchema, assetIdSchema),
  })
  .strict();

export const caseCreateRequestSchema = z.object({ title: z.string().trim().min(1).max(120) }).strict();
export const caseOpenRequestSchema = z.object({}).strict();
export const caseSaveRequestSchema = z
  .object({
    caseId: caseIdSchema,
    revision: z.number().int().nonnegative(),
    title: z.string().trim().min(1).max(120),
  })
  .strict();
export const caseCloseRequestSchema = z.object({ caseId: caseIdSchema }).strict();
export const caseImportImageRequestSchema = z
  .object({
    caseId: caseIdSchema,
    revision: z.number().int().nonnegative(),
    slotId: recordSlotIdSchema,
  })
  .strict();

export const caseDialogResultSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("cancelled") }).strict(),
  z.object({ status: z.literal("ok"), case: caseViewSchema }).strict(),
]);
export const caseCloseResponseSchema = z.object({ status: z.literal("closed") }).strict();

export type CaseView = z.infer<typeof caseViewSchema>;
export type CaseCreateRequest = z.infer<typeof caseCreateRequestSchema>;
export type CaseOpenRequest = z.infer<typeof caseOpenRequestSchema>;
export type CaseSaveRequest = z.infer<typeof caseSaveRequestSchema>;
export type CaseCloseRequest = z.infer<typeof caseCloseRequestSchema>;
export type CaseImportImageRequest = z.infer<typeof caseImportImageRequestSchema>;
export type CaseDialogResult = z.infer<typeof caseDialogResultSchema>;
export type CaseCloseResponse = z.infer<typeof caseCloseResponseSchema>;

export const semanticSlideIdSchema = z.enum(CANONICAL_SLIDE_ORDER);
export const presentationRequestSchema = z
  .object({
    caseId: caseIdSchema,
    revision: z.number().int().nonnegative(),
  })
  .strict();
export const presentationWarningSchema = z
  .object({
    semanticSlideId: semanticSlideIdSchema,
    targetKey: z.string().min(1).max(160),
    message: z.string().min(1).max(240),
  })
  .strict();
export const presentationSlideViewSchema = z
  .object({
    semanticSlideId: semanticSlideIdSchema,
    displayNumber: z.number().int().positive(),
    title: z.string().min(1).max(120),
    previewDataUrl: z.string().startsWith("data:image/svg+xml;base64,"),
  })
  .strict();
export const presentationViewSchema = z
  .object({
    caseId: caseIdSchema,
    revision: z.number().int().nonnegative(),
    slides: z.array(presentationSlideViewSchema).min(1).max(35),
    warnings: z.array(presentationWarningSchema),
  })
  .strict();
export const presentationExportResultSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("cancelled") }).strict(),
  z
    .object({
      status: z.literal("ok"),
      fileName: z
        .string()
        .min(1)
        .max(180)
        .refine((value) => !/[\\/]/u.test(value)),
      slideCount: z.number().int().positive().max(35),
    })
    .strict(),
]);

export type PresentationRequest = z.infer<typeof presentationRequestSchema>;
export type PresentationView = z.infer<typeof presentationViewSchema>;
export type PresentationExportResult = z.infer<typeof presentationExportResultSchema>;

export interface VakamatikDesktopApi {
  readonly getAppInfo: () => Promise<ShellAppInfo>;
  readonly ping: (request: ShellPingRequest) => Promise<ShellPingResponse>;
  readonly createCase: (request: CaseCreateRequest) => Promise<CaseDialogResult>;
  readonly openCase: (request: CaseOpenRequest) => Promise<CaseDialogResult>;
  readonly saveCase: (request: CaseSaveRequest) => Promise<CaseView>;
  readonly closeCase: (request: CaseCloseRequest) => Promise<CaseCloseResponse>;
  readonly importCaseImage: (request: CaseImportImageRequest) => Promise<CaseDialogResult>;
  readonly getPresentation: (request: PresentationRequest) => Promise<PresentationView>;
  readonly exportPresentation: (request: PresentationRequest) => Promise<PresentationExportResult>;
}
