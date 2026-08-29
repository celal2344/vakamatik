import type {
  CephProfileOverlayInput,
  CephVerticalInput,
  DentalFrontalComparisonInput,
  ImageElement,
  PointBounds,
  ProblemGoalPlanInput,
  SlideDefinition,
  SlideDocument,
  TableCell,
  TextElement,
  TextStyle,
} from "@vakamatik/export-contract";
import { GATE_1_SLIDE_SIZE } from "@vakamatik/export-contract";

const COLORS = {
  black: "000000",
  white: "FFFFFF",
  gold: "D8B36A",
  cyan: "38BDF8",
  turquoise: "2DD4BF",
  orange: "FB923C",
  red: "F87171",
  tableLine: "BFBFBF",
  planHeader: "3C96AC",
  planRowA: "CAD9E0",
  planRowB: "E2EAED",
} as const;

const bodyStyle: TextStyle = {
  fontFace: "Arial",
  fontSizePt: 14,
  minFontSizePt: 11,
  color: COLORS.white,
  horizontalAlignment: "left",
  verticalAlignment: "middle",
  marginPt: 4,
  lineSpacingMultiple: 1.05,
};

function text(
  id: string,
  bounds: PointBounds,
  value: string,
  zIndex: number,
  style: TextStyle = bodyStyle,
): TextElement {
  return { kind: "text", id, bounds, text: value, zIndex, style };
}

function image(
  id: string,
  assetId: string,
  filePath: string,
  widthPx: number,
  heightPx: number,
  bounds: PointBounds,
  zIndex: number,
  options: Partial<Pick<ImageElement, "placement" | "crop" | "transform">> = {},
): ImageElement {
  return {
    kind: "image",
    id,
    source: { assetId, filePath, widthPx, heightPx },
    bounds,
    zIndex,
    placement: options.placement ?? "cover",
    ...(options.crop === undefined ? {} : { crop: options.crop }),
    transform: options.transform ?? {
      translationXPt: 0,
      translationYPt: 0,
      uniformScale: 1,
      rotationDeg: 0,
      opacity: 1,
    },
    lockAspectRatio: true,
  };
}

export function createDentalSlide(input: DentalFrontalComparisonInput): SlideDefinition {
  const { measurements } = input;
  return {
    semanticId: "dental_frontal_comparison",
    size: GATE_1_SLIDE_SIZE,
    backgroundColor: COLORS.black,
    speakerNotes: [],
    elements: [
      image("dental-intraoral", "fixture-dental-intraoral", input.intraoralAssetPath, 1200, 675, { xPt: 0, yPt: 0, widthPt: 442, heightPt: 249 }, 1),
      image("dental-model", "fixture-dental-model", input.modelAssetPath, 1200, 675, { xPt: 0, yPt: 249, widthPt: 442, heightPt: 249 }, 2),
      image("frontal-board", "fixture-frontal-board", input.faceAssetPath, 750, 1000, { xPt: 442, yPt: 75, widthPt: 278, heightPt: 373 }, 3, { placement: "cover", crop: { left: 0.02, top: 0.01, right: 0.02, bottom: 0.01 } }),
      {
        kind: "line",
        id: "upper-midline-guide",
        bounds: { xPt: 221, yPt: 37, widthPt: 0, heightPt: 190 },
        zIndex: 10,
        color: COLORS.cyan,
        widthPt: 1.5,
        dash: "dash",
      },
      {
        kind: "line",
        id: "lower-midline-guide",
        bounds: { xPt: 221, yPt: 275, widthPt: 0, heightPt: 190 },
        zIndex: 11,
        color: COLORS.turquoise,
        widthPt: 1.5,
        dash: "dash",
      },
      text("upper-midline-value", { xPt: 451, yPt: 457, widthPt: 255, heightPt: 19 }, measurements.upperMidline, 20),
      text("lower-midline-value", { xPt: 451, yPt: 477, widthPt: 255, heightPt: 19 }, measurements.lowerMidline, 21),
      text("overjet-value", { xPt: 451, yPt: 497, widthPt: 123, heightPt: 19 }, `Overjet: ${measurements.overjetMm.toFixed(1)} mm`, 22),
      text("overbite-value", { xPt: 578, yPt: 497, widthPt: 128, heightPt: 19 }, `Overbite: ${measurements.overbiteMm.toFixed(1)} mm`, 23),
    ],
  };
}

export function createOverlaySlide(input: CephProfileOverlayInput): SlideDefinition {
  return {
    semanticId: "ceph_profile_overlay",
    size: GATE_1_SLIDE_SIZE,
    backgroundColor: COLORS.black,
    speakerNotes: [],
    elements: [
      image("profile-layer", "fixture-synthetic-profile", input.profileAssetPath, 900, 900, { xPt: 100, yPt: 44, widthPt: 468, heightPt: 468 }, 1, {
        placement: "crop",
        crop: { left: 0.03, top: 0.03, right: 0.03, bottom: 0.03 },
        transform: input.profileTransform,
      }),
      image("ceph-layer", "fixture-synthetic-ceph", input.cephAssetPath, 900, 900, { xPt: 144, yPt: 58, widthPt: 461, heightPt: 432 }, 2, {
        placement: "crop",
        crop: { left: 0.04, top: 0.068894, right: 0.04, bottom: 0.068894 },
        transform: input.cephTransform,
      }),
    ],
  };
}

function verticalCell(value: string, options: { header?: boolean; highlight?: "high" | "low" | "none"; align?: "left" | "center" } = {}): TableCell {
  const highlight = options.highlight ?? "none";
  return {
    text: value,
    style: {
      ...bodyStyle,
      fontSizePt: options.header === true ? 12 : 11,
      minFontSizePt: 9,
      bold: options.header === true,
      horizontalAlignment: options.align ?? "center",
      marginPt: [2, 3, 2, 3],
      color: highlight === "high" ? COLORS.orange : highlight === "low" ? COLORS.cyan : COLORS.white,
    },
    fillColor: COLORS.black,
    borderColor: COLORS.tableLine,
  };
}

export function createVerticalSlide(input: CephVerticalInput): SlideDefinition {
  const tableRows: readonly (readonly TableCell[])[] = [
    [verticalCell("Measurement", { header: true, align: "left" }), verticalCell("Reference", { header: true }), verticalCell("T0", { header: true })],
    ...input.rows.map((row) => [
      verticalCell(row.label, { align: "left" }),
      verticalCell(row.reference),
      verticalCell(row.value, row.highlight === undefined ? {} : { highlight: row.highlight }),
    ]),
  ];
  const rowHeights = [38.25, 24.29, 24.29, 24.29, 24.29, 24.29, 24.29, 24.29, 24.29, 24.29, 30.59, 58.47, 24.29, 24.29, 24.29, 24.29, 24.29, 24.29];
  if (tableRows.length !== rowHeights.length) {
    throw new Error(`ceph_vertical requires ${rowHeights.length - 1} measurement rows; received ${input.rows.length}.`);
  }
  const tableHeight = rowHeights.reduce((sum, height) => sum + height, 0);
  return {
    semanticId: "ceph_vertical",
    size: GATE_1_SLIDE_SIZE,
    backgroundColor: COLORS.black,
    speakerNotes: input.speakerNotes,
    elements: [
      image("vertical-ceph", "fixture-vertical-ceph", input.cephAssetPath, 900, 900, { xPt: 3, yPt: 118, widthPt: 334, heightPt: 303 }, 1, {
        placement: "cover",
        crop: { left: 0.045, top: 0.035, right: 0.045, bottom: 0.035 },
      }),
      {
        kind: "table",
        id: "vertical-measurements",
        bounds: { xPt: 341, yPt: 11, widthPt: 365, heightPt: tableHeight },
        zIndex: 5,
        columnWidthsPt: [195.58, 86.29, 83.13],
        rowHeightsPt: rowHeights,
        rows: tableRows,
        overflowPolicy: "report",
      },
      text("growth-pattern", { xPt: 14, yPt: 502, widthPt: 692, heightPt: 36 }, input.growthPattern, 10, {
        ...bodyStyle,
        fontSizePt: 13,
        minFontSizePt: 11,
        color: COLORS.gold,
        bold: true,
        verticalAlignment: "top",
      }),
    ],
  };
}

function planCell(value: string, options: { header?: boolean; number?: boolean; alternate?: boolean } = {}): TableCell {
  return {
    text: value,
    style: {
      ...bodyStyle,
      fontSizePt: options.header === true ? 13 : 12,
      minFontSizePt: 10,
      color: options.header === true ? COLORS.white : COLORS.black,
      bold: options.header === true || options.number === true,
      horizontalAlignment: options.number === true ? "center" : "left",
      verticalAlignment: "middle",
      marginPt: [4, 5, 4, 5],
    },
    fillColor: options.header === true ? COLORS.planHeader : options.alternate === true ? COLORS.planRowB : COLORS.planRowA,
    borderColor: COLORS.white,
  };
}

export function createProblemGoalPlanSlide(input: ProblemGoalPlanInput): SlideDefinition {
  const rows = input.rows.slice(0, 5);
  const populated = [...rows];
  while (populated.length < 5) {
    populated.push({ problem: "", goal: "", plan: "" });
  }
  return {
    semanticId: "problem_goal_plan",
    size: GATE_1_SLIDE_SIZE,
    backgroundColor: COLORS.black,
    speakerNotes: [],
    elements: [
      {
        kind: "table",
        id: "problem-goal-plan-table",
        bounds: { xPt: 0, yPt: 66, widthPt: 720, heightPt: 474 },
        zIndex: 1,
        columnWidthsPt: [63.87, 226.49, 234.07, 195.57],
        rowHeightsPt: [34, 88, 88, 88, 88, 88],
        rows: [
          [planCell("#", { header: true }), planCell("Problem", { header: true }), planCell("Goal", { header: true }), planCell("Plan", { header: true })],
          ...populated.map((row, index) => [
            planCell(String(index + 1), { number: true, alternate: index % 2 === 1 }),
            planCell(row.problem, { alternate: index % 2 === 1 }),
            planCell(row.goal, { alternate: index % 2 === 1 }),
            planCell(row.plan, { alternate: index % 2 === 1 }),
          ]),
        ],
        overflowPolicy: "report",
      },
    ],
  };
}

export interface Gate1DocumentInputs {
  readonly dental: DentalFrontalComparisonInput;
  readonly overlay: CephProfileOverlayInput;
  readonly vertical: CephVerticalInput;
  readonly plan: ProblemGoalPlanInput;
}

export function createGate1Document(inputs: Gate1DocumentInputs): SlideDocument {
  return {
    schemaVersion: 1,
    slides: [
      createDentalSlide(inputs.dental),
      createOverlaySlide(inputs.overlay),
      createVerticalSlide(inputs.vertical),
      createProblemGoalPlanSlide(inputs.plan),
    ],
  };
}
