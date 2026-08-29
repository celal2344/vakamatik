import { fileURLToPath } from "node:url";
import type {
  CephProfileOverlayInput,
  CephVerticalInput,
  DentalFrontalComparisonInput,
  ProblemGoalPlanInput,
} from "@vakamatik/export-contract";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
export const fixtureAssetDirectory = fileURLToPath(new URL("../assets/", import.meta.url));

export const fixtureAssetPaths = {
  dentalIntraoral: fileURLToPath(new URL("../assets/dental-intraoral.png", import.meta.url)),
  dentalModel: fileURLToPath(new URL("../assets/dental-model.png", import.meta.url)),
  frontalBoard: fileURLToPath(new URL("../assets/frontal-board.jpg", import.meta.url)),
  syntheticProfile: fileURLToPath(new URL("../assets/synthetic-profile.png", import.meta.url)),
  syntheticCeph: fileURLToPath(new URL("../assets/synthetic-ceph.png", import.meta.url)),
  verticalCeph: fileURLToPath(new URL("../assets/vertical-ceph.png", import.meta.url)),
} as const;

export const gate1DentalInput: DentalFrontalComparisonInput = {
  measurements: {
    upperMidline: "ÜOH: +1.0 mm sağ",
    lowerMidline: "AOH: −0.5 mm sol",
    overjetMm: 2.5,
    overbiteMm: 3,
  },
  intraoralAssetPath: fixtureAssetPaths.dentalIntraoral,
  modelAssetPath: fixtureAssetPaths.dentalModel,
  faceAssetPath: fixtureAssetPaths.frontalBoard,
};

export const gate1OverlayInput: CephProfileOverlayInput = {
  profileAssetPath: fixtureAssetPaths.syntheticProfile,
  cephAssetPath: fixtureAssetPaths.syntheticCeph,
  profileTransform: {
    translationXPt: 3.5,
    translationYPt: -2,
    uniformScale: 1.015,
    rotationDeg: 0.75,
    opacity: 0.62,
  },
  cephTransform: {
    translationXPt: -4,
    translationYPt: 2.5,
    uniformScale: 0.985,
    rotationDeg: -4.3,
    opacity: 0.78,
  },
};

export const gate1VerticalInput: CephVerticalInput = {
  cephAssetPath: fixtureAssetPaths.verticalCeph,
  rows: [
    { label: "SN–GoGn", reference: "32 ± 5°", value: "+36.5°", highlight: "high" },
    { label: "Saddle angle", reference: "123 ± 5°", value: "+124.0°", highlight: "none" },
    { label: "Articular angle", reference: "143 ± 6°", value: "+141.0°", highlight: "none" },
    { label: "Gonial angle", reference: "130 ± 7°", value: "+137.5°", highlight: "high" },
    { label: "Inner-angle sum", reference: "396 ± 3°", value: "+397.0°", highlight: "none" },
    { label: "Jarabak", reference: "59–63%", value: "−58.5%", highlight: "low" },
    { label: "ANS–Me / N–Me", reference: "55 ± 0.1%", value: "+55.2%", highlight: "none" },
    { label: "Maxillary height", reference: "60 ± 3°", value: "+61.0°", highlight: "none" },
    { label: "Facial axis", reference: "90 ± 3.5°", value: "+89.5°", highlight: "none" },
    { label: "S–Ar / Ar–Go", reference: "75 ± 10%", value: "+78.0%", highlight: "none" },
    { label: "Gonial ratio", reference: "75%; 54.5/70.6", value: "+76%; 55/72", highlight: "high" },
    { label: "FMA", reference: "25 ± 4.5°", value: "+29.0°", highlight: "none" },
    { label: "Y-axis", reference: "59.4 ± 5.5°", value: "+61.0°", highlight: "none" },
    { label: "Occlusal plane / SN", reference: "14.4 ± 2.5°", value: "+15.0°", highlight: "none" },
    { label: "Occlusal / mandibular", reference: "17.6 ± 5°", value: "+18.0°", highlight: "none" },
    { label: "Palatal plane / SN", reference: "7 ± 5°", value: "+6.5°", highlight: "none" },
    { label: "Palatal / mandibular", reference: "26°", value: "+27.0°", highlight: "none" },
  ],
  growthPattern: "Synthetic interpretation: mild vertical growth pattern.",
  speakerNotes: [
    "Gate 1 synthetic fixture only.",
    "Verify native table editing, notes placement, crop, and alignment after reopen.",
  ],
};

export const shortProblemGoalPlanInput: ProblemGoalPlanInput = {
  rows: [
    { problem: "Synthetic crowding marker", goal: "Align grid", plan: "Use guide A" },
    { problem: "Synthetic midline offset", goal: "Center marker", plan: "Translate 1 unit" },
  ],
};

export const mediumProblemGoalPlanInput: ProblemGoalPlanInput = {
  rows: [
    {
      problem: "Synthetic upper grid shows a moderate alignment discrepancy across two reference columns.",
      goal: "Center the synthetic reference markers while preserving the intended spacing.",
      plan: "Use staged guide alignment and confirm the result against the center line at each checkpoint.",
    },
    {
      problem: "Synthetic lower grid has a small rotational discrepancy relative to the reference axis.",
      goal: "Make the lower guide parallel to the horizontal reference line.",
      plan: "Apply a controlled fractional rotation, then recheck translation and scale.",
    },
    {
      problem: "Synthetic overlay markers do not initially coincide.",
      goal: "Superimpose all primary markers without changing the aspect ratio.",
      plan: "Adjust uniform scale and translation; preserve the locked aspect ratio.",
    },
    {
      problem: "Synthetic crop boundary includes excess background.",
      goal: "Keep all crop markers visible and remove unused margin.",
      plan: "Apply a symmetric crop and verify each corner marker remains visible.",
    },
    {
      problem: "Synthetic text block approaches the approved readable limit.",
      goal: "Preserve legibility and avoid clipping.",
      plan: "Report overflow before export instead of silently shrinking the text.",
    },
  ],
};

const excessiveText =
  "INTENTIONAL OVERFLOW FIXTURE — This repeated synthetic sentence verifies deterministic cell-height validation and must be rejected before export. ".repeat(12);

export const excessiveProblemGoalPlanInput: ProblemGoalPlanInput = {
  rows: [
    { problem: excessiveText, goal: "Short synthetic goal", plan: "Short synthetic plan" },
  ],
};

export const fixturePackageRoot = packageRoot;
