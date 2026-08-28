import { PDF_IMPORT_CONFIG } from "../../income-analysis/pdf/pdfConfig";
import { extractPdfText } from "../../income-analysis/pdf/pdfTextExtractor";
import { processPdfWithOcr } from "../../income-analysis/pdf/ocrProcessor";
import type { CtpsAnalysis, CtpsDocumentProcessingProgress } from "../../../types/ctpsAnalysis";
import { parseCtpsDigital } from "./ctpsParser";

export function validateCtpsPdf(file: File): string | null {
  if (!file.size) return "O arquivo selecionado está vazio.";
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) return "Selecione um arquivo PDF válido.";
  if (file.size > PDF_IMPORT_CONFIG.maxFileSizeMb * 1024 * 1024) return `O arquivo excede o limite de ${PDF_IMPORT_CONFIG.maxFileSizeMb} MB.`;
  return null;
}

function emit(
  onProgress: (progress: CtpsDocumentProcessingProgress) => void,
  stage: CtpsDocumentProcessingProgress["stage"],
  label: string,
  progress: number,
) {
  onProgress({ stage, label, progress });
}

export async function processCtpsPdf(
  file: File,
  onProgress: (progress: CtpsDocumentProcessingProgress) => void,
  signal: AbortSignal,
): Promise<CtpsAnalysis> {
  const validation = validateCtpsPdf(file);
  if (validation) throw new Error(validation);
  emit(onProgress, "READING", "Lendo documento...", 0.05);
  const { loadPdfFile } = await import("../../income-analysis/pdf/pdfLoader");
  const loaded = await loadPdfFile(file);
  const pdf = loaded.document;
  try {
    if (pdf.numPages > PDF_IMPORT_CONFIG.maxPages) throw new Error(`A CTPS excede o limite de ${PDF_IMPORT_CONFIG.maxPages} páginas por análise.`);
    const pages = Array.from({ length: pdf.numPages }, (_, index) => index + 1);
    const extraction = await extractPdfText(pdf, pages, (item) => {
      emit(onProgress, "READING", "Lendo documento...", 0.08 + item.progress * 0.3);
    }, signal);
    emit(onProgress, "IDENTIFYING", "Identificando vínculos...", 0.42);
    let lines = extraction.lines;
    let extractionMethod: CtpsAnalysis["document"]["extractionMethod"] = "PDF_TEXT";
    const needsOcr = extraction.info.documentType === "SCANNED" || extraction.info.textCharacters < 180;
    const needsPartialOcr = extraction.info.documentType === "MIXED" && extraction.info.scannedPages.length > 0;
    if (needsOcr || needsPartialOcr) {
      const ocrPages = needsOcr ? pages : extraction.info.scannedPages;
      const ocrLines = await processPdfWithOcr(pdf, ocrPages, (item) => {
        emit(onProgress, "READING", item.label, 0.12 + item.progress * 0.3);
      }, signal);
      lines = needsOcr ? ocrLines : [...lines, ...ocrLines].sort((a, b) => a.pageNumber - b.pageNumber || b.y - a.y);
      extractionMethod = needsOcr ? "PDF_OCR" : "PDF_TEXT_AND_OCR";
    }
    emit(onProgress, "PROCESSING", "Processando histórico...", 0.62);
    const analysis = parseCtpsDigital(lines, {
      pageCount: pdf.numPages,
      textCharacters: lines.reduce((sum, line) => sum + line.text.length, 0),
      extractionMethod,
    });
    emit(onProgress, "VALIDATING", "Validando informações...", 0.82);
    if (signal.aborted) throw new DOMException("Processamento cancelado", "AbortError");
    emit(onProgress, "GENERATING", "Gerando análise...", 1);
    return analysis;
  } finally {
    await pdf.loadingTask.destroy().catch(() => undefined);
  }
}
