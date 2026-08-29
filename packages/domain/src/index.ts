import { z } from "zod";

export const CASE_SCHEMA_VERSION = 1 as const;

export const RECORD_SLOTS = [
  { id: "face_front_rest", group: "extraoral", label: "Önden yüz — dinlenme", requirement: "required" },
  { id: "face_front_smile", group: "extraoral", label: "Önden yüz — gülümseme", requirement: "required" },
  { id: "face_profile_rest", group: "extraoral", label: "Sağ profil — dinlenme", requirement: "required" },
  { id: "face_profile_smile", group: "extraoral", label: "Sağ profil — gülümseme", requirement: "required" },
  { id: "face_three_quarter_rest", group: "extraoral", label: "Sağ 45° — dinlenme", requirement: "required" },
  {
    id: "face_three_quarter_smile",
    group: "extraoral",
    label: "Sağ 45° — gülümseme",
    requirement: "required",
  },
  { id: "retractor_front_1", group: "extraoral", label: "Ekartörlü frontal — 1", requirement: "required" },
  { id: "retractor_front_2", group: "extraoral", label: "Ekartörlü frontal — 2", requirement: "required" },
  { id: "intraoral_front", group: "intraoral", label: "Frontal oklüzyon", requirement: "required" },
  { id: "intraoral_right", group: "intraoral", label: "Sağ bukkal", requirement: "required" },
  { id: "intraoral_left", group: "intraoral", label: "Sol bukkal", requirement: "required" },
  { id: "intraoral_upper_occlusal", group: "intraoral", label: "Üst oklüzal", requirement: "required" },
  { id: "intraoral_lower_occlusal", group: "intraoral", label: "Alt oklüzal", requirement: "required" },
  { id: "model_front", group: "models", label: "Model — frontal oklüzyon", requirement: "required" },
  { id: "model_right", group: "models", label: "Model — sağ bukkal", requirement: "required" },
  { id: "model_left", group: "models", label: "Model — sol bukkal", requirement: "required" },
  { id: "model_upper_occlusal", group: "models", label: "Model — üst oklüzal", requirement: "required" },
  { id: "model_lower_occlusal", group: "models", label: "Model — alt oklüzal", requirement: "required" },
  { id: "cervical_image", group: "imaging", label: "Servikal vertebra görüntüsü", requirement: "usual" },
  { id: "panoramic_xray", group: "imaging", label: "Panoramik radyografi", requirement: "usual" },
  { id: "lateral_ceph", group: "imaging", label: "Lateral sefalogram", requirement: "usual" },
  { id: "traced_ceph", group: "imaging", label: "Çizimli sefalogram", requirement: "usual" },
] as const;

export const recordSlotIdSchema = z.enum(RECORD_SLOTS.map((slot) => slot.id));
export const caseIdSchema = z.string().uuid();
export const assetIdSchema = z.string().regex(/^sha256:[a-f0-9]{64}$/u);

const managedRelativePathSchema = z
  .string()
  .min(1)
  .max(240)
  .refine(
    (value) =>
      !value.includes("\\") &&
      !value.startsWith("/") &&
      !/^[A-Za-z]:/u.test(value) &&
      !value.split("/").includes(".."),
    "Managed paths must be safe relative paths.",
  );

export const caseAssetSchema = z
  .object({
    assetId: assetIdSchema,
    displayName: z
      .string()
      .min(1)
      .max(180)
      .refine((value) => !/[\\/]/u.test(value)),
    mimeType: z.enum(["image/jpeg", "image/png"]),
    width: z.number().int().positive().max(100_000),
    height: z.number().int().positive().max(100_000),
    originalRelativePath: managedRelativePathSchema,
    normalizedRelativePath: managedRelativePathSchema,
    thumbnailRelativePath: managedRelativePathSchema,
  })
  .strict();

export const caseDocumentSchema = z
  .object({
    schemaVersion: z.literal(CASE_SCHEMA_VERSION),
    caseId: caseIdSchema,
    revision: z.number().int().nonnegative(),
    title: z.string().trim().min(1).max(120),
    createdAt: z.string().datetime({ offset: true }),
    updatedAt: z.string().datetime({ offset: true }),
    assets: z.record(assetIdSchema, caseAssetSchema),
    assignments: z.partialRecord(recordSlotIdSchema, assetIdSchema),
  })
  .strict()
  .superRefine((document, context) => {
    for (const [assetId, asset] of Object.entries(document.assets)) {
      if (assetId !== asset.assetId) {
        context.addIssue({
          code: "custom",
          message: "Asset map keys must match their stable asset IDs.",
          path: ["assets", assetId],
        });
      }
    }
    for (const [slotId, assetId] of Object.entries(document.assignments)) {
      if (document.assets[assetId] === undefined) {
        context.addIssue({
          code: "custom",
          message: "Record assignments must reference a managed asset.",
          path: ["assignments", slotId],
        });
      }
    }
  });

export type RecordSlotId = z.infer<typeof recordSlotIdSchema>;
export type CaseId = z.infer<typeof caseIdSchema>;
export type AssetId = z.infer<typeof assetIdSchema>;
export type CaseAsset = z.infer<typeof caseAssetSchema>;
export type CaseDocument = z.infer<typeof caseDocumentSchema>;

export function createCaseDocument(caseId: string, title: string, now: string): CaseDocument {
  return caseDocumentSchema.parse({
    schemaVersion: CASE_SCHEMA_VERSION,
    caseId,
    revision: 0,
    title,
    createdAt: now,
    updatedAt: now,
    assets: {},
    assignments: {},
  });
}
