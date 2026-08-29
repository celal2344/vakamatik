import { describe, expect, test } from "vitest";
import {
  EMU_PER_POINT,
  GATE_1_SLIDE_SIZE,
  emuToPoints,
  pointsToEmu,
  pointsToReferencePixels,
  referencePixelsToPoints,
} from "../../packages/export-contract/src/index.ts";

describe("Gate 1 coordinate contract", () => {
  test("uses the exact 4:3 point and EMU canvas", () => {
    expect(GATE_1_SLIDE_SIZE).toEqual({ widthPt: 720, heightPt: 540 });
    expect(pointsToEmu(720)).toBe(9_144_000);
    expect(pointsToEmu(540)).toBe(6_858_000);
    expect(EMU_PER_POINT).toBe(12_700);
  });

  test("point and EMU conversion is deterministic", () => {
    for (const points of [0, 0.5, 1, 17.25, 720]) {
      expect(emuToPoints(pointsToEmu(points))).toBe(points);
    }
  });

  test("one 1440x1080 reference pixel equals 0.5 points", () => {
    expect(referencePixelsToPoints(1)).toBe(0.5);
    expect(pointsToReferencePixels(0.5)).toBe(1);
    expect(referencePixelsToPoints(1_440)).toBe(720);
  });
});
