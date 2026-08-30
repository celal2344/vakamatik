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
  {
    id: "inferior_intraoral_right",
    group: "inferior",
    label: "İnferior intraoral — sağ",
    requirement: "optional",
  },
  {
    id: "inferior_intraoral_front",
    group: "inferior",
    label: "İnferior intraoral — frontal",
    requirement: "optional",
  },
  {
    id: "inferior_intraoral_left",
    group: "inferior",
    label: "İnferior intraoral — sol",
    requirement: "optional",
  },
  { id: "inferior_model_right", group: "inferior", label: "İnferior model — sağ", requirement: "optional" },
  {
    id: "inferior_model_front",
    group: "inferior",
    label: "İnferior model — frontal",
    requirement: "optional",
  },
  { id: "inferior_model_left", group: "inferior", label: "İnferior model — sol", requirement: "optional" },
  { id: "cervical_image", group: "imaging", label: "Servikal vertebra görüntüsü", requirement: "usual" },
  { id: "panoramic_xray", group: "imaging", label: "Panoramik radyografi", requirement: "usual" },
  { id: "lateral_ceph", group: "imaging", label: "Lateral sefalogram", requirement: "usual" },
  { id: "traced_ceph", group: "imaging", label: "Çizimli sefalogram", requirement: "usual" },
  {
    id: "patient_video",
    group: "optional",
    label: "Hasta videosu poster görüntüsü",
    requirement: "optional",
  },
  { id: "tmj_questionnaire", group: "optional", label: "TME değerlendirme formu", requirement: "optional" },
  {
    id: "space_analysis_worksheet",
    group: "optional",
    label: "Yer analizi çalışma sayfası",
    requirement: "optional",
  },
] as const;

export const CEPH_MEASUREMENTS = [
  ["sn_gogn", "SN–GoGn", "32 ± 5°", "vertical"],
  ["saddle_angle", "Saddle açısı", "123 ± 5°", "vertical"],
  ["articular_angle", "Artiküler açı", "143 ± 6°", "vertical"],
  ["gonial_angle", "Gonial açı", "130 ± 7°", "vertical"],
  ["inner_angle_sum", "İç açılar toplamı", "396 ± 3°", "vertical"],
  ["jarabak_ratio", "Jarabak", "59–63%", "vertical"],
  ["ans_me_n_me_ratio", "ANS–Me / N–Me", "55 ± 0.1%", "vertical"],
  ["maxillary_height_angle", "Maksiller yükseklik", "60 ± 3°", "vertical"],
  ["facial_axis_angle", "Fasiyal aks", "90 ± 3.5°", "vertical"],
  ["s_ar_ar_go_ratio", "S–Ar / Ar–Go", "75 ± 10%", "vertical"],
  ["gonial_ratio", "Gonial oran", "75%", "vertical"],
  ["fma", "FMA", "25 ± 4.5°", "vertical"],
  ["y_axis_angle", "Y aksı", "59.4 ± 5.5°", "vertical"],
  ["occlusal_plane_sn", "Oklüzal düzlem / SN", "14.4 ± 2.5°", "vertical"],
  ["occlusal_plane_mandibular", "Oklüzal / mandibular", "17.6 ± 5°", "vertical"],
  ["palatal_plane_sn", "Palatal düzlem / SN", "7 ± 5°", "vertical"],
  ["palatal_plane_mandibular", "Palatal / mandibular", "26°", "vertical"],
  ["sna", "SNA", "82 ± 2°", "sagittal"],
  ["snb", "SNB", "80 ± 2°", "sagittal"],
  ["anb", "ANB", "2 ± 2°", "sagittal"],
  ["wits", "Wits", "−1 ± 2 mm", "sagittal"],
  ["anterior_cranial_base", "Ön kafa kaidesi", "73 ± 3 mm", "sagittal"],
  ["mandibular_body_length", "Mandibular gövde", "80 ± 4.4 mm", "sagittal"],
  ["anterior_base_mandibular_body", "Ön kaide / gövde", "x / x+7", "sagittal"],
  ["posterior_cranial_base", "Arka kafa kaidesi", "37 ± 4.4 mm", "sagittal"],
  ["a_n_perpendicular", "A–N dikmesi", "1 ± 2 mm", "sagittal"],
  ["pog_n_perpendicular", "Pog–N dikmesi", "−2 ± 4 mm", "sagittal"],
  ["maxillary_depth", "Maksiller derinlik", "90 ± 3°", "sagittal"],
  ["co_a", "Co–A", "91 ± 4.3", "sagittal"],
  ["co_gn", "Co–Gn", "120 ± 5.3", "sagittal"],
  ["u1_sn", "U1–SN", "103 ± 5.5°", "incisor"],
  ["u1_fh", "U1–FH", "112 ± 6°", "incisor"],
  ["u1_palatal", "U1–Palatal", "115 ± 6°", "incisor"],
  ["u1_na_angle", "U1–NA açı", "22 ± 5.7°", "incisor"],
  ["u1_na_distance", "U1–NA mesafe", "4 ± 2.7 mm", "incisor"],
  ["impa", "IMPA", "90 ± 7°", "incisor"],
  ["l1_nb_angle", "L1–NB açı", "25 ± 6°", "incisor"],
  ["l1_nb_distance", "L1–NB mesafe", "4 ± 1.8 mm", "incisor"],
  ["pog_nb", "Pog–NB", "4 ± 1.7 mm", "incisor"],
  ["holdaway_ratio", "Holdaway oranı", "1 / 1", "incisor"],
  ["interincisal_angle", "İnterinsizal açı", "131 ± 6°", "incisor"],
  ["nasolabial_angle", "Nazolabial açı", "102 ± 8°", "soft_tissue"],
  ["holdaway_angle", "Holdaway açısı", "8 ± 4°", "soft_tissue"],
  ["upper_lip_e_line", "Üst dudak / E", "−4 ± 2 mm", "soft_tissue"],
  ["lower_lip_e_line", "Alt dudak / E", "−2 ± 2 mm", "soft_tissue"],
  ["profile_angle", "Profil açısı", "161 ± 5°", "soft_tissue"],
  ["convexity", "Konveksite", "131 ± 4°", "soft_tissue"],
  ["soft_pogonion_sn_vertical", "Yumuşak Pog / Sn", "−3 ± 1 mm", "soft_tissue"],
  ["upper_lip_sn_vertical", "Üst dudak / Sn", "3 ± 1 mm", "soft_tissue"],
  ["lower_lip_sn_vertical", "Alt dudak / Sn", "1 ± 1 mm", "soft_tissue"],
  ["superior_sulcus_depth", "Üst sulkus derinliği", "Kliniğe göre", "soft_tissue"],
] as const;

export const recordSlotIdSchema = z.enum(RECORD_SLOTS.map((slot) => slot.id));
export const measurementIdSchema = z.enum(CEPH_MEASUREMENTS.map(([id]) => id));
export const caseIdSchema = z.string().uuid();
export const assetIdSchema = z.string().regex(/^sha256:[a-f0-9]{64}$/u);

const boundedText = (max = 2_000) => z.string().max(max).default("");
const optionalNumber = z.number().finite().min(-10_000).max(10_000).nullable().default(null);
const dateText = z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/u)]).default("");

export const interpretationSchema = z
  .object({ text: boundedText(), approved: z.boolean().default(false) })
  .strict();
const normalizedCropSchema = z
  .object({
    left: z.number().min(0).max(0.95).default(0),
    top: z.number().min(0).max(0.95).default(0),
    right: z.number().min(0).max(0.95).default(0),
    bottom: z.number().min(0).max(0.95).default(0),
  })
  .strict()
  .superRefine((crop, context) => {
    if (crop.left + crop.right >= 0.98) {
      context.addIssue({ code: "custom", message: "Horizontal crop must leave visible image content." });
    }
    if (crop.top + crop.bottom >= 0.98) {
      context.addIssue({ code: "custom", message: "Vertical crop must leave visible image content." });
    }
  });
export const imageAdjustmentSchema = z
  .object({
    translationXPt: z.number().finite().min(-720).max(720).default(0),
    translationYPt: z.number().finite().min(-540).max(540).default(0),
    uniformScale: z.number().finite().min(0.1).max(8).default(1),
    rotationDeg: z.number().finite().min(-360).max(360).default(0),
    opacity: z.number().finite().min(0).max(1).default(1),
    crop: normalizedCropSchema.prefault({}),
  })
  .strict()
  .prefault({});
export const alignmentInstanceSchema = z
  .object({ linkGroup: z.string().min(1).max(80).nullable().default(null), transform: imageAdjustmentSchema })
  .strict();
export const alignmentStateSchema = z
  .object({
    groups: z.record(z.string().min(1).max(80), imageAdjustmentSchema).default({}),
    instances: z.record(z.string().min(1).max(180), alignmentInstanceSchema).default({}),
  })
  .strict()
  .prefault({});

export const clinicalDataSchema = z
  .object({
    patient: z
      .object({
        patientName: boundedText(160),
        dateOfBirth: dateText,
        patientAssignmentDate: dateText,
        recordsDate: dateText,
        casePresentationDate: dateText,
        treatmentStartDate: dateText,
        treatingDoctor: boundedText(160),
        referringDoctor: boundedText(160),
        chiefComplaint: boundedText(),
        anamnesis: boundedText(),
        ageOverride: boundedText(40),
      })
      .strict()
      .prefault({}),
    findings: z
      .object({
        facialSymmetry: boundedText(240),
        smileLine: boundedText(240),
        upperIncisorDisplay: boundedText(240),
        softTissueProfile: boundedText(240),
        threeQuarterNote: boundedText(),
        cervicalMaturationStage: boundedText(120),
        upperMidline: boundedText(240),
        lowerMidline: boundedText(240),
        overjetMm: optionalNumber,
        overbiteMm: optionalNumber,
        rightMolarRelationship: boundedText(240),
        leftMolarRelationship: boundedText(240),
        rightCanineRelationship: boundedText(240),
        leftCanineRelationship: boundedText(240),
        missingTeethFinding: boundedText(),
        restorativeFinding: boundedText(),
        tmjFinding: boundedText(),
        andrewsElementThreeMm: optionalNumber,
      })
      .strict()
      .prefault({}),
    hn: z
      .object({
        upperTotal: optionalNumber,
        upperRight: optionalNumber,
        upperLeft: optionalNumber,
        lowerRight: optionalNumber,
        lowerLeft: optionalNumber,
        lowerTotal: optionalNumber,
      })
      .strict()
      .prefault({}),
    bolton: z
      .object({
        anterior: z
          .object({
            status: z.enum(["", "calculable", "not-calculable"]).default(""),
            affectedArch: z.enum(["", "upper", "lower"]).default(""),
            discrepancyMm: optionalNumber,
          })
          .strict()
          .prefault({}),
        overall: z
          .object({
            status: z.enum(["", "calculable", "not-calculable"]).default(""),
            affectedArch: z.enum(["", "upper", "lower"]).default(""),
            discrepancyMm: optionalNumber,
          })
          .strict()
          .prefault({}),
      })
      .strict()
      .prefault({}),
    measurements: z.partialRecord(measurementIdSchema, z.string().max(80)).default({}),
    interpretations: z
      .object({
        growthPattern: interpretationSchema.prefault({}),
        skeletal: interpretationSchema.prefault({}),
        upperIncisor: interpretationSchema.prefault({}),
        lowerIncisor: interpretationSchema.prefault({}),
        softTissueProfile: interpretationSchema.prefault({}),
        cervicalStage: interpretationSchema.prefault({}),
        analysisSkeletal: interpretationSchema.prefault({}),
        analysisDental: interpretationSchema.prefault({}),
      })
      .strict()
      .prefault({}),
    problemGoalPlan: z
      .array(z.object({ problem: boundedText(800), goal: boundedText(800), plan: boundedText(800) }).strict())
      .max(5)
      .default([]),
    decision: z
      .object({ ownerTitle: boundedText(240), bullets: z.array(z.string().max(800)).max(12).default([]) })
      .strict()
      .prefault({}),
    icon: z
      .object({
        rows: z
          .array(
            z
              .object({
                label: boundedText(160),
                rawScore: boundedText(40),
                weight: boundedText(40),
                result: boundedText(40),
              })
              .strict(),
          )
          .max(5)
          .default([]),
        total: boundedText(40),
      })
      .strict()
      .prefault({}),
    notes: z
      .object({
        caseNote: boundedText(8_000),
        bySlide: z.record(z.string().min(1).max(80), z.string().max(8_000)).default({}),
        exportSpeakerNotes: z.boolean().default(false),
      })
      .strict()
      .prefault({}),
  })
  .strict()
  .prefault({});
export const presentationSettingsSchema = z
  .object({
    slide8Behavior: z.enum(["include", "omit-when-empty"]).default("include"),
    acknowledgedWarningKeys: z.array(z.string().min(1).max(280)).max(500).default([]),
  })
  .strict()
  .prefault({});

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
    clinical: clinicalDataSchema,
    presentation: presentationSettingsSchema,
    alignment: alignmentStateSchema,
  })
  .strict()
  .superRefine((document, context) => {
    for (const [assetId, asset] of Object.entries(document.assets))
      if (assetId !== asset.assetId)
        context.addIssue({
          code: "custom",
          message: "Asset map keys must match their stable asset IDs.",
          path: ["assets", assetId],
        });
    for (const [slotId, assetId] of Object.entries(document.assignments))
      if (document.assets[assetId] === undefined)
        context.addIssue({
          code: "custom",
          message: "Record assignments must reference a managed asset.",
          path: ["assignments", slotId],
        });
  });

export type RecordSlotId = z.infer<typeof recordSlotIdSchema>;
export type MeasurementId = z.infer<typeof measurementIdSchema>;
export type CaseId = z.infer<typeof caseIdSchema>;
export type AssetId = z.infer<typeof assetIdSchema>;
export type CaseAsset = z.infer<typeof caseAssetSchema>;
export type ClinicalData = z.infer<typeof clinicalDataSchema>;
export type ImageAdjustment = z.infer<typeof imageAdjustmentSchema>;
export type AlignmentState = z.infer<typeof alignmentStateSchema>;
export type PresentationSettings = z.infer<typeof presentationSettingsSchema>;
export type CaseDocument = z.infer<typeof caseDocumentSchema>;

export const DEFAULT_CLINICAL_DATA = clinicalDataSchema.parse({});
export const DEFAULT_ALIGNMENT_STATE = alignmentStateSchema.parse({});
export const DEFAULT_PRESENTATION_SETTINGS = presentationSettingsSchema.parse({});

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
    clinical: {},
    presentation: {},
    alignment: {},
  });
}
