export const POWERPOINT_POINTS_PER_INCH = 72 as const;
export const EMU_PER_POINT = 12_700 as const;
export const REFERENCE_RENDER_WIDTH_PX = 1_440 as const;
export const REFERENCE_RENDER_HEIGHT_PX = 1_080 as const;

export const GATE_1_SLIDE_SIZE = {
  widthPt: 720,
  heightPt: 540,
} as const satisfies SlideSize;

export const GATE_1_SLIDE_ORDER = [
  "dental_frontal_comparison",
  "ceph_profile_overlay",
  "ceph_vertical",
  "problem_goal_plan",
] as const;

export type Gate1SemanticSlideId = (typeof GATE_1_SLIDE_ORDER)[number];
export type SemanticSlideId = Gate1SemanticSlideId | (string & {});

export interface SlideSize {
  readonly widthPt: number;
  readonly heightPt: number;
}

export interface PointBounds {
  readonly xPt: number;
  readonly yPt: number;
  readonly widthPt: number;
  readonly heightPt: number;
}

export interface NormalizedCrop {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

export type HorizontalAlignment = "left" | "center" | "right";
export type VerticalAlignment = "top" | "middle" | "bottom";

export interface ElementBase {
  readonly id: string;
  readonly bounds: PointBounds;
  readonly zIndex: number;
}

export interface TextStyle {
  readonly fontFace: string;
  readonly fontSizePt: number;
  readonly minFontSizePt: number;
  readonly color: string;
  readonly bold?: boolean;
  readonly italic?: boolean;
  readonly horizontalAlignment?: HorizontalAlignment;
  readonly verticalAlignment?: VerticalAlignment;
  readonly marginPt?: number | readonly [number, number, number, number];
  readonly breakLine?: boolean;
  readonly lineSpacingMultiple?: number;
}

export interface TextElement extends ElementBase {
  readonly kind: "text";
  readonly text: string;
  readonly style: TextStyle;
}

export interface LineElement extends ElementBase {
  readonly kind: "line";
  readonly color: string;
  readonly widthPt: number;
  readonly dash?: "solid" | "dash" | "dot";
}

export interface TableCell {
  readonly text: string;
  readonly style: TextStyle;
  readonly fillColor?: string;
  readonly borderColor?: string;
  readonly colSpan?: number;
  readonly rowSpan?: number;
}

export interface TableElement extends ElementBase {
  readonly kind: "table";
  readonly columnWidthsPt: readonly number[];
  readonly rowHeightsPt: readonly number[];
  readonly rows: readonly (readonly TableCell[])[];
  readonly overflowPolicy: "report";
}

export interface ImageTransform {
  readonly translationXPt: number;
  readonly translationYPt: number;
  readonly uniformScale: number;
  readonly rotationDeg: number;
  readonly opacity: number;
}

export interface ImageElement extends ElementBase {
  readonly kind: "image";
  readonly source: {
    readonly assetId: string;
    readonly filePath: string;
    readonly widthPx: number;
    readonly heightPx: number;
  };
  readonly placement: "crop" | "contain" | "cover";
  readonly crop?: NormalizedCrop;
  readonly transform: ImageTransform;
  readonly lockAspectRatio: true;
}

export type SlideElement = TextElement | LineElement | TableElement | ImageElement;

export interface SlideDefinition {
  readonly semanticId: SemanticSlideId;
  readonly size: SlideSize;
  readonly backgroundColor: string;
  readonly elements: readonly SlideElement[];
  readonly speakerNotes: readonly string[];
}

export interface SlideDocument {
  readonly schemaVersion: 1;
  readonly slides: readonly SlideDefinition[];
}

export type OverflowReason =
  | "text-exceeds-cell-height"
  | "text-exceeds-cell-width"
  | "minimum-font-size-exceeded"
  | "element-outside-slide";

export interface OverflowIssue {
  readonly semanticSlideId: SemanticSlideId;
  readonly elementId: string;
  readonly row?: number;
  readonly column?: number;
  readonly reason: OverflowReason;
  readonly message: string;
}

export interface ExportValidationResult {
  readonly ok: boolean;
  readonly overflow: readonly OverflowIssue[];
}

export interface ExportResult {
  readonly outputPath: string;
  readonly semanticSlideOrder: readonly SemanticSlideId[];
  readonly validation: ExportValidationResult;
}

export interface Exporter {
  readonly id: string;
  validate(document: SlideDocument): ExportValidationResult;
  export(document: SlideDocument, outputPath: string): Promise<ExportResult>;
}

export function pointsToEmu(points: number): number {
  return Math.round(points * EMU_PER_POINT);
}

export function emuToPoints(emu: number): number {
  return emu / EMU_PER_POINT;
}

export function referencePixelsToPoints(pixels: number): number {
  return pixels * (GATE_1_SLIDE_SIZE.widthPt / REFERENCE_RENDER_WIDTH_PX);
}

export function pointsToReferencePixels(points: number): number {
  return points * (REFERENCE_RENDER_WIDTH_PX / GATE_1_SLIDE_SIZE.widthPt);
}

export interface DentalMeasurements {
  readonly upperMidline: string;
  readonly lowerMidline: string;
  readonly overjetMm: number;
  readonly overbiteMm: number;
}

export interface DentalFrontalComparisonInput {
  readonly measurements: DentalMeasurements;
  readonly intraoralAssetPath: string;
  readonly modelAssetPath: string;
  readonly faceAssetPath: string;
}

export interface CephProfileOverlayInput {
  readonly profileAssetPath: string;
  readonly cephAssetPath: string;
  readonly profileTransform: ImageTransform;
  readonly cephTransform: ImageTransform;
}

export interface VerticalMeasurementRow {
  readonly label: string;
  readonly reference: string;
  readonly value: string;
  readonly highlight?: "high" | "low" | "none";
}

export interface CephVerticalInput {
  readonly cephAssetPath: string;
  readonly rows: readonly VerticalMeasurementRow[];
  readonly growthPattern: string;
  readonly speakerNotes: readonly string[];
}

export interface ProblemGoalPlanRow {
  readonly problem: string;
  readonly goal: string;
  readonly plan: string;
}

export interface ProblemGoalPlanInput {
  readonly rows: readonly ProblemGoalPlanRow[];
}
