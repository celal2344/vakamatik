export interface AlignmentArrowEvent {
  readonly key: string;
  readonly shiftKey: boolean;
  readonly altKey: boolean;
  preventDefault(): void;
}

export interface AlignmentNudge {
  readonly xPt: number;
  readonly yPt: number;
}

export interface CropWindow {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

export type CropEdge = keyof CropWindow;

function shiftPair(start: number, end: number, delta: number): readonly [number, number] {
  const applied = Math.max(-start, Math.min(end, delta));
  return [Number((start + applied).toFixed(6)), Number((end - applied).toFixed(6))];
}

export function shiftCropWindow(crop: CropWindow, x: number, y: number): CropWindow {
  const [left, right] = shiftPair(crop.left, crop.right, x);
  const [top, bottom] = shiftPair(crop.top, crop.bottom, y);
  return { left, top, right, bottom };
}

export function setCropEdgePosition(crop: CropWindow, edge: CropEdge, value: number): CropWindow {
  const opposite: Readonly<Record<CropEdge, CropEdge>> = {
    left: "right",
    top: "bottom",
    right: "left",
    bottom: "top",
  };
  const oppositeEdge = opposite[edge];
  const pairTotal = crop[edge] + crop[oppositeEdge];
  const nextValue = Math.max(0, Math.min(pairTotal, value));
  return {
    ...crop,
    [edge]: Number(nextValue.toFixed(6)),
    [oppositeEdge]: Number((pairTotal - nextValue).toFixed(6)),
  };
}

export function zoomCropWindow(crop: CropWindow, delta: number): CropWindow {
  const width = 1 - crop.left - crop.right;
  const height = 1 - crop.top - crop.bottom;
  const centerX = crop.left + width / 2;
  const centerY = crop.top + height / 2;
  const requestedMultiplier = 1 / Math.max(0.1, 1 + delta);
  const maximumMultiplier = Math.min(
    (2 * Math.min(centerX, 1 - centerX)) / width,
    (2 * Math.min(centerY, 1 - centerY)) / height,
  );
  const minimumMultiplier = Math.max(
    0.03 / width,
    0.03 / height,
    (2 * Math.max(0, centerX - 0.95, 0.05 - centerX)) / width,
    (2 * Math.max(0, centerY - 0.95, 0.05 - centerY)) / height,
  );
  const multiplier = Math.max(minimumMultiplier, Math.min(maximumMultiplier, requestedMultiplier));
  const nextWidth = width * multiplier;
  const nextHeight = height * multiplier;
  return {
    left: Number((centerX - nextWidth / 2).toFixed(6)),
    top: Number((centerY - nextHeight / 2).toFixed(6)),
    right: Number((1 - centerX - nextWidth / 2).toFixed(6)),
    bottom: Number((1 - centerY - nextHeight / 2).toFixed(6)),
  };
}

export function rotationFromPointerDrag(
  startRotation: number,
  startPointerAngle: number,
  currentPointerAngle: number,
): number {
  let delta = currentPointerAngle - startPointerAngle;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return Number((startRotation + delta).toFixed(2));
}

export function consumeAlignmentArrow(
  event: AlignmentArrowEvent,
  editableTarget: boolean,
): AlignmentNudge | null {
  if (editableTarget) return null;
  const step = event.shiftKey ? 5 : event.altKey ? 0.05 : 0.5;
  let nudge: AlignmentNudge | null = null;
  if (event.key === "ArrowLeft") nudge = { xPt: -step, yPt: 0 };
  else if (event.key === "ArrowRight") nudge = { xPt: step, yPt: 0 };
  else if (event.key === "ArrowUp") nudge = { xPt: 0, yPt: -step };
  else if (event.key === "ArrowDown") nudge = { xPt: 0, yPt: step };
  if (nudge !== null) event.preventDefault();
  return nudge;
}
