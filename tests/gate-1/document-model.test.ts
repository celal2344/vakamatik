import { describe, expect, test } from "vitest";
import type { DentalFrontalComparisonInput } from "../../packages/export-contract/src/index.ts";
import { GATE_1_SLIDE_ORDER } from "../../packages/export-contract/src/index.ts";
import {
  createDentalSlide,
  createGate1Document,
  createProblemGoalPlanSlide,
} from "../../packages/pptx-exporter/src/document.ts";
import { validateSlideDocument } from "../../packages/pptx-exporter/src/overflow.ts";
import {
  excessiveProblemGoalPlanInput,
  gate1DentalInput,
  gate1OverlayInput,
  gate1VerticalInput,
  mediumProblemGoalPlanInput,
} from "../../packages/test-fixtures/src/index.ts";

describe("Gate 1 document model", () => {
  test("contains exactly four slides in semantic order", () => {
    const document = createGate1Document({
      dental: gate1DentalInput,
      overlay: gate1OverlayInput,
      vertical: gate1VerticalInput,
      plan: mediumProblemGoalPlanInput,
    });
    expect(document.slides).toHaveLength(4);
    expect(document.slides.map((slide) => slide.semanticId)).toEqual(GATE_1_SLIDE_ORDER);
  });

  test("slide 9 repeated values originate from one canonical input object", () => {
    const measurements: DentalFrontalComparisonInput["measurements"] = {
      upperMidline: "UPPER-SENTINEL",
      lowerMidline: "LOWER-SENTINEL",
      overjetMm: 7.25,
      overbiteMm: -1.5,
    };
    const slide = createDentalSlide({ ...gate1DentalInput, measurements });
    const byId = new Map(slide.elements.map((element) => [element.id, element]));
    expect(byId.get("upper-midline-value")).toMatchObject({ kind: "text", text: "UPPER-SENTINEL" });
    expect(byId.get("lower-midline-value")).toMatchObject({ kind: "text", text: "LOWER-SENTINEL" });
    expect(byId.get("overjet-value")).toMatchObject({ kind: "text", text: "Overjet: 7.3 mm" });
    expect(byId.get("overbite-value")).toMatchObject({ kind: "text", text: "Overbite: -1.5 mm" });
  });

  test("normal plan table uses native table cells and fits the declared canvas", () => {
    const slide = createProblemGoalPlanSlide(mediumProblemGoalPlanInput);
    const table = slide.elements.find((element) => element.id === "problem-goal-plan-table");
    expect(table).toMatchObject({ kind: "table", overflowPolicy: "report" });
    if (table?.kind !== "table") throw new Error("Expected the native plan table.");
    expect(table.rows).toHaveLength(6);
    expect(table.bounds.yPt + table.bounds.heightPt).toBeLessThanOrEqual(slide.size.heightPt);
    const result = validateSlideDocument({ schemaVersion: 1, slides: [slide] });
    expect(result).toEqual({ ok: true, overflow: [] });
  });

  test("excessive content returns a deterministic row/column overflow error", () => {
    const slide = createProblemGoalPlanSlide(excessiveProblemGoalPlanInput);
    const table = slide.elements.find((element) => element.id === "problem-goal-plan-table");
    if (table?.kind !== "table") throw new Error("Expected the native plan table.");
    expect(table.rows[1]?.[1]?.text.length).toBeGreaterThan(1_000);
    expect(table.overflowPolicy).toBe("report");
    const first = validateSlideDocument({ schemaVersion: 1, slides: [slide] });
    const second = validateSlideDocument({ schemaVersion: 1, slides: [slide] });
    expect(first).toEqual(second);
    expect(first.ok).toBe(false);
    expect(first.overflow).toContainEqual(expect.objectContaining({
      semanticSlideId: "problem_goal_plan",
      elementId: "problem-goal-plan-table",
      row: 1,
      column: 1,
      reason: "text-exceeds-cell-height",
    }));
  });
});
