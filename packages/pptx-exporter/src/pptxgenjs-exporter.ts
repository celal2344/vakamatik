import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import type {
  Exporter,
  ExportResult,
  ImageElement,
  LineElement,
  SlideDefinition,
  SlideDocument,
  TableCell,
  TableElement,
  TextElement,
  TextStyle,
} from "@vakamatik/export-contract";
import {
  POWERPOINT_POINTS_PER_INCH,
  calculatePlacedImageBounds,
} from "@vakamatik/export-contract";
import pptxgenjsModule from "pptxgenjs";
import { validateSlideDocument } from "./overflow.js";

interface PptxSlideFacade {
  _name: string;
  background: { color: string };
  addText(text: string, options: Record<string, unknown>): void;
  addShape(shape: unknown, options: Record<string, unknown>): void;
  addImage(options: Record<string, unknown>): void;
  addTable(rows: readonly unknown[], options: Record<string, unknown>): void;
  addNotes(notes: string): void;
}

interface PptxPresentationFacade {
  readonly ShapeType: { readonly line: unknown };
  layout: string;
  author: string;
  company: string;
  subject: string;
  title: string;
  theme: { headFontFace: string; bodyFontFace: string };
  defineLayout(layout: { name: string; width: number; height: number }): void;
  addSlide(): PptxSlideFacade;
  writeFile(options: { fileName: string; compression: boolean }): Promise<string>;
}

const PptxGenJSConstructor = pptxgenjsModule as unknown as new () => PptxPresentationFacade;

const ptToIn = (points: number): number => points / POWERPOINT_POINTS_PER_INCH;

function toMargin(margin: TextStyle["marginPt"]): number | [number, number, number, number] | undefined {
  if (margin === undefined) return undefined;
  return typeof margin === "number" ? margin : [margin[0], margin[1], margin[2], margin[3]];
}

const pptxAlign = (alignment: TextStyle["horizontalAlignment"]): "left" | "center" | "right" | undefined => alignment;
const pptxVAlign = (alignment: TextStyle["verticalAlignment"]): "top" | "middle" | "bottom" | undefined => alignment;

function addText(slide: PptxSlideFacade, element: TextElement): void {
  const { bounds, style } = element;
  slide.addText(element.text, {
    x: ptToIn(bounds.xPt),
    y: ptToIn(bounds.yPt),
    w: ptToIn(bounds.widthPt),
    h: ptToIn(bounds.heightPt),
    objectName: element.id,
    fontFace: style.fontFace,
    fontSize: style.fontSizePt,
    color: style.color,
    bold: style.bold,
    italic: style.italic,
    align: pptxAlign(style.horizontalAlignment),
    valign: pptxVAlign(style.verticalAlignment),
    margin: toMargin(style.marginPt),
    breakLine: style.breakLine,
    lineSpacingMultiple: style.lineSpacingMultiple,
    fit: "none",
    isTextBox: true,
  });
}

function addLine(presentation: PptxPresentationFacade, slide: PptxSlideFacade, element: LineElement): void {
  const { bounds } = element;
  const dashType = element.dash === "dot" ? "dash" : element.dash === "dash" ? "dash" : "solid";
  slide.addShape(presentation.ShapeType.line, {
    x: ptToIn(bounds.xPt),
    y: ptToIn(bounds.yPt),
    w: ptToIn(bounds.widthPt),
    h: ptToIn(bounds.heightPt),
    objectName: element.id,
    line: { color: element.color, width: element.widthPt, dashType },
  });
}

function transformedImageBounds(element: ImageElement): { x: number; y: number; w: number; h: number } {
  const bounds = calculatePlacedImageBounds(element);
  return {
    x: ptToIn(bounds.xPt),
    y: ptToIn(bounds.yPt),
    w: ptToIn(bounds.widthPt),
    h: ptToIn(bounds.heightPt),
  };
}

function explicitCropSizing(element: ImageElement, widthIn: number, heightIn: number): Record<string, unknown> {
  const crop = element.crop;
  if (crop === undefined) throw new Error(`Image ${element.id} uses crop placement without crop values.`);
  const sourceBoxWidthIn = widthIn / (1 - crop.left - crop.right);
  const sourceBoxHeightIn = heightIn / (1 - crop.top - crop.bottom);
  return {
    type: "crop",
    x: crop.left * sourceBoxWidthIn,
    y: crop.top * sourceBoxHeightIn,
    w: widthIn,
    h: heightIn,
  };
}

function addImage(slide: PptxSlideFacade, element: ImageElement): void {
  const bounds = transformedImageBounds(element);
  const sourceAspect = element.source.widthPx / element.source.heightPx;
  const targetAspect = bounds.w / bounds.h;
  let sourceBounds = bounds;
  let sizing: Record<string, unknown> | undefined;

  if (element.placement === "crop") {
    const crop = element.crop;
    if (crop === undefined) throw new Error(`Image ${element.id} uses crop placement without crop values.`);
    sourceBounds = {
      ...bounds,
      w: bounds.w / (1 - crop.left - crop.right),
      h: bounds.h / (1 - crop.top - crop.bottom),
    };
    sizing = explicitCropSizing(element, bounds.w, bounds.h);
  } else if (element.placement === "cover") {
    const sourceWidth = sourceAspect >= targetAspect ? bounds.h * sourceAspect : bounds.w;
    const sourceHeight = sourceAspect >= targetAspect ? bounds.h : bounds.w / sourceAspect;
    sourceBounds = { ...bounds, w: sourceWidth, h: sourceHeight };
    sizing = {
      type: "crop",
      x: Math.max(0, (sourceWidth - bounds.w) / 2),
      y: Math.max(0, (sourceHeight - bounds.h) / 2),
      w: bounds.w,
      h: bounds.h,
    };
  } else {
    const containedWidth = sourceAspect >= targetAspect ? bounds.w : bounds.h * sourceAspect;
    const containedHeight = sourceAspect >= targetAspect ? bounds.w / sourceAspect : bounds.h;
    sourceBounds = {
      x: bounds.x + (bounds.w - containedWidth) / 2,
      y: bounds.y + (bounds.h - containedHeight) / 2,
      w: containedWidth,
      h: containedHeight,
    };
  }
  slide.addImage({
    path: element.source.filePath,
    ...sourceBounds,
    objectName: element.id,
    altText: `Vakamatik managed asset: ${element.source.assetId}`,
    sizing,
    rotate: element.transform.rotationDeg,
    transparency: Math.round((1 - element.transform.opacity) * 100_000) / 1_000,
  });
}

function toTableCell(cell: TableCell): Record<string, unknown> {
  return {
    text: cell.text,
    options: {
      fontFace: cell.style.fontFace,
      fontSize: cell.style.fontSizePt,
      color: cell.style.color,
      bold: cell.style.bold,
      italic: cell.style.italic,
      align: pptxAlign(cell.style.horizontalAlignment),
      valign: pptxVAlign(cell.style.verticalAlignment),
      margin: toMargin(cell.style.marginPt),
      lineSpacingMultiple: cell.style.lineSpacingMultiple,
      fill: cell.fillColor === undefined ? undefined : { color: cell.fillColor },
      border: cell.borderColor === undefined ? undefined : { type: "solid", color: cell.borderColor, pt: 0.75 },
      colspan: cell.colSpan,
      rowspan: cell.rowSpan,
      fit: "none",
    },
  };
}

function addTable(slide: PptxSlideFacade, element: TableElement): void {
  const { bounds } = element;
  slide.addTable(element.rows.map((row) => row.map(toTableCell)), {
    x: ptToIn(bounds.xPt),
    y: ptToIn(bounds.yPt),
    w: ptToIn(bounds.widthPt),
    h: ptToIn(bounds.heightPt),
    objectName: element.id,
    colW: element.columnWidthsPt.map(ptToIn),
    rowH: element.rowHeightsPt.map(ptToIn),
    autoPage: false,
    fit: "none",
    margin: 0,
  });
}

function addSlide(presentation: PptxPresentationFacade, definition: SlideDefinition): void {
  const slide = presentation.addSlide();
  slide._name = definition.semanticId;
  slide.background = { color: definition.backgroundColor };
  const elements = [...definition.elements].sort((left, right) => left.zIndex - right.zIndex);
  for (const element of elements) {
    switch (element.kind) {
      case "image":
        addImage(slide, element);
        break;
      case "line":
        addLine(presentation, slide, element);
        break;
      case "text":
        addText(slide, element);
        break;
      case "table":
        addTable(slide, element);
        break;
    }
  }
  if (definition.speakerNotes.length > 0) {
    slide.addNotes(definition.speakerNotes.join("\n\n"));
  }
}

export class PptxGenJsExporter implements Exporter {
  readonly id = "pptxgenjs-4.0.1";

  validate(document: SlideDocument) {
    return validateSlideDocument(document);
  }

  async export(document: SlideDocument, outputPath: string): Promise<ExportResult> {
    const validation = this.validate(document);
    if (!validation.ok) {
      return {
        outputPath,
        semanticSlideOrder: document.slides.map((slide) => slide.semanticId),
        validation,
      };
    }

    const presentation = new PptxGenJSConstructor();
    presentation.defineLayout({ name: "VAKAMATIK_4X3", width: 10, height: 7.5 });
    presentation.layout = "VAKAMATIK_4X3";
    presentation.author = "Vakamatik";
    presentation.company = "Vakamatik";
    presentation.subject = "Editable orthodontic case presentation";
    presentation.title = "Vakamatik case presentation";
    presentation.theme = {
      headFontFace: "Arial",
      bodyFontFace: "Arial",
    };

    for (const slide of document.slides) addSlide(presentation, slide);
    await mkdir(dirname(outputPath), { recursive: true });
    await presentation.writeFile({ fileName: outputPath, compression: true });
    return {
      outputPath,
      semanticSlideOrder: document.slides.map((slide) => slide.semanticId),
      validation,
    };
  }
}
