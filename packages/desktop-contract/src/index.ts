import { z } from "zod";
import {
  alignmentStateSchema,
  assetIdSchema,
  caseIdSchema,
  clinicalDataSchema,
  imageAdjustmentSchema,
  presentationSettingsSchema,
  recordSlotIdSchema,
} from "@vakamatik/domain";
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
export const shellCompleteCloseRequestSchema = z.object({}).strict();
export const shellCompleteCloseResponseSchema = z.object({ status: z.literal("closing") }).strict();

export type ShellGetAppInfoRequest = z.infer<typeof shellGetAppInfoRequestSchema>;
export type ShellAppInfo = z.infer<typeof shellAppInfoSchema>;
export type ShellPingRequest = z.infer<typeof shellPingRequestSchema>;
export type ShellPingResponse = z.infer<typeof shellPingResponseSchema>;
export type ShellCompleteCloseRequest = z.infer<typeof shellCompleteCloseRequestSchema>;
export type ShellCompleteCloseResponse = z.infer<typeof shellCompleteCloseResponseSchema>;

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
    clinical: clinicalDataSchema,
    presentation: presentationSettingsSchema,
    alignment: alignmentStateSchema,
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
export const caseClinicalSaveRequestSchema = z
  .object({
    caseId: caseIdSchema,
    revision: z.number().int().nonnegative(),
    clinical: clinicalDataSchema,
    presentation: presentationSettingsSchema,
  })
  .strict();
export const caseAlignmentSaveRequestSchema = z
  .object({ caseId: caseIdSchema, revision: z.number().int().nonnegative(), alignment: alignmentStateSchema })
  .strict();
export const presentationAcknowledgeRequestSchema = z
  .object({
    caseId: caseIdSchema,
    revision: z.number().int().nonnegative(),
    warningKeys: z.array(z.string().min(1).max(280)).max(500),
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
export type CaseClinicalSaveRequest = z.infer<typeof caseClinicalSaveRequestSchema>;
export type CaseAlignmentSaveRequest = z.infer<typeof caseAlignmentSaveRequestSchema>;
export type PresentationAcknowledgeRequest = z.infer<typeof presentationAcknowledgeRequestSchema>;
export type CaseDialogResult = z.infer<typeof caseDialogResultSchema>;
export type CaseCloseResponse = z.infer<typeof caseCloseResponseSchema>;

export const workspaceTabSchema = z.enum(["records", "clinical", "presentation"]);
export const workspaceUiStateSchema = z
  .object({
    tab: workspaceTabSchema,
    recordFilter: z.enum(["all", "extraoral", "intraoral", "models", "inferior", "imaging", "optional"]),
    selectedRecordSlotId: recordSlotIdSchema,
    clinicalSection: z.enum(["patient", "findings", "analyses", "ceph", "planning", "notes"]),
    selectedSlideId: z.string().min(1).max(120).nullable(),
    selectedLayerId: z.string().min(1).max(180).nullable(),
  })
  .strict();
export const defaultWorkspaceUiState = {
  tab: "records",
  recordFilter: "all",
  selectedRecordSlotId: "face_front_rest",
  clinicalSection: "patient",
  selectedSlideId: null,
  selectedLayerId: null,
} as const satisfies z.infer<typeof workspaceUiStateSchema>;

export const caseSessionSummarySchema = z
  .object({
    caseId: caseIdSchema,
    title: z.string().min(1).max(120),
    folderName: z
      .string()
      .min(1)
      .max(180)
      .refine((value) => !/[\\/]/u.test(value)),
    lastOpenedAt: z.string().datetime({ offset: true }),
    available: z.boolean(),
    uiState: workspaceUiStateSchema,
  })
  .strict();
export const caseSessionListRequestSchema = z.object({}).strict();
export const caseSessionListResponseSchema = z
  .object({ sessions: z.array(caseSessionSummarySchema).max(200) })
  .strict();
export const caseSessionActivateRequestSchema = z.object({ caseId: caseIdSchema }).strict();
export const caseSessionForgetRequestSchema = z.object({ caseId: caseIdSchema }).strict();
export const caseSessionForgetResponseSchema = z.object({ status: z.literal("forgotten") }).strict();
export const caseSessionRelinkRequestSchema = z.object({ caseId: caseIdSchema }).strict();
export const caseSessionUiStateSaveRequestSchema = z
  .object({ caseId: caseIdSchema, uiState: workspaceUiStateSchema })
  .strict();
export const caseSessionUiStateSaveResponseSchema = z.object({ status: z.literal("saved") }).strict();

export type WorkspaceTab = z.infer<typeof workspaceTabSchema>;
export type WorkspaceUiState = z.infer<typeof workspaceUiStateSchema>;
export type CaseSessionSummary = z.infer<typeof caseSessionSummarySchema>;
export type CaseSessionListRequest = z.infer<typeof caseSessionListRequestSchema>;
export type CaseSessionListResponse = z.infer<typeof caseSessionListResponseSchema>;
export type CaseSessionActivateRequest = z.infer<typeof caseSessionActivateRequestSchema>;
export type CaseSessionForgetRequest = z.infer<typeof caseSessionForgetRequestSchema>;
export type CaseSessionForgetResponse = z.infer<typeof caseSessionForgetResponseSchema>;
export type CaseSessionRelinkRequest = z.infer<typeof caseSessionRelinkRequestSchema>;
export type CaseSessionUiStateSaveRequest = z.infer<typeof caseSessionUiStateSaveRequestSchema>;
export type CaseSessionUiStateSaveResponse = z.infer<typeof caseSessionUiStateSaveResponseSchema>;

export const semanticSlideIdSchema = z.enum(CANONICAL_SLIDE_ORDER);
export const presentationRequestSchema = z
  .object({
    caseId: caseIdSchema,
    revision: z.number().int().nonnegative(),
  })
  .strict();
export const presentationWarningSchema = z
  .object({
    key: z.string().min(1).max(280),
    semanticSlideId: semanticSlideIdSchema,
    targetKey: z.string().min(1).max(160),
    message: z.string().min(1).max(240),
    acknowledged: z.boolean(),
  })
  .strict();
export const presentationImageLayerSchema = z
  .object({
    instanceId: z.string().min(1).max(180),
    assetKey: z.string().min(1).max(100),
    linkGroup: z.string().min(1).max(80).nullable(),
    availableLinkGroup: z.string().min(1).max(80).nullable(),
    transform: imageAdjustmentSchema,
    defaultTransform: imageAdjustmentSchema,
    label: z.string().min(1).max(120),
    bounds: z
      .object({
        xPt: z.number().finite(),
        yPt: z.number().finite(),
        widthPt: z.number().positive(),
        heightPt: z.number().positive(),
      })
      .strict(),
    zIndex: z.number().int(),
  })
  .strict();
export const presentationSlideViewSchema = z
  .object({
    semanticSlideId: semanticSlideIdSchema,
    displayNumber: z.number().int().positive(),
    title: z.string().min(1).max(120),
    previewDataUrl: z.string().startsWith("data:image/svg+xml;base64,"),
    imageLayers: z.array(presentationImageLayerSchema),
  })
  .strict();
export const presentationViewSchema = z
  .object({
    caseId: caseIdSchema,
    revision: z.number().int().nonnegative(),
    slides: z.array(presentationSlideViewSchema).min(1).max(35),
    warnings: z.array(presentationWarningSchema),
    hasUnacknowledgedWarnings: z.boolean(),
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
export const presentationSlidePreviewRequestSchema = z
  .object({
    caseId: caseIdSchema,
    revision: z.number().int().nonnegative(),
    semanticSlideId: semanticSlideIdSchema,
    alignment: alignmentStateSchema,
  })
  .strict();

export type PresentationRequest = z.infer<typeof presentationRequestSchema>;
export type PresentationView = z.infer<typeof presentationViewSchema>;
export type PresentationExportResult = z.infer<typeof presentationExportResultSchema>;
export type PresentationSlidePreviewRequest = z.infer<typeof presentationSlidePreviewRequestSchema>;
export type PresentationSlideView = z.infer<typeof presentationSlideViewSchema>;

export interface VakamatikDesktopApi {
  readonly getAppInfo: () => Promise<ShellAppInfo>;
  readonly ping: (request: ShellPingRequest) => Promise<ShellPingResponse>;
  readonly onCloseRequested: (listener: () => void) => () => void;
  readonly completeClose: (request: ShellCompleteCloseRequest) => Promise<ShellCompleteCloseResponse>;
  readonly createCase: (request: CaseCreateRequest) => Promise<CaseDialogResult>;
  readonly openCase: (request: CaseOpenRequest) => Promise<CaseDialogResult>;
  readonly listCaseSessions: (request: CaseSessionListRequest) => Promise<CaseSessionListResponse>;
  readonly activateCaseSession: (request: CaseSessionActivateRequest) => Promise<CaseView>;
  readonly forgetCaseSession: (request: CaseSessionForgetRequest) => Promise<CaseSessionForgetResponse>;
  readonly relinkCaseSession: (request: CaseSessionRelinkRequest) => Promise<CaseDialogResult>;
  readonly saveCaseSessionUiState: (
    request: CaseSessionUiStateSaveRequest,
  ) => Promise<CaseSessionUiStateSaveResponse>;
  readonly saveCase: (request: CaseSaveRequest) => Promise<CaseView>;
  readonly closeCase: (request: CaseCloseRequest) => Promise<CaseCloseResponse>;
  readonly importCaseImage: (request: CaseImportImageRequest) => Promise<CaseDialogResult>;
  readonly saveClinicalCase: (request: CaseClinicalSaveRequest) => Promise<CaseView>;
  readonly saveCaseAlignment: (request: CaseAlignmentSaveRequest) => Promise<CaseView>;
  readonly acknowledgePresentationWarnings: (request: PresentationAcknowledgeRequest) => Promise<CaseView>;
  readonly getPresentation: (request: PresentationRequest) => Promise<PresentationView>;
  readonly previewPresentationSlide: (
    request: PresentationSlidePreviewRequest,
  ) => Promise<PresentationSlideView>;
  readonly exportPresentation: (request: PresentationRequest) => Promise<PresentationExportResult>;
}
