import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  calculatePlacedImageBounds,
  type ImageElement,
  type SlideDefinition,
  type SlideDocument,
  type SlideElement,
  type TableCell,
  type TextElement,
} from "@vakamatik/export-contract";

const escapeXml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

function mimeTypeFor(filePath: string): string {
  switch (path.extname(filePath).toLowerCase()) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    default:
      return "image/png";
  }
}

function horizontalAnchor(element: TextElement): { anchor: string; x: number } {
  if (element.style.horizontalAlignment === "center") {
    return { anchor: "middle", x: element.bounds.xPt + element.bounds.widthPt / 2 };
  }
  if (element.style.horizontalAlignment === "right") {
    return { anchor: "end", x: element.bounds.xPt + element.bounds.widthPt };
  }
  return { anchor: "start", x: element.bounds.xPt };
}

function renderText(element: TextElement): string {
  const { anchor, x } = horizontalAnchor(element);
  const lines = element.text.split(/\r?\n/u);
  const lineHeight = element.style.fontSizePt * (element.style.lineSpacingMultiple ?? 1.15);
  const totalHeight = lines.length * lineHeight;
  const firstY =
    element.style.verticalAlignment === "middle"
      ? element.bounds.yPt + (element.bounds.heightPt - totalHeight) / 2 + element.style.fontSizePt
      : element.style.verticalAlignment === "bottom"
        ? element.bounds.yPt + element.bounds.heightPt - totalHeight + element.style.fontSizePt
        : element.bounds.yPt + element.style.fontSizePt;
  const tspans = lines
    .map((line, index) => `<tspan x="${x}" y="${firstY + index * lineHeight}">${escapeXml(line)}</tspan>`)
    .join("");
  return `<text data-element-id="${escapeXml(element.id)}" data-bounds="${element.bounds.xPt},${element.bounds.yPt},${element.bounds.widthPt},${element.bounds.heightPt}" fill="#${element.style.color}" font-family="${escapeXml(element.style.fontFace)}" font-size="${element.style.fontSizePt}" font-weight="${element.style.bold === true ? 700 : 400}" font-style="${element.style.italic === true ? "italic" : "normal"}" text-anchor="${anchor}">${tspans}</text>`;
}

function renderTableCell(cell: TableCell, x: number, y: number, width: number, height: number): string {
  const fill = cell.fillColor === undefined ? "none" : `#${cell.fillColor}`;
  const stroke = cell.borderColor === undefined ? "none" : `#${cell.borderColor}`;
  const anchor =
    cell.style.horizontalAlignment === "center"
      ? "middle"
      : cell.style.horizontalAlignment === "right"
        ? "end"
        : "start";
  const textX = anchor === "middle" ? x + width / 2 : anchor === "end" ? x + width - 4 : x + 4;
  const textY = y + height / 2 + cell.style.fontSizePt * 0.35;
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${fill}" stroke="${stroke}" stroke-width="0.75"/><text x="${textX}" y="${textY}" fill="#${cell.style.color}" font-family="${escapeXml(cell.style.fontFace)}" font-size="${cell.style.fontSizePt}" font-weight="${cell.style.bold === true ? 700 : 400}" text-anchor="${anchor}">${escapeXml(cell.text)}</text>`;
}

function renderTable(element: Extract<SlideElement, { kind: "table" }>): string {
  let y = element.bounds.yPt;
  const rows: string[] = [];
  element.rows.forEach((row, rowIndex) => {
    let x = element.bounds.xPt;
    const height = element.rowHeightsPt[rowIndex] ?? 0;
    row.forEach((cell, columnIndex) => {
      const width = element.columnWidthsPt[columnIndex] ?? 0;
      rows.push(renderTableCell(cell, x, y, width, height));
      x += width;
    });
    y += height;
  });
  return `<g data-element-id="${escapeXml(element.id)}" data-bounds="${element.bounds.xPt},${element.bounds.yPt},${element.bounds.widthPt},${element.bounds.heightPt}">${rows.join("")}</g>`;
}

async function imageDataUrl(element: ImageElement): Promise<string> {
  const previewFilePath = element.source.previewFilePath ?? element.source.filePath;
  const bytes = await readFile(previewFilePath);
  return `data:${mimeTypeFor(previewFilePath)};base64,${bytes.toString("base64")}`;
}

async function renderImage(element: ImageElement, clipIndex: number): Promise<string> {
  const bounds = calculatePlacedImageBounds(element);
  const clipId = `clip-${clipIndex}-${element.id.replaceAll(/[^A-Za-z0-9_-]/gu, "-")}`;
  let x = bounds.xPt;
  let y = bounds.yPt;
  let width = bounds.widthPt;
  let height = bounds.heightPt;
  if (element.crop !== undefined) {
    width /= 1 - element.crop.left - element.crop.right;
    height /= 1 - element.crop.top - element.crop.bottom;
    x -= element.crop.left * width;
    y -= element.crop.top * height;
  }
  const preserve = element.placement === "contain" ? "xMidYMid meet" : "xMidYMid slice";
  const centerX = bounds.xPt + bounds.widthPt / 2;
  const centerY = bounds.yPt + bounds.heightPt / 2;
  return `<defs><clipPath id="${clipId}"><rect x="${element.bounds.xPt}" y="${element.bounds.yPt}" width="${element.bounds.widthPt}" height="${element.bounds.heightPt}"/></clipPath></defs><image data-element-id="${escapeXml(element.id)}" data-bounds="${bounds.xPt},${bounds.yPt},${bounds.widthPt},${bounds.heightPt}" href="${await imageDataUrl(element)}" x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="${preserve}" opacity="${element.transform.opacity}" transform="rotate(${element.transform.rotationDeg} ${centerX} ${centerY})" clip-path="url(#${clipId})"/>`;
}

export async function renderSlideToSvg(slide: SlideDefinition): Promise<string> {
  const rendered: string[] = [];
  const elements = [...slide.elements].sort((left, right) => left.zIndex - right.zIndex);
  for (const [index, element] of elements.entries()) {
    switch (element.kind) {
      case "image":
        rendered.push(await renderImage(element, index));
        break;
      case "line":
        rendered.push(
          `<line data-element-id="${escapeXml(element.id)}" data-bounds="${element.bounds.xPt},${element.bounds.yPt},${element.bounds.widthPt},${element.bounds.heightPt}" x1="${element.bounds.xPt}" y1="${element.bounds.yPt}" x2="${element.bounds.xPt + element.bounds.widthPt}" y2="${element.bounds.yPt + element.bounds.heightPt}" stroke="#${element.color}" stroke-width="${element.widthPt}" stroke-dasharray="${element.dash === "dash" ? "6 4" : element.dash === "dot" ? "2 3" : "none"}"/>`,
        );
        break;
      case "table":
        rendered.push(renderTable(element));
        break;
      case "text":
        rendered.push(renderText(element));
        break;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${slide.size.widthPt}" height="${slide.size.heightPt}" viewBox="0 0 ${slide.size.widthPt} ${slide.size.heightPt}" role="img" aria-label="${escapeXml(slide.semanticId)}"><rect width="100%" height="100%" fill="#${slide.backgroundColor}"/>${rendered.join("")}</svg>`;
}

export async function renderPresentationPreviews(
  document: SlideDocument,
): Promise<readonly { semanticId: string; svgDataUrl: string }[]> {
  return Promise.all(
    document.slides.map(async (slide) => ({
      semanticId: slide.semanticId,
      svgDataUrl: `data:image/svg+xml;base64,${Buffer.from(await renderSlideToSvg(slide), "utf8").toString("base64")}`,
    })),
  );
}
