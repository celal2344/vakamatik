import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { beforeAll, describe, expect, test } from "vitest";

const root = resolve(import.meta.dirname, "../..");
const pptx = resolve(root, "artifacts/gate-1/gate-1-spike.pptx");
const reportPath = join(tmpdir(), `vakamatik-structure-report-${process.pid}.json`);

interface StructuralReport {
  passed: boolean;
  checks: Array<{ id: string; passed: boolean; detail: string }>;
  slides: Array<{
    semanticId: string;
    nativeTextShapeCount: number;
    nativeTableCount: number;
    hasSpeakerNotes: boolean;
    images: Array<{ name: string; rotationUnits: number; opacityAmount: number; hasCrop: boolean }>;
  }>;
}

describe("generated Gate 1 PPTX structure", () => {
  let report: StructuralReport;

  beforeAll(() => {
    execFileSync("dotnet", ["run", "--project", "tools/pptx-validator/PptxValidator.csproj", "--", pptx, reportPath], {
      cwd: root,
      env: { ...process.env, BaseOutputPath: `${join(tmpdir(), "vakamatik-dotnet")}${sep}` },
      stdio: "pipe",
      encoding: "utf8",
    });
    report = JSON.parse(readFileSync(reportPath, "utf8")) as StructuralReport;
  }, 120_000);

  test("passes the independent Open XML validator", () => {
    expect(report.passed).toBe(true);
    expect(report.checks.filter((check) => !check.passed)).toEqual([]);
  });

  test("retains native text, tables, notes, and image transforms", () => {
    expect(report.slides).toHaveLength(4);
    expect(report.slides[0]?.nativeTextShapeCount).toBeGreaterThan(0);
    expect(report.slides[1]?.nativeTextShapeCount).toBe(0);
    expect(report.slides[2]?.nativeTextShapeCount).toBeGreaterThan(0);
    expect(report.slides[3]?.nativeTextShapeCount).toBe(0);
    expect(report.slides[2]?.nativeTableCount).toBeGreaterThan(0);
    expect(report.slides[3]?.nativeTableCount).toBeGreaterThan(0);
    expect(report.slides[0]?.hasSpeakerNotes).toBe(false);
    expect(report.slides[1]?.hasSpeakerNotes).toBe(false);
    expect(report.slides[2]?.hasSpeakerNotes).toBe(true);
    expect(report.slides[3]?.hasSpeakerNotes).toBe(false);
    const overlayImages = report.slides[1]?.images ?? [];
    expect(overlayImages).toHaveLength(2);
    expect(overlayImages.every((image) => image.hasCrop)).toBe(true);
    expect(overlayImages.some((image) => image.rotationUnits !== 0)).toBe(true);
    expect(overlayImages.some((image) => image.opacityAmount > 0 && image.opacityAmount < 100_000)).toBe(true);
  });
});
