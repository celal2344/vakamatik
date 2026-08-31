import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, test, vi } from "vitest";
import {
  acknowledgeManagedCaseWarnings,
  assignImportedImage,
  createManagedCase,
  openManagedCase,
  relinkMissingManagedAsset,
  updateManagedCaseAlignment,
  updateManagedCaseClinical,
} from "../../packages/case-store/src/index.js";
import {
  CEPH_MEASUREMENTS,
  DEFAULT_CLINICAL_DATA,
  DEFAULT_PRESENTATION_SETTINGS,
  RECORD_SLOTS,
  type ClinicalData,
  type RecordSlotId,
} from "../../packages/domain/src/index.js";
import { CANONICAL_SLIDE_ORDER } from "../../packages/export-contract/src/index.js";
import {
  buildPresentationDocument,
  hasUnacknowledgedPresentationWarnings,
  presentationWarningKey,
  type PresentationAsset,
  type PresentationAssetKey,
} from "../../packages/layout-engine/src/index.js";
import { resolveManagedRelativePath } from "../../packages/media/src/index.js";
import { PptxGenJsExporter } from "../../packages/pptx-exporter/src/pptxgenjs-exporter.js";
import { renderPresentationPreviews } from "../../packages/preview/src/index.js";
import { fixtureAssetPaths } from "../../packages/test-fixtures/src/index.js";
import { CaseSessionRegistry } from "../../apps/desktop/src/main/session-registry.js";
import { flushBeforeTransition } from "../../apps/desktop/src/renderer/workspace-save.js";

const repositoryRoot = path.resolve(import.meta.dirname, "../..");
const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { force: true, recursive: true })));
});

function completeClinical(): ClinicalData {
  const clinical = structuredClone(DEFAULT_CLINICAL_DATA);
  clinical.patient = {
    ...clinical.patient,
    patientName: "Synthetic Pilot Case",
    dateOfBirth: "2010-01-01",
    patientAssignmentDate: "2026-08-01",
    recordsDate: "2026-08-15",
    casePresentationDate: "2026-08-31",
    treatingDoctor: "Synthetic Clinician",
    chiefComplaint: "Synthetic concern",
  };
  clinical.findings = {
    ...clinical.findings,
    facialSymmetry: "Symmetric",
    smileLine: "Normal",
    upperIncisorDisplay: "Adequate",
    softTissueProfile: "Straight",
    cervicalMaturationStage: "Synthetic stage",
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
  for (const key of Object.keys(clinical.interpretations) as (keyof ClinicalData["interpretations"])[]) {
    clinical.interpretations[key] = { text: `Clinician-authored ${key}`, approved: true };
  }
  clinical.problemGoalPlan = [
    { problem: "Synthetic problem", goal: "Synthetic goal", plan: "Synthetic treatment plan" },
  ];
  clinical.decision = { ownerTitle: "Synthetic decision", bullets: ["Proceed with synthetic plan"] };
  clinical.icon = {
    rows: [{ label: "Synthetic ICON component", rawScore: "1", weight: "7", result: "7" }],
    total: "7",
  };
  clinical.notes = {
    caseNote: "Synthetic case note",
    bySlide: { ceph_vertical: "Synthetic vertical note" },
    exportSpeakerNotes: true,
  };
  return clinical;
}

function fixtureForSlot(slotId: RecordSlotId): string {
  if (slotId.startsWith("face_") || slotId.startsWith("retractor_") || slotId === "patient_video") {
    return fixtureAssetPaths.frontalBoard;
  }
  if (slotId.startsWith("model_") || slotId.startsWith("inferior_model_")) {
    return fixtureAssetPaths.dentalModel;
  }
  if (slotId.startsWith("intraoral_") || slotId.startsWith("inferior_intraoral_")) {
    return fixtureAssetPaths.dentalIntraoral;
  }
  if (slotId === "lateral_ceph") return fixtureAssetPaths.syntheticCeph;
  if (slotId === "traced_ceph" || slotId === "space_analysis_worksheet") {
    return fixtureAssetPaths.verticalCeph;
  }
  return fixtureAssetPaths.dentalIntraoral;
}

async function presentationAssets(
  opened: Awaited<ReturnType<typeof openManagedCase>>,
): Promise<Partial<Record<PresentationAssetKey, PresentationAsset>>> {
  const entries = await Promise.all(
    Object.entries(opened.document.assignments).map(async ([slotId, assetId]) => {
      const asset = opened.document.assets[assetId];
      if (asset === undefined) throw new Error("Synthetic assignment references a missing asset.");
      return [
        slotId,
        {
          assetId,
          filePath: await resolveManagedRelativePath(opened.root, asset.normalizedRelativePath, {
            mustExist: true,
          }),
          widthPx: asset.width,
          heightPx: asset.height,
        },
      ] as const;
    }),
  );
  return Object.fromEntries(entries) as Partial<Record<PresentationAssetKey, PresentationAsset>>;
}

function slideText(
  document: ReturnType<typeof buildPresentationDocument>["document"],
  semanticId: string,
): string {
  return (
    document.slides
      .find((slide) => slide.semanticId === semanticId)
      ?.elements.flatMap((element) =>
        element.kind === "text"
          ? [element.text]
          : element.kind === "table"
            ? element.rows.flatMap((row) => row.map((cell) => cell.text))
            : [],
      )
      .join(" ") ?? ""
  );
}

describe("Gate 6 pilot readiness", () => {
  test("completes the synthetic case workflow through restart, acknowledgement, preview, and export", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "vakamatik-gate6-workflow-"));
    temporaryRoots.push(root);
    const casesRoot = path.join(root, "cases");
    await mkdir(casesRoot);
    let opened = await createManagedCase(casesRoot, "Synthetic Pilot Workflow");

    for (const slot of RECORD_SLOTS) {
      if (slot.id === "face_three_quarter_smile") continue;
      opened = await assignImportedImage(opened, opened.document.revision, slot.id, fixtureForSlot(slot.id));
    }
    opened = await updateManagedCaseClinical(
      opened,
      opened.document.revision,
      completeClinical(),
      DEFAULT_PRESENTATION_SETTINGS,
    );
    const sharedCeph = {
      translationXPt: 6.5,
      translationYPt: -2,
      uniformScale: 1,
      rotationDeg: 0.4,
      opacity: 0.9,
      crop: { left: 0.02, top: 0.01, right: 0.02, bottom: 0.01 },
    };
    opened = await updateManagedCaseAlignment(opened, opened.document.revision, {
      groups: { "ceph-shared": sharedCeph },
      instances: {
        "ceph_profile_overlay-lateral_ceph": {
          linkGroup: null,
          transform: { ...sharedCeph, translationXPt: 3, rotationDeg: 1.25, opacity: 0.5 },
        },
      },
    });

    const registry = new CaseSessionRegistry(path.join(root, "user-data"));
    const now = new Date().toISOString();
    await registry.register(opened.root, {
      caseId: opened.document.caseId,
      revision: opened.document.revision,
      title: opened.document.title,
      folderName: path.basename(opened.root),
      createdAt: opened.document.createdAt,
      updatedAt: now,
      assets: {},
      assignments: opened.document.assignments,
      clinical: opened.document.clinical,
      presentation: opened.document.presentation,
      alignment: opened.document.alignment,
    });
    await registry.saveUiState(opened.document.caseId, {
      tab: "presentation",
      recordFilter: "all",
      selectedRecordSlotId: "face_front_rest",
      clinicalSection: "ceph",
      selectedSlideId: "ceph_profile_overlay",
      selectedLayerId: "ceph_profile_overlay-lateral_ceph",
    });

    opened = await openManagedCase(opened.root);
    expect(opened.document.clinical.patient.patientName).toBe("Synthetic Pilot Case");
    expect(opened.document.alignment.groups["ceph-shared"]).toEqual(sharedCeph);
    expect((await new CaseSessionRegistry(path.join(root, "user-data")).list())[0]?.uiState).toMatchObject({
      tab: "presentation",
      selectedSlideId: "ceph_profile_overlay",
    });

    const assets = await presentationAssets(opened);
    let built = buildPresentationDocument({
      title: opened.document.title,
      assets,
      clinical: opened.document.clinical,
      alignment: opened.document.alignment,
      options: { slide8Behavior: opened.document.presentation.slide8Behavior },
    });
    expect(built.warnings.some((warning) => warning.targetKey === "face_three_quarter_smile")).toBe(true);
    expect(hasUnacknowledgedPresentationWarnings(built.warnings, [])).toBe(true);
    const warningKeys = built.warnings.map(presentationWarningKey);
    opened = await acknowledgeManagedCaseWarnings(opened, opened.document.revision, warningKeys);
    expect(
      hasUnacknowledgedPresentationWarnings(
        built.warnings,
        (await openManagedCase(opened.root)).document.presentation.acknowledgedWarningKeys,
      ),
    ).toBe(false);

    built = buildPresentationDocument({
      title: opened.document.title,
      assets,
      clinical: opened.document.clinical,
      alignment: opened.document.alignment,
    });
    expect(built.document.slides.map((slide) => slide.semanticId)).toEqual(CANONICAL_SLIDE_ORDER);
    expect(await renderPresentationPreviews(built.document)).toHaveLength(35);
    for (const optionalId of [
      "inferior_comparison",
      "patient_video",
      "tmj_review",
      "icon_index",
      "space_analysis_worksheet",
    ]) {
      expect(built.document.slides.some((slide) => slide.semanticId === optionalId)).toBe(true);
    }
    expect(slideText(built.document, "occlusal_photos_space_analysis")).toContain("HN üst: -2 mm");
    expect(slideText(built.document, "models_space_analysis")).toContain("HN üst: -2 mm");
    expect(
      built.document.slides.find((slide) => slide.semanticId === "case_overview")?.speakerNotes,
    ).toContain("Synthetic case note");
    expect(
      built.document.slides.find((slide) => slide.semanticId === "ceph_vertical")?.speakerNotes,
    ).toContain("Synthetic vertical note");
    const linkedCeph = built.document.slides
      .find((slide) => slide.semanticId === "ceph_sagittal")
      ?.elements.find((element) => element.kind === "image" && element.id.endsWith("lateral_ceph"));
    expect(linkedCeph?.kind === "image" ? linkedCeph.transform.translationXPt : null).toBe(6.5);
    const overlayCeph = built.document.slides
      .find((slide) => slide.semanticId === "ceph_profile_overlay")
      ?.elements.find((element) => element.kind === "image" && element.id.endsWith("lateral_ceph"));
    expect(overlayCeph?.kind === "image" ? overlayCeph.transform : null).toMatchObject({
      translationXPt: 3,
      rotationDeg: 1.25,
      opacity: 0.5,
    });

    const outputPath = path.join(root, "exports", "synthetic-pilot.pptx");
    const reportPath = path.join(root, "synthetic-pilot.validation.json");
    const exported = await new PptxGenJsExporter().export(built.document, outputPath);
    expect(exported.validation.ok).toBe(true);
    execFileSync(
      "dotnet",
      [
        "run",
        "--project",
        "tools/pptx-validator/PptxValidator.csproj",
        "--",
        outputPath,
        reportPath,
        CANONICAL_SLIDE_ORDER.join(","),
      ],
      {
        cwd: repositoryRoot,
        env: { ...process.env, BaseOutputPath: `${path.join(tmpdir(), "vakamatik-dotnet")}${path.sep}` },
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

  test("blocks corrupt cases and export failures", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "vakamatik-gate6-blocking-"));
    temporaryRoots.push(root);
    const casesRoot = path.join(root, "cases");
    await mkdir(casesRoot);
    const opened = await createManagedCase(casesRoot, "Synthetic Corrupt Case");
    await writeFile(path.join(opened.root, "case.json"), '{"schemaVersion":999}\n', "utf8");
    await expect(openManagedCase(opened.root)).rejects.toThrow();

    const blockedParent = path.join(root, "not-a-directory");
    await writeFile(blockedParent, "blocking file", "utf8");
    const built = buildPresentationDocument({ title: "Synthetic Export Failure", assets: {} });
    await expect(
      new PptxGenJsExporter().export(built.document, path.join(blockedParent, "blocked.pptx")),
    ).rejects.toThrow();
  });

  test("repairs a missing managed asset only from matching original bytes", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "vakamatik-gate6-repair-"));
    temporaryRoots.push(root);
    const casesRoot = path.join(root, "cases");
    await mkdir(casesRoot);
    let opened = await createManagedCase(casesRoot, "Synthetic Asset Repair");
    opened = await assignImportedImage(
      opened,
      opened.document.revision,
      "intraoral_front",
      fixtureAssetPaths.dentalIntraoral,
    );
    const assetId = opened.document.assignments.intraoral_front;
    if (assetId === undefined) throw new Error("Synthetic repair assignment was not created.");
    const asset = opened.document.assets[assetId];
    if (asset === undefined) throw new Error("Synthetic repair asset was not created.");
    await rm(
      await resolveManagedRelativePath(opened.root, asset.normalizedRelativePath, { mustExist: true }),
    );

    await expect(openManagedCase(opened.root)).rejects.toThrow();
    await expect(relinkMissingManagedAsset(opened.root, fixtureAssetPaths.frontalBoard)).rejects.toThrow(
      /does not match/u,
    );
    const repaired = await relinkMissingManagedAsset(opened.root, fixtureAssetPaths.dentalIntraoral);
    expect(repaired.remainingMissingAssetIds).toEqual([]);
    await expect(openManagedCase(opened.root)).resolves.toMatchObject({
      document: { caseId: opened.document.caseId },
    });
  });

  test("failed or rejected saves prevent workspace transitions", async () => {
    const rejected = vi.fn(async () => false);
    const crashed = vi.fn(async () => {
      throw new Error("synthetic save failure");
    });
    expect(await flushBeforeTransition(rejected)).toBe(false);
    expect(await flushBeforeTransition(crashed)).toBe(false);
    expect(await flushBeforeTransition(null)).toBe(true);
    expect(rejected).toHaveBeenCalledOnce();
    expect(crashed).toHaveBeenCalledOnce();
  });

  test("a moved complete case folder and its resumed session remain portable", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "vakamatik-gate6-portable-"));
    temporaryRoots.push(root);
    const casesRoot = path.join(root, "cases");
    const movedRoot = path.join(root, "relocated-case");
    const userData = path.join(root, "user-data");
    await mkdir(casesRoot);
    const opened = await createManagedCase(casesRoot, "Synthetic Relocated Session");
    const registry = new CaseSessionRegistry(userData);
    const now = new Date().toISOString();
    const view = {
      caseId: opened.document.caseId,
      revision: opened.document.revision,
      title: opened.document.title,
      folderName: path.basename(opened.root),
      createdAt: opened.document.createdAt,
      updatedAt: now,
      assets: {},
      assignments: {},
      clinical: opened.document.clinical,
      presentation: opened.document.presentation,
      alignment: opened.document.alignment,
    };
    await registry.register(opened.root, view);
    await rename(opened.root, movedRoot);
    expect((await registry.list())[0]?.available).toBe(false);
    const relocated = await openManagedCase(movedRoot);
    await registry.register(movedRoot, { ...view, folderName: path.basename(movedRoot) });
    expect((await registry.list())[0]?.available).toBe(true);
    expect(await registry.rootFor(relocated.document.caseId)).toBe(path.resolve(movedRoot));
  });
});
