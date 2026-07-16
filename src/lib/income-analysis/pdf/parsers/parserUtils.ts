import type { ParsedPdfTransaction, PdfParsingContext, PdfReconciliation, ReconstructedPdfLine, TransactionDirection } from "../../../../types/pdfImport";
import { competenceFromDate, maskAccount, normalizeDate, normalizeText } from "../../formatters";
import { extractPdfValues, parsePdfMoney } from "../pdfValueParser";

export const MONEY_AT_END = /(?:R\$\s*)?[+-]?\s*(?:\d{1,3}(?:\.\d{3})*|\d+),\d{2}\s*[CD]?\s*$/i;
export const FULL_DATE = /\b(\d{2}[\/-]\d{2}[\/-]\d{4})\b/;

export function sanitizeBankText(value: string): string {
  return value
    .replace(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, "***.***.***-**")
    .replace(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g, "**.***.***/****-**")
    .replace(/\b\d{11,14}\b/g, "************")
    .replace(/(ag[eê]ncia\s*:?\s*)[\d.-]+/gi, "$1****")
    .replace(/(conta\s*:?\s*)[\d.-]+/gi, "$1****")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseDateAtStart(text: string, inheritedYear?: number): { date: string | null; rest: string } {
  const full = text.match(/^\s*(\d{2}[\/-]\d{2}[\/-]\d{4})\s*/);
  if (full) return { date: normalizeDate(full[1]), rest: text.slice(full[0].length).trim() };
  const short = text.match(/^\s*(\d{2}[\/-]\d{2})\s*/);
  if (short && inheritedYear) return { date: normalizeDate(`${short[1]}/${inheritedYear}`), rest: text.slice(short[0].length).trim() };
  return { date: null, rest: text.trim() };
}

export function moneyTokens(text: string) {
  return extractPdfValues(text).filter((item) => /,\d{2}/.test(item.raw));
}

export function moneyFromText(value: string): number | null {
  const parsed = parsePdfMoney(value);
  return parsed === null ? null : Math.abs(parsed);
}

export function directionFromSignedValue(raw: string, fallback: TransactionDirection = "UNKNOWN"): TransactionDirection {
  const compact = raw.replace(/\s/g, "");
  if (/D$/i.test(compact) || /^-/.test(compact) || /R\$-/i.test(compact) || /-$/.test(compact)) return "DEBIT";
  if (/C$/i.test(compact) || /^\+/.test(compact) || /\+$/.test(compact)) return "CREDIT";
  return fallback;
}

export function transaction(params: {
  parserId: string;
  context: PdfParsingContext;
  index: number;
  page: number;
  date: string | null;
  description: string;
  amount: number | null;
  direction: TransactionDirection;
  payer?: string;
  balance?: number | null;
  warnings?: string[];
  confidence?: number;
  classificationHint?: ParsedPdfTransaction["classificationHint"];
}): ParsedPdfTransaction {
  const warnings = [...(params.warnings || [])];
  if (!params.date) warnings.push("Data não identificada.");
  if (params.amount === null) warnings.push("Valor não identificado.");
  if (params.direction === "UNKNOWN") warnings.push("Natureza da movimentação não identificada.");
  const description = sanitizeBankText(params.description) || "Descrição não identificada";
  return {
    id: `pdf-${params.parserId}-${params.page}-${params.index}-${Date.now()}`,
    selected: Boolean(params.date && params.amount !== null && params.direction !== "UNKNOWN"),
    date: params.date,
    competence: params.date ? competenceFromDate(params.date) : null,
    description,
    payer: sanitizeBankText(params.payer || ""),
    amount: params.amount,
    direction: params.direction,
    account: maskAccount(params.context.account),
    pageNumber: params.page,
    source: params.context.source,
    confidence: Math.max(0.1, Math.min(0.99, (params.confidence ?? 0.86) - (params.context.source === "PDF_OCR" ? 0.18 : 0))),
    rawText: description,
    warnings,
    classificationHint: params.classificationHint,
    balance: params.balance ?? null,
  };
}

export function totalsReconciliation(transactions: ParsedPdfTransaction[], credit: number | null, debit: number | null, extras: Partial<PdfReconciliation> = {}): PdfReconciliation {
  const parsedCreditTotal = transactions.filter((item) => item.direction === "CREDIT").reduce((sum, item) => sum + (item.amount || 0), 0);
  const parsedDebitTotal = transactions.filter((item) => item.direction === "DEBIT").reduce((sum, item) => sum + (item.amount || 0), 0);
  const creditDifference = credit === null ? null : parsedCreditTotal - credit;
  const debitDifference = debit === null ? null : parsedDebitTotal - debit;
  const available = credit !== null || debit !== null || extras.balanceDifference !== undefined;
  const matched = available
    && (creditDifference === null || Math.abs(creditDifference) <= 0.01)
    && (debitDifference === null || Math.abs(debitDifference) <= 0.01)
    && (extras.balanceDifference === undefined || extras.balanceDifference === null || Math.abs(extras.balanceDifference) <= 0.01);
  return {
    statementCreditTotal: credit,
    parsedCreditTotal,
    creditDifference,
    statementDebitTotal: debit,
    parsedDebitTotal,
    debitDifference,
    status: !available ? "NOT_AVAILABLE" : matched ? "MATCHED" : "DIVERGENT",
    method: credit !== null || debit !== null ? "SUMMARY" : extras.method || "NOT_AVAILABLE",
    ...extras,
  };
}

export function extractSummaryTotal(lines: ReconstructedPdfLine[], pattern: RegExp): number | null {
  for (const line of lines) {
    if (!pattern.test(normalizeText(line.text))) continue;
    const values = moneyTokens(line.text);
    if (values.length) return values[values.length - 1].amount;
  }
  return null;
}

export function isLikelyInstitutionalNoise(text: string): boolean {
  const value = normalizeText(text);
  return ["central de atendimento", "ouvidoria", "fale com a gente", "sac ", "deficiencia auditiva", "pagina ", "extrato gerado", "valores em r$", "cod. lanc", "publicidade"].some((item) => value.includes(item));
}

export function similarName(left: string, right: string): boolean {
  const tokens = (value: string) => normalizeText(value).replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((token) => token.length > 2);
  const a = tokens(left); const b = tokens(right);
  if (a.length < 2 || b.length < 2) return false;
  return a.filter((token) => b.includes(token)).length >= Math.min(2, a.length, b.length);
}

export function stripValues(text: string): string {
  return text.replace(/(?:R\$\s*)?[+-]?\s*(?:\d{1,3}(?:\.\d{3})*|\d+),\d{2}\s*[CD]?/gi, " ").replace(/\s+/g, " ").trim();
}
