import { PdfTextItem, ReconstructedPdfLine } from "../../../types/pdfImport";
import { PDF_IMPORT_CONFIG } from "./pdfConfig";

export function reconstructPdfLines(items: PdfTextItem[], tolerance = PDF_IMPORT_CONFIG.lineYTolerance): ReconstructedPdfLine[] {
  const byPage = new Map<number, PdfTextItem[]>();
  items.forEach((item) => byPage.set(item.pageNumber, [...(byPage.get(item.pageNumber) || []), item]));
  const lines: ReconstructedPdfLine[] = [];
  [...byPage.entries()].sort(([a], [b]) => a - b).forEach(([pageNumber, pageItems]) => {
    const groups: PdfTextItem[][] = [];
    [...pageItems].sort((a, b) => b.y - a.y || a.x - b.x).forEach((item) => {
      const group = groups.find((candidate) => Math.abs(candidate[0].y - item.y) <= tolerance);
      if (group) group.push(item); else groups.push([item]);
    });
    groups.sort((a, b) => b[0].y - a[0].y).forEach((group) => {
      const sorted = group.sort((a, b) => a.x - b.x);
      let text = "";
      sorted.forEach((item, index) => {
        if (index) {
          const previous = sorted[index - 1];
          const gap = item.x - (previous.x + previous.width);
          text += gap > Math.max(8, previous.height * 0.8) ? "   " : " ";
        }
        text += item.text.trim();
      });
      if (text.trim()) lines.push({ pageNumber, y: group.reduce((sum, item) => sum + item.y, 0) / group.length, text: text.trim(), items: sorted });
    });
  });
  return lines;
}
