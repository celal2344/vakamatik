import type {
  ExportValidationResult,
  OverflowIssue,
  SlideDocument,
  TableCell,
  TextStyle,
} from "@vakamatik/export-contract";

function marginWidth(style: TextStyle): number {
  if (typeof style.marginPt === "number") return style.marginPt * 2;
  if (Array.isArray(style.marginPt)) return style.marginPt[1] + style.marginPt[3];
  return 0;
}

function marginHeight(style: TextStyle): number {
  if (typeof style.marginPt === "number") return style.marginPt * 2;
  if (Array.isArray(style.marginPt)) return style.marginPt[0] + style.marginPt[2];
  return 0;
}

/**
 * Conservative, deterministic preflight. PowerPoint does not expose its line
 * breaking engine to Node, so Gate 1 deliberately rejects before relying on
 * Office auto-fit or unreadable font shrinking.
 */
function cellOverflowReason(cell: TableCell, widthPt: number, heightPt: number): "text-exceeds-cell-height" | undefined {
  if (cell.text.length === 0) return undefined;
  const usableWidth = Math.max(1, widthPt - marginWidth(cell.style));
  const usableHeight = Math.max(1, heightPt - marginHeight(cell.style));
  const averageGlyphWidthPt = cell.style.fontSizePt * 0.54;
  const charsPerLine = Math.max(1, Math.floor(usableWidth / averageGlyphWidthPt));
  const explicitLines = cell.text.split(/\r?\n/u);
  const lineCount = explicitLines.reduce((total, line) => total + Math.max(1, Math.ceil(line.length / charsPerLine)), 0);
  const lineHeightPt = cell.style.fontSizePt * (cell.style.lineSpacingMultiple ?? 1.15);
  return lineCount * lineHeightPt > usableHeight ? "text-exceeds-cell-height" : undefined;
}

export function validateSlideDocument(document: SlideDocument): ExportValidationResult {
  const overflow: OverflowIssue[] = [];

  for (const slide of document.slides) {
    for (const element of slide.elements) {
      const { xPt, yPt, widthPt, heightPt } = element.bounds;
      if (xPt < 0 || yPt < 0 || widthPt < 0 || heightPt < 0 || xPt + widthPt > slide.size.widthPt || yPt + heightPt > slide.size.heightPt) {
        overflow.push({
          semanticSlideId: slide.semanticId,
          elementId: element.id,
          reason: "element-outside-slide",
          message: `${element.id} bounds ${xPt}/${yPt}/${widthPt}/${heightPt} exceed ${slide.size.widthPt}×${slide.size.heightPt} pt`,
        });
      }

      if (element.kind !== "table") continue;
      element.rows.forEach((row, rowIndex) => {
        row.forEach((cell, columnIndex) => {
          const reason = cellOverflowReason(
            cell,
            element.columnWidthsPt[columnIndex] ?? 0,
            element.rowHeightsPt[rowIndex] ?? 0,
          );
          if (reason !== undefined) {
            overflow.push({
              semanticSlideId: slide.semanticId,
              elementId: element.id,
              row: rowIndex,
              column: columnIndex,
              reason,
              message: `${element.id} row ${rowIndex}, column ${columnIndex} exceeds the fixed cell height at ${cell.style.fontSizePt} pt`,
            });
          }
        });
      });
    }
  }

  return { ok: overflow.length === 0, overflow };
}
