export type PdfImportStatus =
  | "IDLE"
  | "FILE_SELECTED"
  | "READING"
  | "PASSWORD_REQUIRED"
  | "EXTRACTING_TEXT"
  | "TEXT_EXTRACTED"
  | "OCR_REQUIRED"
  | "OCR_RUNNING"
  | "PARSING"
  | "REVIEWING"
  | "IMPORTING"
  | "COMPLETED"
  | "CANCELLED"
  | "ERROR";

export type PdfDocumentType = "TEXT" | "SCANNED" | "MIXED" | "UNKNOWN";
export type TransactionDirection = "CREDIT" | "DEBIT" | "UNKNOWN";
export type PdfTransactionSource = "PDF_TEXT" | "PDF_OCR";

export interface PdfTextItem {
  text: string;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ReconstructedPdfLine {
  pageNumber: number;
  y: number;
  text: string;
  items: PdfTextItem[];
}

export interface ParsedPdfTransaction {
  id: string;
  selected: boolean;
  date: string | null;
  competence: string | null;
  description: string;
  payer: string;
  amount: number | null;
  direction: TransactionDirection;
  account: string;
  pageNumber: number;
  source: PdfTransactionSource;
  confidence: number;
  rawText: string;
  warnings: string[];
  duplicateOf?: string;
  classificationHint?: "SAME_OWNERSHIP";
}

export type PdfBankCode =
  | "AUTO"
  | "CAIXA"
  | "BANCO_DO_BRASIL"
  | "BRADESCO"
  | "ITAU"
  | "SANTANDER"
  | "INTER"
  | "NUBANK"
  | "C6"
  | "OTHER";

export interface PdfParsingContext {
  bankCode: PdfBankCode;
  account: string;
  periodStart?: string;
  periodEnd?: string;
  fallbackYear?: number;
  source: PdfTransactionSource;
}

export interface PdfParseResult {
  transactions: ParsedPdfTransaction[];
  ignoredLines: ReconstructedPdfLine[];
  ambiguousLines: ReconstructedPdfLine[];
  parserId?: string;
  parserLabel?: string;
  reconciliation?: PdfReconciliation;
}

export type PdfReconciliationStatus = "MATCHED" | "DIVERGENT" | "NOT_AVAILABLE";

export interface PdfReconciliation {
  statementCreditTotal: number | null;
  parsedCreditTotal: number;
  creditDifference: number | null;
  statementDebitTotal: number | null;
  parsedDebitTotal: number;
  debitDifference: number | null;
  status: PdfReconciliationStatus;
}

export interface PdfImportSummary {
  lineCount: number;
  transactionCount: number;
  credits: number;
  debits: number;
  ambiguous: number;
  creditTotal: number;
  debitTotal: number;
  ignoredLineCount: number;
  parserLabel?: string;
  reconciliation?: PdfReconciliation;
}

export interface PdfImportError {
  code:
    | "INVALID_FILE"
    | "FILE_TOO_LARGE"
    | "EMPTY_FILE"
    | "TOO_MANY_PAGES"
    | "PASSWORD_REQUIRED"
    | "WRONG_PASSWORD"
    | "CORRUPTED_PDF"
    | "WORKER_ERROR"
    | "NO_TRANSACTIONS"
    | "OCR_UNAVAILABLE"
    | "OUT_OF_MEMORY"
    | "CANCELLED"
    | "UNKNOWN";
  message: string;
}

export interface OcrProgress {
  pageNumber: number;
  totalPages: number;
  phase: "PREPARING" | "RENDERING" | "OCR" | "PARSING";
  progress: number;
  label: string;
}

export interface PdfExtractionProgress {
  pageNumber: number;
  totalPages: number;
  progress: number;
  label: string;
}

export interface PdfDocumentInfo {
  pageCount: number;
  documentType: PdfDocumentType;
  textCharacters: number;
  textPages: number[];
  scannedPages: number[];
}

export interface PdfImportFileRecord {
  hash: string;
  name: string;
  size: number;
  importedAt: string;
}

export interface BankStatementParser {
  id: string;
  label: string;
  canHandle(context: PdfParsingContext, documentText: string): number;
  parse(lines: ReconstructedPdfLine[], context: PdfParsingContext): PdfParseResult;
}
