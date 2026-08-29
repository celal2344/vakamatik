import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

const root = resolve(import.meta.dirname, "../..");
const pptx = resolve(root, "artifacts/gate-1/gate-1-spike.pptx");
const reportPath = resolve(root, "artifacts/gate-1/validation/structure-report.json");

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
  test("passes the independent Open XML validator", () => {
    execFileSync("dotnet", ["run", "--project", "tools/pptx-validator/PptxValidator.csproj", "--", pptx, reportPath], {
      cwd: root,
      stdio: "pipe",
      encoding: "utf8",
    });
    const report = JSON.parse(readFileSync(reportPath, "utf8")) as StructuralReport;
    expect(report.passed).toBe(true);
    expect(report.checks.filter((check) => !check.passed)).toEqual([]);
  }, 120_000);

  test("retains native text, tables, notes, and image transforms", () => {
    const report = JSON.parse(readFileSync(reportPath, "utf8")) as StructuralReport;
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
