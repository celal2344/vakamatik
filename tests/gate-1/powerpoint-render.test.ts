import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

const root = resolve(import.meta.dirname, "../..");
const pptx = resolve(root, "artifacts/gate-1/gate-1-spike.pptx");
const renderDirectory = resolve(root, "artifacts/gate-1/render-current");
const goldenDirectory = resolve(root, "artifacts/gate-1/goldens");
const renderEvidence = resolve(root, "artifacts/gate-1/validation/windows-render.json");
const visualEvidence = resolve(root, "artifacts/gate-1/validation/visual-regression.json");
const acceptanceEvidence = resolve(root, "artifacts/gate-1/validation/windows-powerpoint-acceptance.json");
const acceptanceDirectory = resolve(root, "artifacts/gate-1/validation/powerpoint-acceptance");

function powershell(script: string, args: string[], timeout = 180_000): void {
  execFileSync("powershell.exe", ["-NoLogo", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script, ...args], {
    cwd: root,
    stdio: "pipe",
    timeout,
  });
}

describe.sequential("same-environment PowerPoint rendering", () => {
  test("renders all four slides at the reference resolution without changing the PPTX", () => {
    powershell(resolve(root, "tools/powerpoint/Render-Pptx.ps1"), [
      "-InputPptx", pptx,
      "-OutputDirectory", renderDirectory,
      "-EvidencePath", renderEvidence,
    ]);
    const evidence = JSON.parse(readFileSync(renderEvidence, "utf8")) as {
      sourceUnchanged: boolean;
      slides: Array<{ semanticId: string; width: number; height: number; path: string }>;
    };
    expect(evidence.sourceUnchanged).toBe(true);
    expect(evidence.slides).toHaveLength(4);
    expect(evidence.slides.map((slide) => slide.semanticId)).toEqual([
      "dental_frontal_comparison",
      "ceph_profile_overlay",
      "ceph_vertical",
      "problem_goal_plan",
    ]);
    for (const slide of evidence.slides) {
      expect([slide.width, slide.height]).toEqual([1_440, 1_080]);
      expect(existsSync(slide.path)).toBe(true);
    }
  }, 180_000);

  test("matches inspected same-environment goldens within explicit thresholds", () => {
    powershell(resolve(root, "tools/powerpoint/Compare-RenderedSlides.ps1"), [
      "-CurrentDirectory", renderDirectory,
      "-GoldenDirectory", goldenDirectory,
      "-EvidencePath", visualEvidence,
      "-MaxChangedPixelRatio", "0.001",
      "-MaxMeanChannelDifference", "0.15",
    ], 300_000);
    const evidence = JSON.parse(readFileSync(visualEvidence, "utf8")) as { passed: boolean; results: unknown[]; scope: string };
    expect(evidence.passed).toBe(true);
    expect(evidence.results).toHaveLength(4);
    expect(evidence.scope).toContain("same Windows PowerPoint version");
  }, 300_000);

  test("opens, edits, saves, closes, and reopens a controlled copy", () => {
    powershell(resolve(root, "tools/powerpoint/Invoke-PowerPointAcceptance.ps1"), [
      "-InputPptx", pptx,
      "-WorkingDirectory", acceptanceDirectory,
      "-EvidencePath", acceptanceEvidence,
    ]);
    const evidence = JSON.parse(readFileSync(acceptanceEvidence, "utf8")) as {
      passed: boolean;
      checks: Array<{ id: string; passed: boolean }>;
      limitation: string;
    };
    expect(evidence.passed).toBe(true);
    expect(evidence.checks.every((check) => check.passed)).toBe(true);
    expect(evidence.limitation).toContain("does not replace visual human inspection");
  }, 180_000);
});
