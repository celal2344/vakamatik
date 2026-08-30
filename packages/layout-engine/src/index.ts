import {
  CANONICAL_SLIDE_ORDER,
  GATE_1_SLIDE_SIZE,
  type CanonicalSemanticSlideId,
  type ImageElement,
  type LineElement,
  type PointBounds,
  type SlideDefinition,
  type SlideDocument,
  type SlideElement,
  type TableCell,
  type TableElement,
  type TextElement,
  type TextStyle,
} from "@vakamatik/export-contract";
import {
  CEPH_MEASUREMENTS,
  DEFAULT_ALIGNMENT_STATE,
  DEFAULT_CLINICAL_DATA,
  type AlignmentState,
  type ClinicalData,
  type ImageAdjustment,
} from "@vakamatik/domain";

const COLORS = {
  black: "000000",
  white: "FFFFFF",
  gold: "D8B36A",
  cyan: "38BDF8",
  turquoise: "2DD4BF",
  orange: "FB923C",
  line: "8B8B8B",
  header: "3C96AC",
  rowA: "CAD9E0",
  rowB: "E2EAED",
} as const;

export const CANONICAL_SLIDES = [
  ["case_overview", "Vaka Bilgileri", false],
  ["extraoral_front_rest", "Frontal Yüz — Dinlenme", false],
  ["extraoral_front_smile", "Frontal Yüz — Gülümseme", false],
  ["extraoral_front_profile_rest", "Frontal / Profil — Dinlenme", false],
  ["extraoral_profile_rest_smile", "Profil — Dinlenme / Gülümseme", false],
  ["extraoral_three_quarter", "Üç Çeyrek Görünüm", false],
  ["lip_tooth_relationship", "Diş ve Dudak İlişkileri", false],
  ["extraoral_retractor_pair", "Ekartörlü Frontal Görünüm", false],
  ["dental_frontal_comparison", "Frontal Dental Karşılaştırma", false],
  ["dental_right_comparison", "Sağ Dental Karşılaştırma", false],
  ["dental_left_comparison", "Sol Dental Karşılaştırma", false],
  ["occlusal_photos_space_analysis", "Oklüzal Fotoğraflar ve Yer Analizi", false],
  ["models_space_analysis", "Model Yer Analizi", false],
  ["intraoral_montage", "İntraoral Montaj", false],
  ["model_montage", "Model Montajı", false],
  ["inferior_comparison", "İnferior Karşılaştırma", true],
  ["cervical_maturation", "Servikal Maturasyon", false],
  ["patient_video", "Hasta Videosu", true],
  ["panoramic_missing_teeth", "Panoramik Değerlendirme", false],
  ["panoramic_restorative_findings", "Panoramik Bulgular", false],
  ["tmj_review", "Temporomandibular Eklem", true],
  ["ceph_profile_overlay", "Doğal Baş Pozisyonu Çakıştırması", false],
  ["ceph_lateral", "Lateral Sefalogram", false],
  ["ceph_tracing", "Sefalometrik Çizim", false],
  ["ceph_vertical", "Vertikal Analiz", false],
  ["ceph_sagittal", "Sagittal Analiz", false],
  ["ceph_incisor", "Kesici Diş Analizi", false],
  ["ceph_soft_tissue", "Yumuşak Doku Analizi", false],
  ["analysis_summary", "Analiz Sonuçları", false],
  ["diagnostic_photo_montage", "Tanısal Fotoğraf Montajı", false],
  ["diagnostic_model_montage", "Tanısal Model Montajı", false],
  ["problem_goal_plan", "Problem / Hedef / Plan", false],
  ["case_decision", "Vaka Kararı", false],
  ["icon_index", "ICON İndeksi", true],
  ["space_analysis_worksheet", "Yer Analizi Çalışma Sayfası", true],
] as const satisfies readonly (readonly [CanonicalSemanticSlideId, string, boolean])[];

if (CANONICAL_SLIDES.map(([id]) => id).join("|") !== CANONICAL_SLIDE_ORDER.join("|")) {
  throw new Error("Canonical slide metadata is not aligned with the frozen semantic order.");
}

export type PresentationAssetKey =
  | "face_front_rest"
  | "face_front_smile"
  | "face_profile_rest"
  | "face_profile_smile"
  | "face_three_quarter_rest"
  | "face_three_quarter_smile"
  | "retractor_front_1"
  | "retractor_front_2"
  | "intraoral_front"
  | "intraoral_right"
  | "intraoral_left"
  | "intraoral_upper_occlusal"
  | "intraoral_lower_occlusal"
  | "model_front"
  | "model_right"
  | "model_left"
  | "model_upper_occlusal"
  | "model_lower_occlusal"
  | "inferior_intraoral_right"
  | "inferior_intraoral_front"
  | "inferior_intraoral_left"
  | "inferior_model_right"
  | "inferior_model_front"
  | "inferior_model_left"
  | "cervical_image"
  | "patient_video"
  | "panoramic_xray"
  | "tmj_questionnaire"
  | "lateral_ceph"
  | "traced_ceph"
  | "space_analysis_worksheet";

export interface PresentationAsset {
  readonly assetId: string;
  readonly filePath: string;
  readonly previewFilePath?: string;
  readonly widthPx: number;
  readonly heightPx: number;
}

export interface PresentationBuildOptions {
  readonly slide8Behavior: "include" | "omit-when-empty";
}

export const DEFAULT_PRESENTATION_OPTIONS: PresentationBuildOptions = {
  slide8Behavior: "include",
};

export interface PresentationCaseInput {
  readonly title: string;
  readonly assets: Readonly<Partial<Record<PresentationAssetKey, PresentationAsset>>>;
  readonly options?: PresentationBuildOptions;
  readonly clinical?: ClinicalData;
  readonly alignment?: AlignmentState;
  /** Gate 4 compatibility input; managed cases use clinical.icon. */
  readonly iconIndexRows?: readonly string[];
}

export interface PresentationWarning {
  readonly semanticSlideId: CanonicalSemanticSlideId;
  readonly targetKey: string;
  readonly message: string;
}

export function presentationWarningKey(warning: PresentationWarning): string {
  return `${warning.semanticSlideId}:${warning.targetKey}`;
}

export function hasUnacknowledgedPresentationWarnings(
  warnings: readonly PresentationWarning[],
  acknowledgedKeys: readonly string[],
): boolean {
  const acknowledged = new Set(acknowledgedKeys);
  return warnings.some((warning) => !acknowledged.has(presentationWarningKey(warning)));
}

export const CEPH_SHARED_GROUP = "ceph-shared";
export const CEPH_SHARED_INSTANCE_IDS = [
  "ceph_lateral-lateral_ceph",
  "ceph_vertical-lateral_ceph",
  "ceph_sagittal-lateral_ceph",
  "ceph_incisor-lateral_ceph",
  "ceph_soft_tissue-lateral_ceph",
] as const;

export function defaultLinkGroupForImage(instanceId: string): string | null {
  return CEPH_SHARED_INSTANCE_IDS.includes(instanceId as (typeof CEPH_SHARED_INSTANCE_IDS)[number])
    ? CEPH_SHARED_GROUP
    : null;
}

export interface PresentationBuildResult {
  readonly document: SlideDocument;
  readonly warnings: readonly PresentationWarning[];
}

const bodyStyle: TextStyle = {
  fontFace: "Arial",
  fontSizePt: 14,
  minFontSizePt: 10,
  color: COLORS.white,
  horizontalAlignment: "left",
  verticalAlignment: "middle",
  marginPt: 3,
  lineSpacingMultiple: 1.05,
};

function defined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

function patientAge(patient: ClinicalData["patient"]): string {
  if (patient.ageOverride.trim() !== "") return patient.ageOverride;
  if (patient.dateOfBirth === "" || patient.casePresentationDate === "") return "";
  const birth = new Date(`${patient.dateOfBirth}T00:00:00Z`);
  const presentation = new Date(`${patient.casePresentationDate}T00:00:00Z`);
  let years = presentation.getUTCFullYear() - birth.getUTCFullYear();
  if (
    presentation.getUTCMonth() < birth.getUTCMonth() ||
    (presentation.getUTCMonth() === birth.getUTCMonth() && presentation.getUTCDate() < birth.getUTCDate())
  ) {
    years -= 1;
  }
  return years >= 0 && years <= 120 ? String(years) : "";
}

function line(id: string, bounds: PointBounds, zIndex: number, color: string): LineElement {
  return { kind: "line", id, bounds, zIndex, color, widthPt: 1.5, dash: "dash" };
}

function text(
  id: string,
  bounds: PointBounds,
  value: string,
  zIndex = 20,
  style: TextStyle = bodyStyle,
): TextElement {
  return { kind: "text", id, bounds, text: value, zIndex, style };
}

function titleElement(id: CanonicalSemanticSlideId, value: string): TextElement {
  return text(`${id}-title`, { xPt: 24, yPt: 14, widthPt: 672, heightPt: 38 }, value, 50, {
    ...bodyStyle,
    fontSizePt: 22,
    minFontSizePt: 18,
    color: COLORS.gold,
    bold: true,
    marginPt: 0,
  });
}

function imageElement(
  id: string,
  asset: PresentationAsset,
  bounds: PointBounds,
  zIndex: number,
  placement: ImageElement["placement"] = "cover",
  opacity = 1,
  rotationDeg = 0,
): ImageElement {
  return {
    kind: "image",
    id,
    source: {
      assetId: asset.assetId,
      filePath: asset.filePath,
      ...(asset.previewFilePath === undefined ? {} : { previewFilePath: asset.previewFilePath }),
      widthPx: asset.widthPx,
      heightPx: asset.heightPx,
    },
    bounds,
    zIndex,
    placement,
    transform: {
      translationXPt: 0,
      translationYPt: 0,
      uniformScale: 1,
      rotationDeg,
      opacity,
    },
    lockAspectRatio: true,
  };
}

function tableCell(
  value: string,
  options: { header?: boolean; dark?: boolean; align?: "left" | "center" } = {},
): TableCell {
  const header = options.header === true;
  return {
    text: value,
    style: {
      ...bodyStyle,
      fontSizePt: header ? 12 : 10,
      minFontSizePt: 9,
      color: options.dark === true ? "111111" : COLORS.white,
      bold: header,
      horizontalAlignment: options.align ?? "left",
      marginPt: [2, 3, 2, 3],
    },
    fillColor: header ? COLORS.header : options.dark === true ? COLORS.rowA : COLORS.black,
    borderColor: header ? COLORS.white : COLORS.line,
  };
}

function measurementTable(
  id: string,
  bounds: PointBounds,
  rows: readonly (readonly [string, string] | readonly [string, string, string])[],
): TableElement {
  const headerHeight = 28;
  const rowHeight = (bounds.heightPt - headerHeight) / rows.length;
  return {
    kind: "table",
    id,
    bounds,
    zIndex: 20,
    columnWidthsPt: [bounds.widthPt * 0.53, bounds.widthPt * 0.27, bounds.widthPt * 0.2],
    rowHeightsPt: [headerHeight, ...rows.map(() => rowHeight)],
    rows: [
      [
        tableCell("Ölçüm", { header: true }),
        tableCell("Referans", { header: true, align: "center" }),
        tableCell("T0", { header: true, align: "center" }),
      ],
      ...rows.map(([label, reference, value = ""]) => [
        tableCell(label),
        tableCell(reference, { align: "center" }),
        tableCell(value, { align: "center" }),
      ]),
    ],
    overflowPolicy: "report",
  };
}

function slide(
  id: CanonicalSemanticSlideId,
  elements: readonly SlideElement[],
  notes: readonly string[] = [],
): SlideDefinition {
  return {
    semanticId: id,
    size: GATE_1_SLIDE_SIZE,
    backgroundColor: COLORS.black,
    elements,
    speakerNotes: notes,
  };
}

function addAsset(
  input: PresentationCaseInput,
  warnings: PresentationWarning[],
  semanticSlideId: CanonicalSemanticSlideId,
  key: PresentationAssetKey,
  bounds: PointBounds,
  zIndex: number,
  placement: ImageElement["placement"] = "cover",
  opacity = 1,
  rotationDeg = 0,
): ImageElement | undefined {
  const asset = input.assets[key];
  if (asset === undefined) {
    warnings.push({
      semanticSlideId,
      targetKey: key,
      message: `${key} kaydı atanmadı.`,
    });
    return undefined;
  }
  const image = imageElement(
    `${semanticSlideId}-${key}`,
    asset,
    bounds,
    zIndex,
    placement,
    opacity,
    rotationDeg,
  );
  const alignment = input.alignment ?? DEFAULT_ALIGNMENT_STATE;
  const instance = alignment.instances[image.id];
  const linkGroup = instance === undefined ? defaultLinkGroupForImage(image.id) : instance.linkGroup;
  const adjustment =
    linkGroup === null
      ? instance?.transform
      : (alignment.groups[linkGroup] ??
        (linkGroup === CEPH_SHARED_GROUP ? DEFAULT_IMAGE_ADJUSTMENT : undefined));
  if (adjustment === undefined) return image;
  const hasCrop = Object.values(adjustment.crop).some((value) => value > 0);
  return {
    ...image,
    placement: hasCrop ? "crop" : image.placement,
    ...(hasCrop ? { crop: adjustment.crop } : {}),
    transform: {
      translationXPt: adjustment.translationXPt,
      translationYPt: adjustment.translationYPt,
      uniformScale: adjustment.uniformScale,
      rotationDeg: adjustment.rotationDeg,
      opacity: adjustment.opacity,
    },
  };
}

const DEFAULT_IMAGE_ADJUSTMENT: ImageAdjustment = {
  translationXPt: 0,
  translationYPt: 0,
  uniformScale: 1,
  rotationDeg: 0,
  opacity: 1,
  crop: { left: 0, top: 0, right: 0, bottom: 0 },
};

function clinicalWarning(
  warnings: PresentationWarning[],
  id: CanonicalSemanticSlideId,
  targetKey: string,
  value: string | number | null | undefined,
  approved = true,
): void {
  if ((typeof value === "string" ? value.trim() !== "" : value !== null && value !== undefined) && approved) {
    return;
  }
  warnings.push({
    semanticSlideId: id,
    targetKey,
    message: approved ? "Klinik içerik eksik." : "Yorum klinisyen tarafından onaylanmadı.",
  });
}

function pairedSlide(
  input: PresentationCaseInput,
  warnings: PresentationWarning[],
  id: CanonicalSemanticSlideId,
  heading: string,
  left: PresentationAssetKey,
  right: PresentationAssetKey,
): SlideDefinition {
  return slide(
    id,
    [
      addAsset(input, warnings, id, left, { xPt: 0, yPt: 0, widthPt: 360, heightPt: 486 }, 1),
      addAsset(input, warnings, id, right, { xPt: 360, yPt: 0, widthPt: 360, heightPt: 486 }, 2),
      text(`${id}-caption`, { xPt: 24, yPt: 493, widthPt: 672, heightPt: 31 }, heading, 20, {
        ...bodyStyle,
        color: COLORS.gold,
        bold: true,
        horizontalAlignment: "center",
      }),
    ].filter(defined),
  );
}

function photoFindingSlide(
  input: PresentationCaseInput,
  warnings: PresentationWarning[],
  id: CanonicalSemanticSlideId,
  heading: string,
  key: PresentationAssetKey,
  finding: string,
): SlideDefinition {
  clinicalWarning(warnings, id, `${id}.finding`, finding);
  return slide(
    id,
    [
      addAsset(input, warnings, id, key, { xPt: 0, yPt: 0, widthPt: 405, heightPt: 540 }, 1),
      text(`${id}-heading`, { xPt: 438, yPt: 116, widthPt: 250, heightPt: 70 }, heading, 20, {
        ...bodyStyle,
        color: COLORS.gold,
        fontSizePt: 20,
        minFontSizePt: 17,
        bold: true,
        verticalAlignment: "top",
      }),
      text(`${id}-finding`, { xPt: 438, yPt: 202, widthPt: 250, heightPt: 170 }, finding, 21, {
        ...bodyStyle,
        verticalAlignment: "top",
      }),
    ].filter(defined),
  );
}

const INFERIOR_KEYS: readonly PresentationAssetKey[] = [
  "inferior_intraoral_right",
  "inferior_intraoral_front",
  "inferior_intraoral_left",
  "inferior_model_right",
  "inferior_model_front",
  "inferior_model_left",
];

function buildSlide(
  id: CanonicalSemanticSlideId,
  heading: string,
  input: PresentationCaseInput,
  warnings: PresentationWarning[],
): SlideDefinition {
  const clinical = input.clinical ?? DEFAULT_CLINICAL_DATA;
  switch (id) {
    case "case_overview":
      clinicalWarning(warnings, id, "patient.patientName", clinical.patient.patientName);
      clinicalWarning(warnings, id, "patient.dateOfBirth", clinical.patient.dateOfBirth);
      clinicalWarning(warnings, id, "patient.patientAssignmentDate", clinical.patient.patientAssignmentDate);
      clinicalWarning(warnings, id, "patient.recordsDate", clinical.patient.recordsDate);
      clinicalWarning(warnings, id, "patient.casePresentationDate", clinical.patient.casePresentationDate);
      clinicalWarning(warnings, id, "patient.treatingDoctor", clinical.patient.treatingDoctor);
      clinicalWarning(warnings, id, "patient.chiefComplaint", clinical.patient.chiefComplaint);
      return slide(id, [
        text(
          "case-overview-title",
          { xPt: 25, yPt: 70, widthPt: 670, heightPt: 70 },
          clinical.patient.patientName || input.title,
          10,
          {
            ...bodyStyle,
            color: COLORS.gold,
            fontSizePt: 28,
            minFontSizePt: 22,
            bold: true,
            marginPt: 0,
          },
        ),
        text(
          "case-overview-label",
          { xPt: 25, yPt: 145, widthPt: 670, heightPt: 34 },
          "Ortodontik vaka sunumu",
          11,
          {
            ...bodyStyle,
            color: COLORS.white,
            fontSizePt: 17,
            marginPt: 0,
          },
        ),
        text(
          "case-overview-metadata",
          { xPt: 25, yPt: 202, widthPt: 670, heightPt: 190 },
          [
            clinical.patient.casePresentationDate && `Sunum tarihi: ${clinical.patient.casePresentationDate}`,
            clinical.patient.dateOfBirth && `Doğum tarihi: ${clinical.patient.dateOfBirth}`,
            patientAge(clinical.patient) && `Yaş: ${patientAge(clinical.patient)}`,
            clinical.patient.patientAssignmentDate &&
              `Hasta veriliş: ${clinical.patient.patientAssignmentDate}`,
            clinical.patient.recordsDate && `Kayıt tarihi: ${clinical.patient.recordsDate}`,
            clinical.patient.treatmentStartDate &&
              `Tedavi başlangıcı: ${clinical.patient.treatmentStartDate}`,
            clinical.patient.treatingDoctor && `Hekim: ${clinical.patient.treatingDoctor}`,
            clinical.patient.referringDoctor && `Sevk eden: ${clinical.patient.referringDoctor}`,
            clinical.patient.chiefComplaint && `Şikâyet: ${clinical.patient.chiefComplaint}`,
            clinical.patient.anamnesis && `Anamnez: ${clinical.patient.anamnesis}`,
          ]
            .filter(Boolean)
            .join("\n"),
          12,
          { ...bodyStyle, verticalAlignment: "top" },
        ),
      ]);
    case "extraoral_front_rest":
      return photoFindingSlide(
        input,
        warnings,
        id,
        "Yüz simetrisi",
        "face_front_rest",
        clinical.findings.facialSymmetry,
      );
    case "extraoral_front_smile":
      return photoFindingSlide(
        input,
        warnings,
        id,
        "Gülümseme hattı",
        "face_front_smile",
        clinical.findings.smileLine,
      );
    case "extraoral_front_profile_rest":
      return pairedSlide(input, warnings, id, heading, "face_front_rest", "face_profile_rest");
    case "extraoral_profile_rest_smile":
      clinicalWarning(warnings, id, "extraoral.softTissueProfile", clinical.findings.softTissueProfile);
      {
        const base = pairedSlide(input, warnings, id, heading, "face_profile_rest", "face_profile_smile");
        return {
          ...base,
          elements: [
            ...base.elements,
            text(
              `${id}-finding`,
              { xPt: 40, yPt: 455, widthPt: 640, heightPt: 30 },
              clinical.findings.softTissueProfile,
              30,
              { ...bodyStyle, color: COLORS.gold, horizontalAlignment: "center" },
            ),
          ],
        };
      }
    case "extraoral_three_quarter": {
      const base = pairedSlide(
        input,
        warnings,
        id,
        heading,
        "face_three_quarter_rest",
        "face_three_quarter_smile",
      );
      return {
        ...base,
        elements: [
          ...base.elements,
          text(
            `${id}-finding`,
            { xPt: 40, yPt: 455, widthPt: 640, heightPt: 30 },
            clinical.findings.threeQuarterNote,
            30,
            { ...bodyStyle, color: COLORS.gold, horizontalAlignment: "center" },
          ),
        ],
      };
    }
    case "lip_tooth_relationship": {
      clinicalWarning(warnings, id, "extraoral.upperIncisorDisplay", clinical.findings.upperIncisorDisplay);
      const placements = [
        ["face_front_rest", 0, 79],
        ["face_front_smile", 360, 79],
        ["face_profile_rest", 0, 281],
        ["face_profile_smile", 360, 281],
      ] as const;
      return slide(id, [
        titleElement(id, heading),
        ...placements
          .map(([key, xPt, yPt], index) =>
            addAsset(input, warnings, id, key, { xPt, yPt, widthPt: 360, heightPt: 203 }, index + 1),
          )
          .filter(defined),
        text(
          `${id}-finding`,
          { xPt: 24, yPt: 487, widthPt: 672, heightPt: 38 },
          clinical.findings.upperIncisorDisplay,
          30,
          { ...bodyStyle, color: COLORS.gold, horizontalAlignment: "center" },
        ),
      ]);
    }
    case "extraoral_retractor_pair":
      return pairedSlide(input, warnings, id, heading, "retractor_front_1", "retractor_front_2");
    case "dental_frontal_comparison": {
      clinicalWarning(warnings, id, "dental.upperMidline", clinical.findings.upperMidline);
      clinicalWarning(warnings, id, "dental.lowerMidline", clinical.findings.lowerMidline);
      clinicalWarning(warnings, id, "dental.overjetMm", clinical.findings.overjetMm);
      clinicalWarning(warnings, id, "dental.overbiteMm", clinical.findings.overbiteMm);
      return slide(
        id,
        [
          addAsset(
            input,
            warnings,
            id,
            "intraoral_front",
            { xPt: 0, yPt: 0, widthPt: 442, heightPt: 249 },
            1,
          ),
          addAsset(input, warnings, id, "model_front", { xPt: 0, yPt: 249, widthPt: 442, heightPt: 249 }, 2),
          addAsset(
            input,
            warnings,
            id,
            "face_front_rest",
            { xPt: 442, yPt: 75, widthPt: 278, heightPt: 373 },
            3,
          ),
          line("upper-midline-guide", { xPt: 221, yPt: 37, widthPt: 0, heightPt: 190 }, 10, COLORS.cyan),
          line(
            "lower-midline-guide",
            { xPt: 221, yPt: 275, widthPt: 0, heightPt: 190 },
            11,
            COLORS.turquoise,
          ),
          text(
            "dental-frontal-values",
            { xPt: 455, yPt: 452, widthPt: 250, heightPt: 74 },
            [
              `Üst orta hat: ${clinical.findings.upperMidline}`,
              `Alt orta hat: ${clinical.findings.lowerMidline}`,
              `Overjet: ${clinical.findings.overjetMm ?? ""} mm · Overbite: ${clinical.findings.overbiteMm ?? ""} mm`,
            ].join("\n"),
            30,
            { ...bodyStyle, fontSizePt: 11, minFontSizePt: 9, verticalAlignment: "top" },
          ),
        ].filter(defined),
      );
    }
    case "dental_right_comparison":
    case "dental_left_comparison": {
      const isRight = id === "dental_right_comparison";
      const relationship = isRight
        ? `${clinical.findings.rightMolarRelationship}; ${clinical.findings.rightCanineRelationship}`
        : `${clinical.findings.leftMolarRelationship}; ${clinical.findings.leftCanineRelationship}`;
      clinicalWarning(warnings, id, "dental.relationships", relationship.replace(/^; |; $/gu, ""));
      const xPt = isRight ? 0 : 247;
      const key = isRight ? "right" : "left";
      return slide(
        id,
        [
          addAsset(input, warnings, id, `intraoral_${key}`, { xPt, yPt: 2, widthPt: 471, heightPt: 263 }, 1),
          addAsset(
            input,
            warnings,
            id,
            `model_${key}`,
            { xPt, yPt: 267, widthPt: isRight ? 469 : 473, heightPt: 263 },
            2,
          ),
          text(
            `${id}-finding`,
            { xPt: isRight ? 490 : 18, yPt: 188, widthPt: 210, heightPt: 160 },
            relationship || heading,
            20,
            {
              ...bodyStyle,
              color: COLORS.gold,
              bold: true,
              verticalAlignment: "top",
            },
          ),
        ].filter(defined),
      );
    }
    case "occlusal_photos_space_analysis":
    case "models_space_analysis": {
      clinicalWarning(
        warnings,
        id,
        "spaceAnalysis.hn",
        Object.values(clinical.hn).every((value) => value !== null) ? "complete" : "",
      );
      clinicalWarning(
        warnings,
        id,
        "spaceAnalysis.bolton",
        clinical.bolton.anterior.status !== "" && clinical.bolton.overall.status !== "" ? "complete" : "",
      );
      const model = id === "models_space_analysis";
      const prefix = model ? "model" : "intraoral";
      return slide(
        id,
        [
          addAsset(
            input,
            warnings,
            id,
            `${prefix}_upper_occlusal`,
            { xPt: 0, yPt: 0, widthPt: 360, heightPt: 270 },
            1,
          ),
          addAsset(
            input,
            warnings,
            id,
            `${prefix}_lower_occlusal`,
            { xPt: 0, yPt: 270, widthPt: 360, heightPt: 270 },
            2,
          ),
          titleElement(id, heading),
          text(
            `${id}-analysis-label`,
            { xPt: 390, yPt: 72, widthPt: 300, heightPt: 370 },
            [
              `HN üst: ${clinical.hn.upperTotal ?? ""} mm`,
              `Üst sağ / sol: ${clinical.hn.upperRight ?? ""} / ${clinical.hn.upperLeft ?? ""} mm`,
              `HN alt: ${clinical.hn.lowerTotal ?? ""} mm`,
              `Alt sağ / sol: ${clinical.hn.lowerRight ?? ""} / ${clinical.hn.lowerLeft ?? ""} mm`,
              `Bolton anterior: ${clinical.bolton.anterior.discrepancyMm ?? ""} mm`,
              `Durum / ark: ${clinical.bolton.anterior.status} / ${clinical.bolton.anterior.affectedArch}`,
              `Bolton total: ${clinical.bolton.overall.discrepancyMm ?? ""} mm`,
              `Durum / ark: ${clinical.bolton.overall.status} / ${clinical.bolton.overall.affectedArch}`,
            ].join("\n"),
            20,
            {
              ...bodyStyle,
              color: COLORS.gold,
              fontSizePt: 13,
              minFontSizePt: 10,
              bold: true,
              horizontalAlignment: "center",
            },
          ),
        ].filter(defined),
      );
    }
    case "intraoral_montage":
    case "model_montage": {
      clinicalWarning(warnings, id, "dental.summaryMeasurements", clinical.findings.upperMidline);
      const prefix = id === "intraoral_montage" ? "intraoral" : "model";
      const placements = [
        [`${prefix}_upper_occlusal`, 235, 0, 250, 187],
        [`${prefix}_left`, 0, 198, 240, 140],
        [`${prefix}_front`, 240, 198, 240, 140],
        [`${prefix}_right`, 480, 198, 240, 140],
        [`${prefix}_lower_occlusal`, 235, 350, 250, 187],
      ] as const;
      return slide(
        id,
        [
          ...placements.map(([key, xPt, yPt, widthPt, heightPt], index) =>
            addAsset(input, warnings, id, key, { xPt, yPt, widthPt, heightPt }, index + 1),
          ),
          text(
            `${id}-clinical-summary`,
            { xPt: 10, yPt: 500, widthPt: 700, heightPt: 34 },
            `Üst/alt orta hat: ${clinical.findings.upperMidline} / ${clinical.findings.lowerMidline} · OJ/OB: ${clinical.findings.overjetMm ?? ""}/${clinical.findings.overbiteMm ?? ""} mm · Element III: ${clinical.findings.andrewsElementThreeMm ?? ""} mm`,
            30,
            { ...bodyStyle, fontSizePt: 10, minFontSizePt: 9, horizontalAlignment: "center" },
          ),
        ].filter(defined),
      );
    }
    case "inferior_comparison":
      return slide(
        id,
        INFERIOR_KEYS.map((key, index) =>
          addAsset(
            input,
            warnings,
            id,
            key,
            {
              xPt: (index % 3) * 240,
              yPt: index < 3 ? 70 : 222,
              widthPt: 240,
              heightPt: 138,
            },
            index + 1,
          ),
        ).filter(defined),
      );
    case "cervical_maturation":
      clinicalWarning(
        warnings,
        id,
        "growth.cervicalStage",
        clinical.interpretations.cervicalStage.text,
        clinical.interpretations.cervicalStage.approved,
      );
      return slide(
        id,
        [
          titleElement(id, heading),
          addAsset(
            input,
            warnings,
            id,
            "cervical_image",
            { xPt: 43, yPt: 68, widthPt: 258, heightPt: 362 },
            1,
            "contain",
          ),
          text(
            "cervical-reference",
            { xPt: 338, yPt: 106, widthPt: 301, heightPt: 278 },
            clinical.interpretations.cervicalStage.text || clinical.findings.cervicalMaturationStage,
            10,
            {
              ...bodyStyle,
              color: COLORS.gold,
              fontSizePt: 20,
              bold: true,
              horizontalAlignment: "center",
            },
          ),
        ].filter(defined),
      );
    case "patient_video":
      return slide(
        id,
        [
          titleElement(id, heading),
          addAsset(
            input,
            warnings,
            id,
            "patient_video",
            { xPt: 218, yPt: 174, widthPt: 272, heightPt: 142 },
            1,
            "contain",
          ),
        ].filter(defined),
      );
    case "panoramic_missing_teeth":
    case "panoramic_restorative_findings":
      clinicalWarning(
        warnings,
        id,
        id === "panoramic_missing_teeth" ? "radiographic.missingTeeth" : "radiographic.restorativeFindings",
        id === "panoramic_missing_teeth"
          ? clinical.findings.missingTeethFinding
          : clinical.findings.restorativeFinding,
      );
      return slide(
        id,
        [
          titleElement(id, heading),
          addAsset(
            input,
            warnings,
            id,
            "panoramic_xray",
            { xPt: 0, yPt: 73, widthPt: 720, heightPt: id === "panoramic_missing_teeth" ? 396 : 369 },
            1,
            "contain",
          ),
          text(
            `${id}-finding`,
            { xPt: 28, yPt: 467, widthPt: 664, heightPt: 55 },
            id === "panoramic_missing_teeth"
              ? clinical.findings.missingTeethFinding
              : clinical.findings.restorativeFinding,
            20,
            { ...bodyStyle, color: COLORS.gold, horizontalAlignment: "center" },
          ),
        ].filter(defined),
      );
    case "tmj_review":
      clinicalWarning(warnings, id, "radiographic.tmjFinding", clinical.findings.tmjFinding);
      return slide(
        id,
        [
          titleElement(id, heading),
          addAsset(
            input,
            warnings,
            id,
            "panoramic_xray",
            { xPt: 19, yPt: 104, widthPt: 118, heightPt: 175 },
            1,
          ),
          addAsset(
            input,
            warnings,
            id,
            "panoramic_xray",
            { xPt: 149, yPt: 104, widthPt: 118, heightPt: 175 },
            2,
          ),
          addAsset(
            input,
            warnings,
            id,
            "tmj_questionnaire",
            { xPt: 226, yPt: 306, widthPt: 494, heightPt: 234 },
            3,
            "contain",
          ),
          text(
            "tmj-finding",
            { xPt: 300, yPt: 92, widthPt: 390, heightPt: 180 },
            clinical.findings.tmjFinding,
            20,
            { ...bodyStyle, verticalAlignment: "top" },
          ),
        ].filter(defined),
      );
    case "ceph_profile_overlay":
      return slide(
        id,
        [
          addAsset(
            input,
            warnings,
            id,
            "face_profile_rest",
            { xPt: 100, yPt: 44, widthPt: 468, heightPt: 468 },
            1,
            "cover",
            0.62,
            0,
          ),
          addAsset(
            input,
            warnings,
            id,
            "lateral_ceph",
            { xPt: 144, yPt: 58, widthPt: 461, heightPt: 432 },
            2,
            "cover",
            0.78,
            -4.3,
          ),
        ].filter(defined),
      );
    case "ceph_lateral":
      return slide(
        id,
        [
          titleElement(id, heading),
          addAsset(
            input,
            warnings,
            id,
            "lateral_ceph",
            { xPt: 131, yPt: 64, widthPt: 486, heightPt: 429 },
            1,
            "contain",
          ),
        ].filter(defined),
      );
    case "ceph_tracing":
      return slide(
        id,
        [
          titleElement(id, heading),
          addAsset(
            input,
            warnings,
            id,
            "traced_ceph",
            { xPt: 131, yPt: 64, widthPt: 486, heightPt: 429 },
            1,
            "contain",
          ),
        ].filter(defined),
      );
    case "ceph_vertical":
    case "ceph_sagittal":
    case "ceph_incisor":
    case "ceph_soft_tissue": {
      const measurementGroup =
        id === "ceph_vertical"
          ? "vertical"
          : id === "ceph_sagittal"
            ? "sagittal"
            : id === "ceph_incisor"
              ? "incisor"
              : "soft_tissue";
      const rows = CEPH_MEASUREMENTS.filter(([, , , group]) => group === measurementGroup).map(
        ([key, label, reference]) => [label, reference, clinical.measurements[key] ?? ""] as const,
      );
      const interpretation =
        id === "ceph_vertical"
          ? clinical.interpretations.growthPattern
          : id === "ceph_sagittal"
            ? clinical.interpretations.skeletal
            : id === "ceph_incisor"
              ? clinical.interpretations.upperIncisor
              : clinical.interpretations.softTissueProfile;
      const interpretationText =
        id === "ceph_incisor"
          ? [clinical.interpretations.upperIncisor.text, clinical.interpretations.lowerIncisor.text]
              .filter(Boolean)
              .join("\n")
          : interpretation.text;
      const interpretationApproved =
        id === "ceph_incisor"
          ? clinical.interpretations.upperIncisor.approved && clinical.interpretations.lowerIncisor.approved
          : interpretation.approved;
      clinicalWarning(
        warnings,
        id,
        `measurements.${id}`,
        rows.every((row) => row[2].trim() !== "") ? "complete" : "",
      );
      clinicalWarning(warnings, id, `interpretations.${id}`, interpretationText, interpretationApproved);
      const tableBounds =
        id === "ceph_vertical"
          ? { xPt: 341, yPt: 11, widthPt: 365, heightPt: 489 }
          : id === "ceph_sagittal"
            ? { xPt: 331, yPt: 49, widthPt: 379, heightPt: 405 }
            : id === "ceph_incisor"
              ? { xPt: 358, yPt: 68, widthPt: 334, heightPt: 359 }
              : { xPt: 349, yPt: 83, widthPt: 352, heightPt: 373 };
      return slide(
        id,
        [
          addAsset(
            input,
            warnings,
            id,
            "lateral_ceph",
            { xPt: 3, yPt: 118, widthPt: 334, heightPt: 303 },
            1,
            "contain",
          ),
          measurementTable(`${id}-table`, tableBounds, rows),
          text(
            `${id}-interpretation`,
            { xPt: 28, yPt: 468, widthPt: 664, heightPt: 52 },
            interpretationText,
            30,
            { ...bodyStyle, color: COLORS.gold, horizontalAlignment: "center" },
          ),
        ].filter(defined),
      );
    }
    case "analysis_summary":
      clinicalWarning(
        warnings,
        id,
        "analysis.skeletal",
        clinical.interpretations.analysisSkeletal.text,
        clinical.interpretations.analysisSkeletal.approved,
      );
      clinicalWarning(
        warnings,
        id,
        "analysis.dental",
        clinical.interpretations.analysisDental.text,
        clinical.interpretations.analysisDental.approved,
      );
      return slide(id, [
        titleElement(id, heading),
        text(
          "analysis-skeletal",
          { xPt: 60, yPt: 120, widthPt: 600, heightPt: 125 },
          `İskeletsel\n${clinical.interpretations.analysisSkeletal.text}`,
          10,
          { ...bodyStyle, fontSizePt: 18, color: COLORS.gold, verticalAlignment: "top" },
        ),
        text(
          "analysis-dental",
          { xPt: 60, yPt: 285, widthPt: 600, heightPt: 125 },
          `Dental\n${clinical.interpretations.analysisDental.text}`,
          11,
          { ...bodyStyle, fontSizePt: 18, color: COLORS.gold, verticalAlignment: "top" },
        ),
      ]);
    case "diagnostic_photo_montage":
    case "diagnostic_model_montage": {
      const model = id === "diagnostic_model_montage";
      const topKeys = [
        "face_front_rest",
        "face_front_smile",
        "face_profile_rest",
        "face_profile_smile",
      ] as const;
      const lowerKeys: readonly PresentationAssetKey[] = model
        ? ["model_right", "model_front", "model_left", "model_upper_occlusal", "model_lower_occlusal"]
        : [
            "intraoral_right",
            "intraoral_front",
            "intraoral_left",
            "intraoral_upper_occlusal",
            "intraoral_lower_occlusal",
          ];
      const elements: SlideElement[] = [];
      topKeys.forEach((key, index) => {
        const item = addAsset(
          input,
          warnings,
          id,
          key,
          { xPt: index * 180, yPt: 0, widthPt: 180, heightPt: 220 },
          index + 1,
        );
        if (item !== undefined) elements.push(item);
      });
      lowerKeys.forEach((key, index) => {
        const row = index < 3 ? 0 : 1;
        const column = row === 0 ? index : index - 3;
        const item = addAsset(
          input,
          warnings,
          id,
          key,
          {
            xPt: row === 0 ? column * 240 : 120 + column * 240,
            yPt: row === 0 ? 220 : 370,
            widthPt: 240,
            heightPt: row === 0 ? 150 : 170,
          },
          index + 10,
        );
        if (item !== undefined) elements.push(item);
      });
      return slide(id, elements);
    }
    case "problem_goal_plan": {
      clinicalWarning(
        warnings,
        id,
        "plan.rows",
        clinical.problemGoalPlan.some((row) => row.problem.trim() !== "") ? "complete" : "",
      );
      const rows = Array.from({ length: 5 }, (_, index) => [
        tableCell(String(index + 1), { dark: true, align: "center" }),
        tableCell(clinical.problemGoalPlan[index]?.problem ?? "", { dark: true }),
        tableCell(clinical.problemGoalPlan[index]?.goal ?? "", { dark: true }),
        tableCell(clinical.problemGoalPlan[index]?.plan ?? "", { dark: true }),
      ]);
      return slide(id, [
        {
          kind: "table",
          id: "problem-goal-plan-table",
          bounds: { xPt: 0, yPt: 66, widthPt: 720, heightPt: 474 },
          zIndex: 1,
          columnWidthsPt: [63.87, 226.49, 234.07, 195.57],
          rowHeightsPt: [34, 88, 88, 88, 88, 88],
          rows: [
            [
              tableCell("#", { header: true, align: "center" }),
              tableCell("Problem", { header: true }),
              tableCell("Hedef", { header: true }),
              tableCell("Plan", { header: true }),
            ],
            ...rows,
          ],
          overflowPolicy: "report",
        },
      ]);
    }
    case "case_decision":
      clinicalWarning(warnings, id, "decision.bullets", clinical.decision.bullets.join(" "));
      return slide(id, [
        titleElement(id, heading),
        text(
          "case-decision-owner",
          { xPt: 72, yPt: 105, widthPt: 576, heightPt: 45 },
          clinical.decision.ownerTitle,
          10,
          { ...bodyStyle, color: COLORS.gold, bold: true, horizontalAlignment: "center" },
        ),
        text(
          "case-decision-bullets",
          { xPt: 105, yPt: 175, widthPt: 510, heightPt: 285 },
          clinical.decision.bullets.map((item) => `• ${item}`).join("\n"),
          11,
          { ...bodyStyle, fontSizePt: 18, verticalAlignment: "top" },
        ),
      ]);
    case "icon_index": {
      const rows =
        clinical.icon.rows.length > 0
          ? clinical.icon.rows.map((row) => `${row.label} · ${row.rawScore} × ${row.weight} = ${row.result}`)
          : [...(input.iconIndexRows ?? [])];
      return slide(id, [
        titleElement(id, heading),
        text("icon-index-rows", { xPt: 86, yPt: 90, widthPt: 548, heightPt: 380 }, rows.join("\n"), 10, {
          ...bodyStyle,
          fontSizePt: 17,
          lineSpacingMultiple: 1.3,
          verticalAlignment: "top",
        }),
        text(
          "icon-index-total",
          { xPt: 86, yPt: 470, widthPt: 548, heightPt: 38 },
          `Toplam: ${clinical.icon.total}`,
          11,
          { ...bodyStyle, color: COLORS.gold, bold: true, horizontalAlignment: "right" },
        ),
      ]);
    }
    case "space_analysis_worksheet":
      return slide(
        id,
        [
          addAsset(
            input,
            warnings,
            id,
            "space_analysis_worksheet",
            { xPt: 20, yPt: 20, widthPt: 680, heightPt: 500 },
            1,
            "contain",
          ),
        ].filter(defined),
      );
  }
}

export function buildPresentationDocument(input: PresentationCaseInput): PresentationBuildResult {
  const warnings: PresentationWarning[] = [];
  const options = input.options ?? DEFAULT_PRESENTATION_OPTIONS;
  const clinical = input.clinical ?? DEFAULT_CLINICAL_DATA;
  const hasAnyInferior = INFERIOR_KEYS.some((key) => input.assets[key] !== undefined);
  const hasRetractor =
    input.assets.retractor_front_1 !== undefined || input.assets.retractor_front_2 !== undefined;

  const include = (id: CanonicalSemanticSlideId): boolean => {
    switch (id) {
      case "inferior_comparison":
        return hasAnyInferior;
      case "patient_video":
        return input.assets.patient_video !== undefined;
      case "tmj_review":
        return input.assets.tmj_questionnaire !== undefined;
      case "icon_index":
        return (
          clinical.icon.rows.some((row) => row.label.trim() !== "" || row.rawScore.trim() !== "") ||
          (input.iconIndexRows?.length ?? 0) > 0
        );
      case "space_analysis_worksheet":
        return input.assets.space_analysis_worksheet !== undefined;
      case "extraoral_retractor_pair":
        return options.slide8Behavior === "include" || hasRetractor;
      default:
        return true;
    }
  };

  const slides = CANONICAL_SLIDES.filter(([id]) => include(id)).map(([id, heading]) => {
    const built = buildSlide(id, heading, input, warnings);
    const slideNote = clinical.notes.bySlide[id]?.trim();
    const notes = clinical.notes.exportSpeakerNotes
      ? [id === "case_overview" ? clinical.notes.caseNote.trim() : "", slideNote ?? ""].filter(Boolean)
      : [];
    return notes.length === 0 ? built : { ...built, speakerNotes: notes };
  });

  return {
    document: { schemaVersion: 1, slides },
    warnings,
  };
}
