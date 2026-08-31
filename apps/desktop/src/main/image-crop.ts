import type { NormalizedCrop } from "@vakamatik/export-contract";

export function normalizedCoverCrop(
  sourceWidthPx: number,
  sourceHeightPx: number,
  targetWidthPt: number,
  targetHeightPt: number,
): NormalizedCrop {
  const sourceAspect = sourceWidthPx / sourceHeightPx;
  const targetAspect = targetWidthPt / targetHeightPt;
  if (sourceAspect > targetAspect) {
    const horizontalCrop = 1 - targetAspect / sourceAspect;
    return { left: horizontalCrop / 2, top: 0, right: horizontalCrop / 2, bottom: 0 };
  }
  if (sourceAspect < targetAspect) {
    const verticalCrop = 1 - sourceAspect / targetAspect;
    return { left: 0, top: verticalCrop / 2, right: 0, bottom: verticalCrop / 2 };
  }
  return { left: 0, top: 0, right: 0, bottom: 0 };
}
