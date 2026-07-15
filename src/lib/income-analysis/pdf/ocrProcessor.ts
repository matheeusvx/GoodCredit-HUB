import type { PDFDocumentProxy } from "pdfjs-dist";
import { OcrProgress, ReconstructedPdfLine } from "../../../types/pdfImport";
import { PDF_IMPORT_CONFIG } from "./pdfConfig";

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
      const result = await worker.recognize(canvas);
      result.data.text.split(/\r?\n/).map((text) => text.trim()).filter(Boolean).forEach((text, lineIndex) => {
        lines.push({ pageNumber, y: 10_000 - lineIndex, text, items: [] });
      });
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
