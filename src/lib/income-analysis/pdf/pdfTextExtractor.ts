import type { PDFDocumentProxy } from "pdfjs-dist";
import { PdfDocumentInfo, PdfExtractionProgress, PdfTextItem, ReconstructedPdfLine } from "../../../types/pdfImport";
import { PDF_IMPORT_CONFIG } from "./pdfConfig";
import { reconstructPdfLines } from "./pdfLineReconstructor";

export interface PdfTextExtractionResult {
  items: PdfTextItem[];
  lines: ReconstructedPdfLine[];
  info: PdfDocumentInfo;
}

export async function extractPdfText(
  document: PDFDocumentProxy,
  pages: number[],
  onProgress: (progress: PdfExtractionProgress) => void,
  signal: AbortSignal,
): Promise<PdfTextExtractionResult> {
  const items: PdfTextItem[] = [];
  const textPages: number[] = [];
  const scannedPages: number[] = [];
  for (let index = 0; index < pages.length; index += 1) {
    if (signal.aborted) throw new DOMException("Processamento cancelado", "AbortError");
    const pageNumber = pages[index];
    onProgress({ pageNumber, totalPages: pages.length, progress: index / pages.length, label: `Extraindo texto da página ${pageNumber}` });
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    let characters = 0;
    content.items.forEach((rawItem) => {
      if (!("str" in rawItem)) return;
      const item = rawItem as { str: string; transform: number[]; width: number; height: number };
      const text = item.str.trim();
      if (!text) return;
      characters += text.length;
      items.push({ text, pageNumber, x: item.transform[4], y: item.transform[5], width: item.width, height: item.height });
    });
    if (characters >= PDF_IMPORT_CONFIG.minimumExtractedCharactersPerPage) textPages.push(pageNumber); else scannedPages.push(pageNumber);
    page.cleanup();
  }
  onProgress({ pageNumber: pages.at(-1) || 1, totalPages: pages.length, progress: 1, label: "Texto extraído" });
  const documentType = textPages.length === pages.length ? "TEXT" : textPages.length ? "MIXED" : "SCANNED";
  return {
    items,
    lines: reconstructPdfLines(items),
    info: { pageCount: document.numPages, documentType, textCharacters: items.reduce((sum, item) => sum + item.text.length, 0), textPages, scannedPages },
  };
}
