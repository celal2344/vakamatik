import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  acknowledgeManagedCaseWarnings,
  createManagedCase,
  openManagedCase,
  updateManagedCaseAlignment,
  updateManagedCaseClinical,
} from "../../packages/case-store/src/index.js";
import {
  CEPH_MEASUREMENTS,
  DEFAULT_CLINICAL_DATA,
  DEFAULT_PRESENTATION_SETTINGS,
  type ClinicalData,
} from "../../packages/domain/src/index.js";
import {
  buildPresentationDocument,
  defaultLinkGroupForImage,
  hasUnacknowledgedPresentationWarnings,
  presentationWarningKey,
  type PresentationAsset,
  type PresentationAssetKey,
} from "../../packages/layout-engine/src/index.js";
import { PptxGenJsExporter } from "../../packages/pptx-exporter/src/pptxgenjs-exporter.js";
import { renderPresentationPreviews } from "../../packages/preview/src/index.js";
import { fixtureAssetPaths } from "../../packages/test-fixtures/src/index.js";

const root = path.resolve(import.meta.dirname, "../..");
let temporaryDirectory = "";
const asset = (assetId: string, filePath: string, widthPx: number, heightPx: number): PresentationAsset => ({
  assetId,
  filePath,
  widthPx,
  heightPx,
});
const portrait = asset("synthetic-clinical-portrait", fixtureAssetPaths.frontalBoard, 750, 1_000);
const dental = asset("synthetic-clinical-dental", fixtureAssetPaths.dentalIntraoral, 1_200, 675);
const ceph = asset("synthetic-clinical-ceph", fixtureAssetPaths.syntheticCeph, 900, 900);
const traced = asset("synthetic-clinical-tracing", fixtureAssetPaths.verticalCeph, 900, 900);
const assets: Readonly<Partial<Record<PresentationAssetKey, PresentationAsset>>> = {
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
  model_front: dental,
  model_right: dental,
  model_left: dental,
  model_upper_occlusal: dental,
  model_lower_occlusal: dental,
  cervical_image: ceph,
  panoramic_xray: dental,
  lateral_ceph: ceph,
  traced_ceph: traced,
};

function completeClinical(): ClinicalData {
  const clinical = structuredClone(DEFAULT_CLINICAL_DATA);
  clinical.patient = {
    ...clinical.patient,
    patientName: "Synthetic Patient",
    dateOfBirth: "2010-01-01",
    patientAssignmentDate: "2026-08-01",
    recordsDate: "2026-08-15",
    treatingDoctor: "Synthetic Clinician",
    chiefComplaint: "Synthetic concern",
    casePresentationDate: "2026-08-30",
  };
  clinical.findings = {
    ...clinical.findings,
    facialSymmetry: "Symmetric",
    smileLine: "Normal",
    upperIncisorDisplay: "Adequate",
    softTissueProfile: "Straight",
    upperMidline: "Centered",
    lowerMidline: "Centered",
    overjetMm: 2.5,
    overbiteMm: 2,
    rightMolarRelationship: "Class I",
    leftMolarRelationship: "Class I",
    rightCanineRelationship: "Class I",
    leftCanineRelationship: "Class I",
    missingTeethFinding: "None",
    restorativeFinding: "None",
    tmjFinding: "No synthetic finding",
  };
  clinical.hn = {
    upperTotal: -2,
    upperRight: -1,
    upperLeft: -1,
    lowerRight: 0.5,
    lowerLeft: 0.5,
    lowerTotal: 1,
  };
  clinical.bolton = {
    anterior: { status: "calculable", affectedArch: "upper", discrepancyMm: 1.2 },
    overall: { status: "calculable", affectedArch: "lower", discrepancyMm: -0.8 },
  };
  for (const [key] of CEPH_MEASUREMENTS) clinical.measurements[key] = "1.0";
  for (const key of Object.keys(clinical.interpretations) as (keyof ClinicalData["interpretations"])[])
    clinical.interpretations[key] = { text: `Clinician-authored ${key}`, approved: true };
  clinical.problemGoalPlan = [
    { problem: "Synthetic problem", goal: "Synthetic goal", plan: "Synthetic plan" },
  ];
  clinical.decision = { ownerTitle: "Synthetic decision", bullets: ["Proceed with synthetic plan"] };
  clinical.notes = {
    caseNote: "Synthetic case note",
    bySlide: { ceph_vertical: "Synthetic vertical note" },
    exportSpeakerNotes: true,
  };
  return clinical;
}

function textValues(
  document: ReturnType<typeof buildPresentationDocument>["document"],
  semanticId: string,
): string[] {
  return (
    document.slides
      .find((slide) => slide.semanticId === semanticId)
      ?.elements.flatMap((element) =>
        element.kind === "text"
          ? [element.text]
          : element.kind === "table"
            ? element.rows.flatMap((row) => row.map((cell) => cell.text))
            : [],
      ) ?? []
  );
}

beforeAll(async () => {
  temporaryDirectory = await mkdtemp(path.join(tmpdir(), "vakamatik-gate5-"));
});
afterAll(async () => {
  await rm(temporaryDirectory, { recursive: true, force: true });
});

describe("Gate 5 clinical editing", () => {
  it("keeps repeated clinical fields consistent across bound slides", () => {
    const clinical = completeClinical();
    const built = buildPresentationDocument({ title: "Synthetic", assets, clinical });
    for (const id of ["occlusal_photos_space_analysis", "models_space_analysis"]) {
      expect(textValues(built.document, id).join(" ")).toContain("HN üst: -2 mm");
      expect(textValues(built.document, id).join(" ")).toContain("Bolton anterior: 1.2 mm");
    }
  });

  it("persists clinical edits and warning acknowledgements through reopen", async () => {
    const cases = path.join(temporaryDirectory, "cases");
    await import("node:fs/promises").then(({ mkdir }) => mkdir(cases, { recursive: true }));
    const created = await createManagedCase(cases, "Synthetic Persisted Clinical Case");
    const saved = await updateManagedCaseClinical(
      created,
      0,
      completeClinical(),
      DEFAULT_PRESENTATION_SETTINGS,
    );
    const built = buildPresentationDocument({
      title: saved.document.title,
      assets: {},
      clinical: saved.document.clinical,
    });
    const keys = built.warnings.map(presentationWarningKey);
    expect(keys.length).toBeGreaterThan(0);
    expect(hasUnacknowledgedPresentationWarnings(built.warnings, [])).toBe(true);
    const acknowledged = await acknowledgeManagedCaseWarnings(saved, 1, keys);
    const reopened = await openManagedCase(acknowledged.root);
    expect(reopened.document.clinical.patient.patientName).toBe("Synthetic Patient");
    expect(reopened.document.presentation.acknowledgedWarningKeys).toEqual([...new Set(keys)].sort());
    expect(
      hasUnacknowledgedPresentationWarnings(
        built.warnings,
        reopened.document.presentation.acknowledgedWarningKeys,
      ),
    ).toBe(false);
    expect(textValues(built.document, "case_overview").join(" ")).toContain("Synthetic Patient");
  });

  it("propagates linked ceph transforms while detached instances remain independent", async () => {
    const linked = {
      translationXPt: 12,
      translationYPt: -4,
      uniformScale: 1.08,
      rotationDeg: 0.4,
      opacity: 0.9,
      crop: { left: 0.01, top: 0, right: 0, bottom: 0 },
    };
    const detached = { ...linked, translationXPt: 44, crop: { ...linked.crop } };
    const alignment = {
      groups: { "ceph-shared": linked },
      instances: { "ceph_vertical-lateral_ceph": { linkGroup: null, transform: detached } },
    };
    const built = buildPresentationDocument({
      title: "Synthetic Alignment",
      assets,
      clinical: completeClinical(),
      alignment,
    });
    const image = (id: string) =>
      built.document.slides
        .find((slide) => slide.semanticId === id)
        ?.elements.find((element) => element.kind === "image" && element.source.assetId === ceph.assetId);
    for (const id of ["ceph_lateral", "ceph_sagittal", "ceph_incisor", "ceph_soft_tissue"] as const) {
      expect(image(id)?.kind === "image" ? image(id).transform.translationXPt : null).toBe(12);
    }
    expect(
      image("ceph_vertical")?.kind === "image" ? image("ceph_vertical").transform.translationXPt : null,
    ).toBe(44);
    expect(defaultLinkGroupForImage("ceph_profile_overlay-lateral_ceph")).toBeNull();
    expect(defaultLinkGroupForImage("ceph_profile_overlay-face_profile_rest")).toBeNull();

    const cases = path.join(temporaryDirectory, "alignment-cases");
    await import("node:fs/promises").then(({ mkdir }) => mkdir(cases, { recursive: true }));
    const created = await createManagedCase(cases, "Synthetic Alignment Persistence");
    const saved = await updateManagedCaseAlignment(created, 0, alignment);
    expect((await openManagedCase(saved.root)).document.alignment).toEqual(alignment);
  });

  it("exports clinician notes to their intended slides", () => {
    const built = buildPresentationDocument({
      title: "Synthetic Notes",
      assets,
      clinical: completeClinical(),
    });
    expect(
      built.document.slides.find((slide) => slide.semanticId === "case_overview")?.speakerNotes,
    ).toContain("Synthetic case note");
    expect(
      built.document.slides.find((slide) => slide.semanticId === "ceph_vertical")?.speakerNotes,
    ).toContain("Synthetic vertical note");
    expect(built.document.slides.find((slide) => slide.semanticId === "ceph_sagittal")?.speakerNotes).toEqual(
      [],
    );
  });

  it("previews and structurally validates one complete synthetic clinical export", async () => {
    const built = buildPresentationDocument({
      title: "Synthetic Complete Clinical",
      assets,
      clinical: completeClinical(),
    });
    expect(built.warnings).toEqual([]);
    expect(await renderPresentationPreviews(built.document)).toHaveLength(30);
    const outputPath = path.join(temporaryDirectory, "synthetic-gate-5.pptx");
    const reportPath = path.join(temporaryDirectory, "synthetic-gate-5.validation.json");
    const result = await new PptxGenJsExporter().export(built.document, outputPath);
    expect(result.validation.ok).toBe(true);
    execFileSync(
      "dotnet",
      [
        "run",
        "--project",
        "tools/pptx-validator/PptxValidator.csproj",
        "--",
        outputPath,
        reportPath,
        built.document.slides.map((slide) => slide.semanticId).join(","),
      ],
      {
        cwd: root,
        env: { ...process.env, BaseOutputPath: `${path.join(tmpdir(), "vakamatik-dotnet")}${path.sep}` },
        stdio: "pipe",
      },
    );
    const report = JSON.parse(await readFile(reportPath, "utf8")) as { passed: boolean };
    expect(report.passed).toBe(true);
  }, 120_000);
});
