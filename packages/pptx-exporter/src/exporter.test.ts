import { describe, expect, it } from "vitest";
import { GATE_1_SLIDE_ORDER } from "@vakamatik/export-contract";
import {
  excessiveProblemGoalPlanInput,
  gate1DentalInput,
  gate1OverlayInput,
  gate1VerticalInput,
  mediumProblemGoalPlanInput,
  shortProblemGoalPlanInput,
} from "@vakamatik/test-fixtures";
import {
  createDentalSlide,
  createGate1Document,
  createProblemGoalPlanSlide,
} from "./document.js";
import { validateSlideDocument } from "./overflow.js";

const createDocument = (plan = mediumProblemGoalPlanInput) =>
  createGate1Document({
    dental: gate1DentalInput,
    overlay: gate1OverlayInput,
    vertical: gate1VerticalInput,
    plan,
  });

describe("Gate 1 slide document", () => {
  it("uses the frozen semantic order and canvas", () => {
    const document = createDocument();
    expect(document.slides.map((slide) => slide.semanticId)).toEqual(GATE_1_SLIDE_ORDER);
    expect(document.slides).toHaveLength(4);
    for (const slide of document.slides) {
      expect(slide.size).toEqual({ widthPt: 720, heightPt: 540 });
    }
  });

  it("fits short and medium problem/goal/plan content", () => {
    expect(validateSlideDocument(createDocument(shortProblemGoalPlanInput))).toEqual({ ok: true, overflow: [] });
    expect(validateSlideDocument(createDocument(mediumProblemGoalPlanInput))).toEqual({ ok: true, overflow: [] });
  });

  it("reports excessive content at an exact semantic table location", () => {
    const result = validateSlideDocument(createDocument(excessiveProblemGoalPlanInput));
    expect(result.ok).toBe(false);
    expect(result.overflow).toContainEqual({
      semanticSlideId: "problem_goal_plan",
      elementId: "problem-goal-plan-table",
      row: 1,
      column: 1,
      reason: "text-exceeds-cell-height",
      message: "problem-goal-plan-table row 1, column 1 exceeds the fixed cell height at 12 pt",
    });
  });

  it("binds every repeated dental value to one canonical input object", () => {
    const measurements = {
      upperMidline: "UNIQUE-UPPER-SYNTHETIC",
      lowerMidline: "UNIQUE-LOWER-SYNTHETIC",
      overjetMm: 7.25,
      overbiteMm: -1.5,
    } as const;
    const slide = createDentalSlide({ ...gate1DentalInput, measurements });
    const valueById = new Map(
      slide.elements
        .filter((element) => element.kind === "text")
        .map((element) => [element.id, element.text]),
    );
    expect(valueById.get("upper-midline-value")).toBe(measurements.upperMidline);
    expect(valueById.get("lower-midline-value")).toBe(measurements.lowerMidline);
    expect(valueById.get("overjet-value")).toContain(measurements.overjetMm.toFixed(1));
    expect(valueById.get("overbite-value")).toContain(measurements.overbiteMm.toFixed(1));
  });

  it("keeps every element on the slide canvas", () => {
    expect(validateSlideDocument(createDocument()).overflow.filter((issue) => issue.reason === "element-outside-slide")).toEqual([]);
  });

  it("creates a six-row native table with five logical data rows", () => {
    const slide = createProblemGoalPlanSlide(mediumProblemGoalPlanInput);
    const table = slide.elements.find((element) => element.kind === "table");
    expect(table?.kind).toBe("table");
    if (table?.kind !== "table") throw new Error("Expected problem/goal/plan table");
    expect(table.rows).toHaveLength(6);
    expect(table.columnWidthsPt).toEqual([63.87, 226.49, 234.07, 195.57]);
    expect(table.rowHeightsPt.reduce((total, height) => total + height, 0)).toBe(474);
  });
});
