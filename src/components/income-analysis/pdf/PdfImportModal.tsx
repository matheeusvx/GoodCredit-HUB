import { useEffect, useMemo, useRef, useState } from "react";
import { FileText, RotateCcw, ShieldCheck, X } from "lucide-react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { BankTransaction } from "../../../types/incomeAnalysis";
import { ParsedPdfTransaction, PdfBankCode, PdfDocumentInfo, PdfImportError, PdfImportStatus, PdfImportSummary, PdfParseResult, ReconstructedPdfLine } from "../../../types/pdfImport";
import { flagPossibleDuplicates, suggestTransactionClassification } from "../../../lib/income-analysis/transactionClassifier";
import { PDF_BANK_OPTIONS, PDF_IMPORT_CONFIG } from "../../../lib/income-analysis/pdf/pdfConfig";
import { detectPdfBank } from "../../../lib/income-analysis/pdf/parsers/parserRegistry";
import { loadPdfFile } from "../../../lib/income-analysis/pdf/pdfLoader";
import { extractPdfText, PdfTextExtractionResult } from "../../../lib/income-analysis/pdf/pdfTextExtractor";
import { flagPdfDuplicates } from "../../../lib/income-analysis/pdf/pdfDuplicateDetector";
import { parsePdfTransactions, summarizePdfParse } from "../../../lib/income-analysis/pdf/pdfTransactionParser";
import { hashPdfFile, readPdfImportHistory, rememberPdfImport } from "../../../lib/income-analysis/pdf/pdfFileHash";
import { processPdfWithOcr } from "../../../lib/income-analysis/pdf/ocrProcessor";
import { maskAccount } from "../../../lib/income-analysis/formatters";
import { PdfFileDropzone } from "./PdfFileDropzone";
import { PdfPageSelector } from "./PdfPageSelector";
import { PdfImportProgress } from "./PdfImportProgress";
import { PdfPasswordModal } from "./PdfPasswordModal";
import { PdfOcrPrompt } from "./PdfOcrPrompt";
import { PdfExtractionSummary } from "./PdfExtractionSummary";
import { PdfTransactionReviewTable } from "./PdfTransactionReviewTable";
import { PdfTextParserFallback } from "./PdfTextParserFallback";
import { PdfExtractedLinesModal } from "./PdfExtractedLinesModal";

const ACTIVE_STATUSES: PdfImportStatus[] = ["READING", "EXTRACTING_TEXT", "OCR_RUNNING", "PARSING", "IMPORTING"];

function bankCodeFromLabel(label: string): PdfBankCode {
  const normalized = label.toLocaleLowerCase("pt-BR");
  if (normalized.includes("caixa")) return "CAIXA";
  if (normalized.includes("brasil")) return "BANCO_DO_BRASIL";
  if (normalized.includes("bradesco")) return "BRADESCO";
  if (normalized.includes("ita")) return "ITAU";
  if (normalized.includes("santander")) return "SANTANDER";
  if (normalized.includes("inter")) return "INTER";
  if (normalized.includes("nubank")) return "NUBANK";
  if (normalized.includes("mercado pago")) return "MERCADO_PAGO";
  if (normalized.includes("c6")) return "C6";
  return "AUTO";
}

function pageRange(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function mergeResults(...results: PdfParseResult[]): PdfParseResult {
  return {
    transactions: results.flatMap((result) => result.transactions),
    ignoredLines: results.flatMap((result) => result.ignoredLines),
    ambiguousLines: results.flatMap((result) => result.ambiguousLines),
    parserId: "mixed",
    parserLabel: "Texto + OCR",
  };
}

export function PdfImportModal({ existing, analysisBank, periodStart, periodEnd, onConfirm, onClose }: { existing: BankTransaction[]; analysisBank: string; periodStart: string; periodEnd: string; onConfirm: (transactions: BankTransaction[]) => void; onClose: () => void }) {
  const documentRef = useRef<PDFDocumentProxy | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const extractionRef = useRef<PdfTextExtractionResult | null>(null);
  const [status, setStatus] = useState<PdfImportStatus>("IDLE");
  const [file, setFile] = useState<File | null>(null);
  const [fileHash, setFileHash] = useState("");
  const [pageCount, setPageCount] = useState(0);
  const [pageStart, setPageStart] = useState(1);
  const [pageEnd, setPageEnd] = useState(1);
  const [bankCode, setBankCode] = useState<PdfBankCode>(() => bankCodeFromLabel(analysisBank));
  const [detectedBank, setDetectedBank] = useState<PdfBankCode>("AUTO");
  const [account, setAccount] = useState("");
  const [documentInfo, setDocumentInfo] = useState<PdfDocumentInfo | null>(null);
  const [transactions, setTransactions] = useState<ParsedPdfTransaction[]>([]);
  const [summary, setSummary] = useState<PdfImportSummary | null>(null);
  const [progress, setProgress] = useState({ label: "", value: 0 });
  const [error, setError] = useState<PdfImportError | null>(null);
  const [passwordError, setPasswordError] = useState("");
  const [notice, setNotice] = useState("");
  const [showExtractedLines, setShowExtractedLines] = useState(false);
  const busy = ACTIVE_STATUSES.includes(status);
  const selectedPages = useMemo(() => pageRange(pageStart, pageEnd), [pageStart, pageEnd]);

  useEffect(() => () => { controllerRef.current?.abort(); void documentRef.current?.loadingTask.destroy(); }, []);

  async function clearDocument() {
    controllerRef.current?.abort();
    controllerRef.current = null;
    extractionRef.current = null;
    if (documentRef.current) await documentRef.current.loadingTask.destroy().catch(() => undefined);
    documentRef.current = null;
  }

  async function reset() {
    await clearDocument();
    setFile(null); setFileHash(""); setPageCount(0); setPageStart(1); setPageEnd(1); setDocumentInfo(null); setTransactions([]); setSummary(null); setProgress({ label: "", value: 0 }); setError(null); setPasswordError(""); setNotice(""); setShowExtractedLines(false); setStatus("IDLE");
  }

  function validateFile(candidate: File): PdfImportError | null {
    if (!candidate.size) return { code: "EMPTY_FILE", message: "O arquivo selecionado está vazio." };
    if (candidate.type !== "application/pdf" && !candidate.name.toLowerCase().endsWith(".pdf")) return { code: "INVALID_FILE", message: "Selecione um arquivo PDF válido." };
    if (candidate.size > PDF_IMPORT_CONFIG.maxFileSizeMb * 1024 * 1024) return { code: "FILE_TOO_LARGE", message: `O arquivo excede o limite de ${PDF_IMPORT_CONFIG.maxFileSizeMb} MB.` };
    return null;
  }

  async function selectFile(candidate: File) {
    const validation = validateFile(candidate);
    if (validation) { setError(validation); setStatus("ERROR"); return; }
    await clearDocument();
    setFile(candidate); setError(null); setNotice(""); setStatus("READING"); setProgress({ label: "Verificando o arquivo", value: 0.08 });
    const hash = await hashPdfFile(candidate);
    setFileHash(hash);
    if (readPdfImportHistory().some((record) => record.hash === hash) && !window.confirm("Este arquivo parece já ter sido importado. Deseja processá-lo novamente?")) { await reset(); return; }
    await openFile(candidate);
  }

  async function openFile(candidate: File, password?: string) {
    setStatus("READING"); setProgress({ label: "Abrindo PDF localmente", value: 0.15 }); setPasswordError("");
    try {
      const loaded = await loadPdfFile(candidate, password);
      documentRef.current = loaded.document;
      const count = loaded.document.numPages;
      if (!count) throw { code: "CORRUPTED_PDF", message: "O PDF não possui páginas válidas." } satisfies PdfImportError;
      setPageCount(count); setPageStart(1); setPageEnd(Math.min(count, PDF_IMPORT_CONFIG.maxPages));
      if (count > PDF_IMPORT_CONFIG.maxPages) setNotice(`O documento possui ${count} páginas. Selecione um intervalo de até ${PDF_IMPORT_CONFIG.maxPages} páginas por processamento.`);
      setStatus("FILE_SELECTED"); setProgress({ label: "PDF pronto para processamento", value: 0 });
    } catch (caught) {
      const mapped = caught as PdfImportError;
      if (mapped.code === "PASSWORD_REQUIRED" || mapped.code === "WRONG_PASSWORD") { setStatus("PASSWORD_REQUIRED"); setPasswordError(mapped.code === "WRONG_PASSWORD" ? mapped.message : ""); return; }
      setError(mapped); setStatus("ERROR");
    }
  }

  function parsingContext(source: "PDF_TEXT" | "PDF_OCR", overrideBank?: PdfBankCode) {
    return { bankCode: overrideBank || (bankCode === "AUTO" ? detectedBank : bankCode), account, periodStart, periodEnd, fallbackYear: periodStart ? Number(periodStart.slice(0, 4)) : undefined, source } as const;
  }

  function reviewResult(result: PdfParseResult, lineCount: number, allowTextFallback = false) {
    const flagged = flagPdfDuplicates(result.transactions, existing);
    if (!flagged.length) {
      if (allowTextFallback) { setError(null); setNotice("O documento possui texto, mas o formato do extrato ainda não foi reconhecido corretamente."); setStatus("TEXT_EXTRACTED"); return; }
      setError({ code: "NO_TRANSACTIONS", message: "Não identificamos movimentações automaticamente. Revise o intervalo ou use a importação manual/CSV." }); setStatus("ERROR"); return;
    }
    setNotice("");
    setTransactions(flagged);
    setSummary(summarizePdfParse({ ...result, transactions: flagged }, lineCount));
    setStatus("REVIEWING");
  }

  async function extractText() {
    if (!documentRef.current) return;
    if (selectedPages.length > PDF_IMPORT_CONFIG.maxPages) { setError({ code: "TOO_MANY_PAGES", message: `Selecione no máximo ${PDF_IMPORT_CONFIG.maxPages} páginas.` }); return; }
    const controller = new AbortController(); controllerRef.current = controller; setError(null); setStatus("EXTRACTING_TEXT");
    try {
      const extraction = await extractPdfText(documentRef.current, selectedPages, (item) => setProgress({ label: item.label, value: item.progress }), controller.signal);
      extractionRef.current = extraction; setDocumentInfo(extraction.info);
      const text = extraction.lines.map((line) => line.text).join(" "); const bank = detectPdfBank(text); setDetectedBank(bank); if (bankCode === "AUTO" && bank !== "AUTO") setBankCode(bank);
      if (extraction.info.documentType === "TEXT") { setStatus("PARSING"); reviewResult(parsePdfTransactions(extraction.lines, parsingContext("PDF_TEXT", bank)), extraction.lines.length, true); }
      else setStatus("OCR_REQUIRED");
    } catch (caught) {
      if ((caught as Error).name === "AbortError") { setStatus("CANCELLED"); setNotice("Processamento cancelado."); return; }
      setError({ code: "UNKNOWN", message: "Falha ao extrair o texto do PDF. Você pode escolher outro arquivo ou usar CSV." }); setStatus("ERROR");
    }
  }

  function reviewExtractedText() {
    const extraction = extractionRef.current; if (!extraction) return;
    reviewResult(parsePdfTransactions(extraction.lines, parsingContext("PDF_TEXT")), extraction.lines.length, true);
  }

  function parseExtractedWith(parserId: "nubank" | "generic") {
    const extraction = extractionRef.current; if (!extraction) return;
    setStatus("PARSING"); setError(null);
    reviewResult(parsePdfTransactions(extraction.lines, parsingContext("PDF_TEXT", parserId === "nubank" ? "NUBANK" : bankCode), parserId), extraction.lines.length, true);
  }

  async function runOcr() {
    if (!documentRef.current || !extractionRef.current) return;
    const extraction = extractionRef.current; const ocrPages = extraction.info.documentType === "MIXED" ? extraction.info.scannedPages : selectedPages;
    const controller = new AbortController(); controllerRef.current = controller; setStatus("OCR_RUNNING"); setError(null);
    try {
      const ocrLines = await processPdfWithOcr(documentRef.current, ocrPages, (item) => setProgress({ label: item.label, value: item.progress }), controller.signal);
      const results: PdfParseResult[] = [];
      if (extraction.lines.length) results.push(parsePdfTransactions(extraction.lines, parsingContext("PDF_TEXT")));
      results.push(parsePdfTransactions(ocrLines, parsingContext("PDF_OCR")));
      reviewResult(mergeResults(...results), extraction.lines.length + ocrLines.length);
    } catch (caught) {
      if ((caught as Error).name === "AbortError" || controller.signal.aborted) { setStatus("CANCELLED"); setNotice("OCR cancelado. O arquivo não foi importado."); return; }
      setError({ code: "OCR_UNAVAILABLE", message: "Não foi possível executar o OCR local. Escolha outro arquivo ou use a importação manual/CSV." }); setStatus("ERROR");
    }
  }

  async function confirmImport() {
    if (!file) return;
    const chosen = transactions.filter((item) => item.selected && item.date && item.amount && item.amount > 0);
    if (!chosen.length) { setError({ code: "NO_TRANSACTIONS", message: "Selecione ao menos uma movimentação válida para importar." }); return; }
    setStatus("IMPORTING");
    const imported = chosen.map<BankTransaction>((item) => {
      const type = item.direction === "DEBIT" ? "DEBIT" : "CREDIT";
      const base: BankTransaction = {
        id: `${item.id}-confirmed`, selected: false, date: item.date!, competence: item.competence || item.date!.slice(0, 7), description: item.description, payer: item.payer, reference: "", type, amount: item.amount!, account: maskAccount(item.account), participant: "",
        classification: type === "DEBIT" ? "EXCLUDE" : "REVIEW", reason: type === "DEBIT" ? "OTHER" : item.confidence < 0.6 ? "LOW_CONFIDENCE" : "GENERIC_DESCRIPTION",
        note: `Importado de PDF ${item.source === "PDF_OCR" ? "com OCR local" : "com texto"}. Confiança indicativa: ${Math.round(item.confidence * 100)}%.`, classificationSource: "SUGGESTED", source: item.source,
      };
      const suggestion = item.classificationHint === "SAME_OWNERSHIP"
        ? { classification: "EXCLUDE" as const, reason: "SAME_OWNERSHIP" as const, label: "Possível transferência de mesma titularidade" }
        : suggestTransactionClassification(base);
      return { ...base, suggestion };
    });
    onConfirm(flagPossibleDuplicates([...existing, ...imported]));
    rememberPdfImport({ hash: fileHash, name: file.name, size: file.size, importedAt: new Date().toISOString() });
    setStatus("COMPLETED"); await clearDocument(); onClose();
  }

  const documentTypeLabel = documentInfo?.documentType === "TEXT" ? "PDF com texto" : documentInfo?.documentType === "SCANNED" ? "PDF digitalizado" : documentInfo?.documentType === "MIXED" ? "PDF misto" : "Não identificado";
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-2 sm:p-4" role="dialog" aria-modal="true" aria-label="Importar extrato em PDF">
    <div className="relative flex max-h-[96vh] w-full max-w-[1500px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
      <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6"><div><h2 className="flex items-center gap-2 text-xl font-bold text-slate-950"><FileText className="h-5 w-5 text-emerald-600" /> Importar extrato em PDF</h2><p className="mt-1 text-sm text-slate-500">Extração local com revisão obrigatória antes da importação.</p></div><button type="button" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Fechar" onClick={() => { if (!busy || window.confirm("Cancelar o processamento atual?")) { void clearDocument().then(onClose); } }}><X className="h-5 w-5" /></button></header>
      <div className="overflow-y-auto p-5 sm:p-6">
        {status === "IDLE" && <PdfFileDropzone disabled={busy} onFile={(candidate) => { void selectFile(candidate); }} />}
        {file && status !== "IDLE" && <div className="mb-5 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-4"><div><p className="text-xs font-semibold text-slate-500">Arquivo</p><p className="truncate font-semibold text-slate-900" title={file.name}>{file.name}</p></div><div><p className="text-xs font-semibold text-slate-500">Tamanho</p><p className="font-semibold">{(file.size / 1024 / 1024).toFixed(2)} MB</p></div><div><p className="text-xs font-semibold text-slate-500">Páginas</p><p className="font-semibold">{pageCount || "Lendo..."}</p></div><div><p className="text-xs font-semibold text-slate-500">Tipo detectado</p><p className="font-semibold">{documentTypeLabel}</p></div></div>}
        {notice && <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{notice}</p>}
        {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><strong>Não foi possível concluir.</strong> {error.message}<div className="mt-3 flex flex-wrap gap-2"><button type="button" className="btn-muted" onClick={() => { setError(null); if (documentRef.current) setStatus("FILE_SELECTED"); else void reset(); }}><RotateCcw className="h-4 w-4" /> Tentar novamente</button><button type="button" className="btn-secondary" onClick={() => { void reset(); }}>Escolher outro arquivo</button></div></div>}
        {status === "FILE_SELECTED" && <div className="grid gap-5 lg:grid-cols-[1fr_1fr]"><section className="rounded-xl border border-slate-200 p-4"><h3 className="font-bold text-slate-900">Páginas do extrato</h3><p className="mt-1 text-sm text-slate-500">Selecione somente o período necessário. O limite por processamento é de {PDF_IMPORT_CONFIG.maxPages} páginas.</p><div className="mt-4"><PdfPageSelector start={pageStart} end={pageEnd} pageCount={pageCount} disabled={busy} onChange={(start, end) => { setPageStart(Math.min(start, end)); setPageEnd(Math.max(start, end)); }} /></div></section><section className="rounded-xl border border-slate-200 p-4"><h3 className="font-bold text-slate-900">Contexto da conta</h3><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold text-slate-700">Banco<select className="input-field mt-2" value={bankCode} onChange={(event) => setBankCode(event.target.value as PdfBankCode)}>{PDF_BANK_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label><label className="text-sm font-semibold text-slate-700">Conta analisada<input className="input-field mt-2" value={account} onChange={(event) => setAccount(event.target.value)} placeholder="Ex.: 12345-6" /></label></div></section><div className="lg:col-span-2 flex justify-end"><button type="button" className="btn-primary" onClick={() => { void extractText(); }}>Ler movimentações</button></div></div>}
        {busy && <PdfImportProgress label={progress.label || "Processando localmente"} progress={progress.value} onCancel={() => controllerRef.current?.abort()} />}
        {status === "OCR_REQUIRED" && <PdfOcrPrompt mixed={documentInfo?.documentType === "MIXED"} onOcr={() => { void runOcr(); }} onReviewText={reviewExtractedText} onCancel={() => { void reset(); }} />}
        {status === "TEXT_EXTRACTED" && <PdfTextParserFallback canInspectLines={import.meta.env.DEV} onNubank={() => parseExtractedWith("nubank")} onGeneric={() => parseExtractedWith("generic")} onSelectBank={() => setStatus("FILE_SELECTED")} onInspectLines={() => setShowExtractedLines(true)} onOcr={() => { void runOcr(); }} onManual={onClose} />}
        {status === "REVIEWING" && summary && <div className="space-y-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-bold text-slate-950">Revisar movimentações extraídas</h3><p className="text-sm text-slate-500">Confira e corrija cada linha. Créditos não são classificados automaticamente como renda.</p></div><div className="flex flex-wrap items-center gap-2">{import.meta.env.DEV && <button type="button" className="btn-muted h-9" onClick={() => setShowExtractedLines(true)}>Visualizar linhas extraídas</button>}<span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">{transactions[0]?.source === "PDF_OCR" ? "OCR local" : documentInfo?.documentType === "MIXED" ? "Texto + OCR" : "Texto pesquisável"}</span></div></div><PdfExtractionSummary summary={summary} /><PdfTransactionReviewTable transactions={transactions} onChange={setTransactions} /><div className="flex flex-col-reverse justify-between gap-3 border-t border-slate-200 pt-4 sm:flex-row"><p className="flex items-center gap-2 text-xs text-slate-500"><ShieldCheck className="h-4 w-4 text-emerald-600" /> Texto bruto, imagens e senha não são salvos.</p><div className="flex flex-wrap justify-end gap-3"><button type="button" className="btn-muted" onClick={() => { void reset(); }}>Cancelar</button><button type="button" className="btn-primary" onClick={() => { void confirmImport(); }}>Confirmar Importação</button></div></div></div>}
      </div>
      {status === "PASSWORD_REQUIRED" && file && <PdfPasswordModal error={passwordError} onSubmit={(password) => { void openFile(file, password); }} onCancel={() => { void reset(); }} />}
      {showExtractedLines && extractionRef.current && <PdfExtractedLinesModal lines={extractionRef.current.lines} onClose={() => setShowExtractedLines(false)} />}
    </div>
  </div>;
}
