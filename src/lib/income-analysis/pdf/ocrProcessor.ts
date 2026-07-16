import type { PDFDocumentProxy } from "pdfjs-dist";
import { OcrProgress, ReconstructedPdfLine } from "../../../types/pdfImport";
import { PDF_IMPORT_CONFIG } from "./pdfConfig";
import { reconstructPdfLines } from "./pdfLineReconstructor";

interface OcrWordLike { text?: string; confidence?: number; bbox?: { x0: number; y0: number; x1: number; y1: number } }
interface OcrLineLike { words?: OcrWordLike[] }
interface OcrParagraphLike { lines?: OcrLineLike[] }
interface OcrBlockLike { paragraphs?: OcrParagraphLike[] }

export function ocrBlocksToLines(blocks: OcrBlockLike[] | null | undefined, pageNumber: number, pageHeight: number, fallbackText = ""): ReconstructedPdfLine[] {
  const items = (blocks || []).flatMap((block) => block.paragraphs || []).flatMap((paragraph) => paragraph.lines || []).flatMap((line) => line.words || []).flatMap((word) => {
    const text = word.text?.trim(); const box = word.bbox; if (!text || !box) return [];
    return [{ text, pageNumber, x: box.x0, y: pageHeight - box.y0, width: box.x1 - box.x0, height: box.y1 - box.y0, confidence: typeof word.confidence === "number" ? word.confidence / 100 : undefined }];
  });
  if (items.length) return reconstructPdfLines(items, 8);
  return fallbackText.split(/\r?\n/).map((text) => text.trim()).filter(Boolean).map((text, index) => ({ pageNumber, y: 10_000 - index, text, items: [] }));
}

export function preprocessOcrCanvas(canvas: { width: number; height: number; getContext: (type: "2d", options?: { alpha?: boolean }) => CanvasRenderingContext2D | null }) {
  const context = canvas.getContext("2d", { alpha: false }); if (!context) return;
  const image = context.getImageData(0, 0, canvas.width, canvas.height); const pixels = image.data;
  for (let index = 0; index < pixels.length; index += 4) {
    const gray = pixels[index] * 0.299 + pixels[index + 1] * 0.587 + pixels[index + 2] * 0.114;
    const contrasted = Math.max(0, Math.min(255, (gray - 128) * 1.4 + 128)); const value = contrasted > 245 ? 255 : contrasted < 75 ? 0 : contrasted;
    pixels[index] = value; pixels[index + 1] = value; pixels[index + 2] = value; pixels[index + 3] = 255;
  }
  context.putImageData(image, 0, 0);
}

export async function processPdfWithOcr(
  document: PDFDocumentProxy,
  pages: number[],
  onProgress: (progress: OcrProgress) => void,
  signal: AbortSignal,
): Promise<ReconstructedPdfLine[]> {
  const { createWorker } = await import("tesseract.js");
  const baseUrl = import.meta.env.BASE_URL;
  let pageIndex = 0;
  const worker = await createWorker(PDF_IMPORT_CONFIG.defaultOcrLanguage, 1, {
    workerPath: `${baseUrl}tesseract/worker.min.js`,
    corePath: `${baseUrl}tesseract/core`,
    langPath: `${baseUrl}tesseract/lang`,
    logger: (message) => {
      onProgress({
        pageNumber: pages[pageIndex] || pages[0],
        totalPages: pages.length,
        phase: "OCR",
        progress: (pageIndex + Math.max(0, message.progress)) / pages.length,
        label: `Executando OCR na página ${pages[pageIndex] || pages[0]}`,
      });
    },
  });
  const abort = () => { void worker.terminate(); };
  signal.addEventListener("abort", abort, { once: true });
  const lines: ReconstructedPdfLine[] = [];
  try {
    for (pageIndex = 0; pageIndex < pages.length; pageIndex += 1) {
      if (signal.aborted) throw new DOMException("Processamento cancelado", "AbortError");
      const pageNumber = pages[pageIndex];
      onProgress({ pageNumber, totalPages: pages.length, phase: "RENDERING", progress: pageIndex / pages.length, label: `Renderizando página ${pageNumber}` });
      const page = await document.getPage(pageNumber);
      const viewport = page.getViewport({ scale: PDF_IMPORT_CONFIG.ocrScale });
      const canvas = window.document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) throw new Error("Canvas indisponível para OCR.");
      await page.render({ canvas, canvasContext: context, viewport }).promise;
      preprocessOcrCanvas(canvas);
      const result = await worker.recognize(canvas, {}, { text: true, blocks: true });
      lines.push(...ocrBlocksToLines(result.data.blocks as OcrBlockLike[] | null, pageNumber, canvas.height, result.data.text));
      canvas.width = 1;
      canvas.height = 1;
      page.cleanup();
    }
    onProgress({ pageNumber: pages.at(-1) || 1, totalPages: pages.length, phase: "PARSING", progress: 1, label: "Interpretando movimentações" });
    return lines;
  } finally {
    signal.removeEventListener("abort", abort);
    await worker.terminate().catch(() => undefined);
  }
}
