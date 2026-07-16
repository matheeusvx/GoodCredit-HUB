import type { BankTransaction } from "./incomeAnalysis";
import type { PdfBankCode, PdfReconciliation } from "./pdfImport";

export type SupportedBank = Exclude<PdfBankCode, "AUTO" | "OTHER" | "BANCO_DO_BRASIL" | "C6"> | "OTHER";
export type StatementFileFormat = "PDF" | "CSV" | "XLSX" | "XLS";
export type StatementFileStatus =
  | "READY"
  | "READING"
  | "PROCESSING"
  | "COMPLETED"
  | "DIVERGENT"
  | "REVIEW_REQUIRED"
  | "PASSWORD_REQUIRED"
  | "UNRECOGNIZED"
  | "ERROR";

export type NormalizedTransactionClassification =
  | "INCLUDED_INCOME"
  | "EXCLUDED_SAME_OWNER"
  | "EXCLUDED_RELATED_PERSON"
  | "EXCLUDED_INTERNAL_TRANSFER"
  | "EXCLUDED_INVESTMENT_REDEMPTION"
  | "EXCLUDED_REFUND"
  | "EXCLUDED_REVERSAL"
  | "EXCLUDED_LOAN"
  | "EXCLUDED_FINANCIAL_YIELD"
  | "EXCLUDED_DUPLICATE"
  | "EXCLUDED_ASSET_SALE"
  | "EXCLUDED_TRANSITORY_MOVEMENT"
  | "EXCLUDED_OTHER"
  | "PENDING_REVIEW";

export type ExtractionMethod = "PDF_TEXT" | "PDF_OCR" | "CSV" | "XLSX";
export type ReconciliationStatus = "RECONCILED" | "SMALL_DIFFERENCE" | "DIVERGENCE" | "NO_SUMMARY";

export interface NormalizedBankTransaction {
  id: string;
  sourceFileId: string;
  bank: SupportedBank;
  accountHolder: string;
  maskedAccount: string;
  date: string | null;
  time: string | null;
  competence: string | null;
  description: string;
  counterparty: string;
  amount: number;
  direction: "CREDIT" | "DEBIT";
  balance: number | null;
  documentId: string;
  sourcePage: number | null;
  sourceRow: number | null;
  parserId: string;
  extractionMethod: ExtractionMethod;
  extractionConfidence: number;
  classification: NormalizedTransactionClassification;
  classificationReason: string;
  classificationConfidence: number;
  warnings: string[];
  fingerprint: string;
  linkedTransactionId?: string;
  manuallyReviewed?: boolean;
}

export interface StatementFileRecord {
  id: string;
  file: File;
  name: string;
  size: number;
  format: StatementFileFormat;
  pageCount: number | null;
  bank: SupportedBank | "AUTO";
  holderMasked: string;
  accountMasked: string;
  periodStart: string | null;
  periodEnd: string | null;
  documentType: "TEXT" | "SCANNED" | "MIXED" | "SPREADSHEET" | "UNKNOWN";
  needsOcr: boolean;
  status: StatementFileStatus;
  parserId: string;
  extractionMethod: ExtractionMethod | null;
  transactions: NormalizedBankTransaction[];
  reconciliation: StatementReconciliation;
  warnings: string[];
  processingTimeMs?: number;
}

export interface StatementReconciliation {
  status: ReconciliationStatus;
  creditTotal: number;
  debitTotal: number;
  statementCreditTotal: number | null;
  statementDebitTotal: number | null;
  openingBalance: number | null;
  closingBalance: number | null;
  difference: number | null;
  method: "SUMMARY" | "BALANCE_SEQUENCE" | "DAILY_BALANCE" | "NOT_AVAILABLE";
  warnings: string[];
}

export interface StatementProcessingProgress {
  fileId: string;
  fileName: string;
  step: number;
  stepLabel: string;
  currentPage: number;
  totalPages: number;
  percent: number;
  completedFiles: number;
  warningFiles: number;
}

export interface RelatedPerson {
  id: string;
  name: string;
  relationship: string;
}

export interface MonthlyStatementAnalysis {
  competence: string;
  totalCredits: number;
  totalDebits: number;
  confirmedIncome: number;
  potentialIncome: number;
  excludedAmount: number;
  pendingAmount: number;
  transactionCount: number;
  payerCount: number;
  topPayers: Array<{ name: string; total: number }>;
  complete: boolean;
  reconciliationStatus: ReconciliationStatus;
}

export interface PayerConcentrationResult {
  payer: string;
  total: number;
  share: number;
  months: number;
  occurrences: number;
  averageTicket: number;
  variation: number;
}

export interface AutomatedIncomeResult {
  clientName: string;
  transactions: NormalizedBankTransaction[];
  files: StatementFileRecord[];
  months: MonthlyStatementAnalysis[];
  confirmedIncomeTotal: number;
  potentialIncomeTotal: number;
  confirmedMonthlyIncome: number;
  potentialMonthlyIncome: number;
  medianIncome: number;
  totalCredits: number;
  totalDebits: number;
  totalExcluded: number;
  totalPending: number;
  completeMonths: number;
  incompleteMonths: number;
  stability: "HIGH" | "MODERATE" | "ELEVATED" | "INSUFFICIENT";
  stabilityLabel: string;
  payerConcentration: PayerConcentrationResult[];
  topPayerShare: number;
  topThreePayerShare: number;
  extractionConfidence: number;
  classificationConfidence: number;
  reconciliationStatus: ReconciliationStatus;
  explanation: string[];
  generatedAt: string;
}

export interface AutomatedIncomeState {
  clientName: string;
  relatedPeople: RelatedPerson[];
  files: StatementFileRecord[];
  transactions: NormalizedBankTransaction[];
  result: AutomatedIncomeResult | null;
}

export function toLegacyTransaction(transaction: NormalizedBankTransaction): BankTransaction {
  const classification = transaction.classification === "INCLUDED_INCOME"
    ? "INCLUDE"
    : transaction.classification === "PENDING_REVIEW"
      ? "REVIEW"
      : "EXCLUDE";
  return {
    id: transaction.id,
    selected: false,
    date: transaction.date || "",
    competence: transaction.competence || "",
    description: transaction.description,
    payer: transaction.counterparty,
    reference: transaction.documentId,
    type: transaction.direction,
    amount: transaction.amount,
    account: transaction.maskedAccount,
    participant: transaction.accountHolder,
    classification,
    reason: classification === "INCLUDE" ? "PROFESSIONAL_REVENUE" : classification === "REVIEW" ? "LOW_CONFIDENCE" : "OTHER",
    note: transaction.classificationReason,
    classificationSource: transaction.manuallyReviewed ? "MANUAL" : "SUGGESTED",
    source: transaction.extractionMethod === "XLSX" ? "CSV" : transaction.extractionMethod,
    sourceFileId: transaction.sourceFileId,
    bank: transaction.bank,
    sourcePage: transaction.sourcePage,
    sourceRow: transaction.sourceRow,
    parserId: transaction.parserId,
    extractionConfidence: transaction.extractionConfidence,
    classificationReason: transaction.classificationReason,
    classificationConfidence: transaction.classificationConfidence,
    balance: transaction.balance,
    warnings: transaction.warnings,
    fingerprint: transaction.fingerprint,
  };
}

export function reconciliationFromPdf(value?: PdfReconciliation): StatementReconciliation {
  const difference = value?.balanceDifference ?? value?.creditDifference ?? value?.debitDifference ?? null;
  return {
    status: !value || value.status === "NOT_AVAILABLE" ? "NO_SUMMARY" : value.status === "MATCHED" ? "RECONCILED" : Math.abs(difference || 0) <= 0.01 ? "SMALL_DIFFERENCE" : "DIVERGENCE",
    creditTotal: value?.parsedCreditTotal || 0,
    debitTotal: value?.parsedDebitTotal || 0,
    statementCreditTotal: value?.statementCreditTotal ?? null,
    statementDebitTotal: value?.statementDebitTotal ?? null,
    openingBalance: value?.openingBalance ?? null,
    closingBalance: value?.closingBalance ?? null,
    difference,
    method: value?.method || (value?.status === "NOT_AVAILABLE" ? "NOT_AVAILABLE" : "SUMMARY"),
    warnings: value?.warnings || [],
  };
}
