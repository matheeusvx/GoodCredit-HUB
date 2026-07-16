import type { PDFDocumentProxy } from "pdfjs-dist";
import type { StatementFileRecord, StatementProcessingProgress, SupportedBank } from "../../types/statementAnalysis";
import { detectPdfBank } from "../income-analysis/pdf/parsers/parserRegistry";
import { extractPdfText } from "../income-analysis/pdf/pdfTextExtractor";
import { loadPdfFile } from "../income-analysis/pdf/pdfLoader";
import { processPdfWithOcr } from "../income-analysis/pdf/ocrProcessor";
import { parsePdfTransactions } from "../income-analysis/pdf/pdfTransactionParser";
import { maskAccount } from "../income-analysis/formatters";
import { reconciliationFromPdf } from "../../types/statementAnalysis";
import { normalizePdfTransactions, supportedBank } from "./statementNormalizer";
import { parseStatementSpreadsheet } from "./statementSpreadsheetImport";
import type { ReconstructedPdfLine } from "../../types/pdfImport";

export const PROCESSING_STEPS = ["Validando arquivos", "Identificando o banco", "Verificando a camada de texto", "Extraindo páginas", "Executando OCR quando necessário", "Reconstruindo linhas e colunas", "Identificando movimentações", "Separando entradas e saídas", "Removendo saldos e totais", "Detectando duplicidades", "Detectando transferências internas", "Classificando as entradas", "Conciliando valores", "Calculando a renda mensal", "Gerando o diagnóstico"];

function emit(onProgress: (value: StatementProcessingProgress) => void, file: StatementFileRecord, step: number, detail = "", currentPage = 0, totalPages = 0) {
  onProgress({ fileId: file.id, fileName: file.name, step, stepLabel: detail || PROCESSING_STEPS[step], currentPage, totalPages, percent: Math.round(((step + (currentPage && totalPages ? currentPage / totalPages : 0)) / PROCESSING_STEPS.length) * 100), completedFiles: 0, warningFiles: 0 });
}

export function createStatementFileRecord(file: File): StatementFileRecord {
  const extension = file.name.split(".").pop()?.toUpperCase(); const format = extension === "PDF" ? "PDF" : extension === "XLSX" ? "XLSX" : extension === "XLS" ? "XLS" : "CSV";
  return { id: `statement-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, file, name: file.name, size: file.size, format, pageCount: null, bank: "AUTO", holderMasked: "Não identificado", accountMasked: "Não identificada", periodStart: null, periodEnd: null, documentType: format === "PDF" ? "UNKNOWN" : "SPREADSHEET", needsOcr: false, status: "READY", parserId: "", extractionMethod: null, transactions: [], reconciliation: { status: "NO_SUMMARY", creditTotal: 0, debitTotal: 0, statementCreditTotal: null, statementDebitTotal: null, openingBalance: null, closingBalance: null, difference: null, method: "NOT_AVAILABLE", warnings: [] }, warnings: [] };
}

function derivePeriod(transactions: StatementFileRecord["transactions"]) { const dates = transactions.map((item) => item.date).filter((value): value is string => Boolean(value)).sort(); return { start: dates[0] || null, end: dates.at(-1) || null }; }

function maskedMetadata(lines: ReconstructedPdfLine[]) {
  const header = lines.filter((line) => line.pageNumber === 1).slice(0, 45); let holder = "Não identificado"; let account = "Não identificada";
  for (let index = 0; index < header.length; index += 1) {
    const accountMatch = header[index].text.match(/conta\s*:?\s*([\d.\-]+)/i); if (accountMatch) account = maskAccount(accountMatch[1]);
    if (!/(cpf|cnpj)|\d{3}\.\d{3}\.\d{3}-\d{2}|\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/i.test(header[index].text) || index === 0) continue;
    const candidate = header[index - 1].text.trim(); if (!/^[A-Za-zÀ-ÿ' ]{5,100}$/.test(candidate)) continue;
    holder = candidate.split(/\s+/).filter(Boolean).map((part) => `${part[0]}${"*".repeat(Math.min(5, Math.max(2, part.length - 1)))}`).join(" ");
  }
  return { holder, account };
}

export async function processStatementFile(fileRecord: StatementFileRecord, onProgress: (value: StatementProcessingProgress) => void, signal: AbortSignal): Promise<StatementFileRecord> {
  const started = performance.now(); const record = { ...fileRecord, status: "PROCESSING" as const, warnings: [] as string[] };
  emit(onProgress, record, 0); if (!record.file.size) throw new Error("Arquivo vazio.");
  if (record.format !== "PDF") {
    emit(onProgress, record, 1, "Identificando colunas da planilha"); const parsed = await parseStatementSpreadsheet(record.file, record.id, record.format);
    emit(onProgress, record, 6, "Normalizando movimentações da planilha"); const period = derivePeriod(parsed.transactions);
    return { ...record, status: parsed.transactions.length ? parsed.confidence >= 0.8 ? "COMPLETED" : "REVIEW_REQUIRED" : "UNRECOGNIZED", extractionMethod: "XLSX", parserId: "spreadsheet-auto", transactions: parsed.transactions, warnings: parsed.warnings, periodStart: period.start, periodEnd: period.end, processingTimeMs: performance.now() - started };
  }
  let document: PDFDocumentProxy | null = null;
  try {
    emit(onProgress, record, 1, "Abrindo PDF localmente"); const loaded = await loadPdfFile(record.file); document = loaded.document; record.pageCount = document.numPages;
    const pages = Array.from({ length: document.numPages }, (_, index) => index + 1); emit(onProgress, record, 2);
    const extraction = await extractPdfText(document, pages, (progress) => emit(onProgress, record, 3, progress.label, progress.pageNumber, progress.totalPages), signal);
    record.documentType = extraction.info.documentType; record.needsOcr = extraction.info.documentType !== "TEXT";
    const metadata = maskedMetadata(extraction.lines); record.holderMasked = metadata.holder; record.accountMasked = metadata.account;
    const documentText = extraction.lines.map((line) => line.text).join(" "); const bankCode = detectPdfBank(documentText); record.bank = supportedBank(bankCode);
    let lines = extraction.lines; let method: "PDF_TEXT" | "PDF_OCR" = "PDF_TEXT";
    if (extraction.info.documentType === "SCANNED" || (record.bank === "CAIXA" && extraction.info.textCharacters < 100)) {
      emit(onProgress, record, 4, "Executando OCR local"); lines = await processPdfWithOcr(document, pages, (progress) => emit(onProgress, record, 4, progress.label, progress.pageNumber, progress.totalPages), signal); method = "PDF_OCR"; record.needsOcr = true;
    }
    emit(onProgress, record, 5); emit(onProgress, record, 6, `Identificando transações de ${record.bank}`);
    const parsed = parsePdfTransactions(lines, { bankCode, account: record.accountMasked, source: method }); const transactions = normalizePdfTransactions({ sourceFileId: record.id, bank: bankCode, holder: record.holderMasked, account: maskAccount(record.accountMasked), parserId: parsed.parserId || "generic", extractionMethod: method, transactions: parsed.transactions });
    const period = derivePeriod(transactions); const reconciliation = reconciliationFromPdf(parsed.reconciliation); const requiresReview = parsed.ambiguousLines.length > 0 || reconciliation.status === "DIVERGENCE" || parsed.parserId === "generic";
    emit(onProgress, record, 12, "Conferindo totais e saldos");
    return { ...record, status: !transactions.length ? "UNRECOGNIZED" : reconciliation.status === "DIVERGENCE" ? "DIVERGENT" : requiresReview ? "REVIEW_REQUIRED" : "COMPLETED", parserId: parsed.parserId || "generic", extractionMethod: method, transactions, reconciliation, periodStart: period.start, periodEnd: period.end, warnings: [...(parsed.reconciliation?.warnings || []), ...(parsed.ambiguousLines.length ? [`${parsed.ambiguousLines.length} linhas precisam de revisão.`] : [])], processingTimeMs: performance.now() - started };
  } finally { await document?.loadingTask.destroy().catch(() => undefined); }
}
