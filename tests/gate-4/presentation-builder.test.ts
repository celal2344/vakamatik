import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  CANONICAL_SLIDE_ORDER,
  calculatePlacedImageBounds,
  type CanonicalSemanticSlideId,
} from "../../packages/export-contract/src/index.js";
import {
  buildPresentationDocument,
  type PresentationAsset,
  type PresentationAssetKey,
} from "../../packages/layout-engine/src/index.js";
import { PptxGenJsExporter } from "../../packages/pptx-exporter/src/pptxgenjs-exporter.js";
import { renderPresentationPreviews, renderSlideToSvg } from "../../packages/preview/src/index.js";
import { fixtureAssetPaths } from "../../packages/test-fixtures/src/index.js";

const root = path.resolve(import.meta.dirname, "../..");
let temporaryDirectory = "";

const asset = (assetId: string, filePath: string, widthPx: number, heightPx: number): PresentationAsset => ({
  assetId,
  filePath,
  widthPx,
  heightPx,
});

const portrait = asset("synthetic-portrait", fixtureAssetPaths.frontalBoard, 750, 1_000);
const dental = asset("synthetic-dental", fixtureAssetPaths.dentalIntraoral, 1_200, 675);
const model = asset("synthetic-model", fixtureAssetPaths.dentalModel, 1_200, 675);
const ceph = asset("synthetic-ceph", fixtureAssetPaths.syntheticCeph, 900, 900);
const traced = asset("synthetic-tracing", fixtureAssetPaths.verticalCeph, 900, 900);

const requiredAssets: Readonly<Partial<Record<PresentationAssetKey, PresentationAsset>>> = {
  face_front_rest: portrait,
  face_front_smile: portrait,
  face_profile_rest: portrait,
  face_profile_smile: portrait,
  face_three_quarter_rest: portrait,
  face_three_quarter_smile: portrait,
  retractor_front_1: portrait,
  retractor_front_2: portrait,
  intraoral_front: dental,
  intraoral_right: dental,
  intraoral_left: dental,
  intraoral_upper_occlusal: dental,
  intraoral_lower_occlusal: dental,
  model_front: model,
  model_right: model,
  model_left: model,
  model_upper_occlusal: model,
  model_lower_occlusal: model,
  cervical_image: ceph,
  panoramic_xray: dental,
  lateral_ceph: ceph,
  traced_ceph: traced,
};

const OPTIONAL_IDS = new Set<CanonicalSemanticSlideId>([
  "inferior_comparison",
  "patient_video",
  "tmj_review",
  "icon_index",
  "space_analysis_worksheet",
]);

beforeAll(async () => {
  temporaryDirectory = await mkdtemp(path.join(tmpdir(), "vakamatik-gate4-"));
});

afterAll(async () => {
  await rm(temporaryDirectory, { recursive: true, force: true });
});

describe("Gate 4 presentation builder", () => {
  it("keeps semantic slide IDs in stable canonical order", () => {
    const built = buildPresentationDocument({ title: "Synthetic Case 04", assets: requiredAssets });
    const expected = CANONICAL_SLIDE_ORDER.filter((id) => !OPTIONAL_IDS.has(id));
    expect(built.document.slides.map((slide) => slide.semanticId)).toEqual(expected);
    expect(built.document.slides).toHaveLength(30);
  });

  it("omits empty optional slides and respects the configured slide 8 behavior", () => {
    const built = buildPresentationDocument({
      title: "Synthetic Case 08",
      assets: {},
      options: { slide8Behavior: "omit-when-empty" },
    });
    expect(built.document.slides.map((slide) => slide.semanticId)).not.toContain("extraoral_retractor_pair");
    for (const id of OPTIONAL_IDS) {
      expect(built.document.slides.map((slide) => slide.semanticId)).not.toContain(id);
    }
  });

  it("includes populated optional slides at their canonical positions", () => {
    const optionalAssets: Partial<Record<PresentationAssetKey, PresentationAsset>> = {
      ...requiredAssets,
      inferior_intraoral_right: dental,
      patient_video: portrait,
      tmj_questionnaire: portrait,
      space_analysis_worksheet: traced,
    };
    const built = buildPresentationDocument({
      title: "Synthetic Optional Case",
      assets: optionalAssets,
      iconIndexRows: ["Synthetic component · 7"],
    });
    expect(built.document.slides.map((slide) => slide.semanticId)).toEqual(CANONICAL_SLIDE_ORDER);
  });

  it("uses the same calculated point geometry for preview and export", async () => {
    const built = buildPresentationDocument({ title: "Synthetic Geometry", assets: requiredAssets });
    const slide = built.document.slides.find(
      (candidate) => candidate.semanticId === "dental_frontal_comparison",
    );
    if (slide === undefined) throw new Error("Expected dental frontal slide.");
    const image = slide.elements.find((element) => element.kind === "image");
    if (image?.kind !== "image") throw new Error("Expected shared image element.");
    const bounds = calculatePlacedImageBounds(image);
    const svg = await renderSlideToSvg(slide);
    expect(svg).toContain(`data-bounds="${bounds.xPt},${bounds.yPt},${bounds.widthPt},${bounds.heightPt}"`);
    expect(image.bounds).toEqual({ xPt: 0, yPt: 0, widthPt: 442, heightPt: 249 });
  });

  it("previews and exports a synthetic case that passes structural validation", async () => {
    const built = buildPresentationDocument({ title: "Synthetic Full Deck", assets: requiredAssets });
    const previews = await renderPresentationPreviews(built.document);
    expect(previews).toHaveLength(30);
    expect(previews.every((preview) => preview.svgDataUrl.startsWith("data:image/svg+xml;base64,"))).toBe(
      true,
    );

    const outputPath = path.join(temporaryDirectory, "synthetic-gate-4.pptx");
    const reportPath = path.join(temporaryDirectory, "synthetic-gate-4.validation.json");
    const result = await new PptxGenJsExporter().export(built.document, outputPath);
    expect(result.validation).toEqual({ ok: true, overflow: [] });

    const expectedOrder = built.document.slides.map((slide) => slide.semanticId).join(",");
    execFileSync(
      "dotnet",
      [
        "run",
        "--project",
        "tools/pptx-validator/PptxValidator.csproj",
        "--",
        outputPath,
        reportPath,
        expectedOrder,
      ],
      {
        cwd: root,
        env: {
          ...process.env,
          BaseOutputPath: `${path.join(tmpdir(), "vakamatik-dotnet")}${path.sep}`,
        },
        stdio: "pipe",
      },
    );
    const report = JSON.parse(await readFile(reportPath, "utf8")) as {
      passed: boolean;
      checks: readonly { id: string; passed: boolean }[];
    };
    expect(report.passed).toBe(true);
    expect(report.checks.filter((check) => !check.passed)).toEqual([]);
  }, 120_000);
});
