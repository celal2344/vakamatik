import type { PresentationView } from "@vakamatik/desktop-contract";

type Layer = PresentationView["slides"][number]["imageLayers"][number];

export function hitTestImageLayers(layers: readonly Layer[], xPt: number, yPt: number): readonly Layer[] {
  return layers
    .filter((layer) => {
      const width = layer.bounds.widthPt * layer.transform.uniformScale;
      const height = layer.bounds.heightPt * layer.transform.uniformScale;
      const centerX = layer.bounds.xPt + layer.bounds.widthPt / 2 + layer.transform.translationXPt;
      const centerY = layer.bounds.yPt + layer.bounds.heightPt / 2 + layer.transform.translationYPt;
      const radians = (-layer.transform.rotationDeg * Math.PI) / 180;
      const offsetX = xPt - centerX;
      const offsetY = yPt - centerY;
      const localX = offsetX * Math.cos(radians) - offsetY * Math.sin(radians);
      const localY = offsetX * Math.sin(radians) + offsetY * Math.cos(radians);
      return Math.abs(localX) <= width / 2 && Math.abs(localY) <= height / 2;
    })
    .sort((left, right) => right.zIndex - left.zIndex);
}
