import { TransactionDirection } from "../../../types/pdfImport";
import { normalizeText } from "../formatters";
import { PDF_CREDIT_KEYWORDS, PDF_DEBIT_KEYWORDS } from "./pdfConfig";

export interface ParsedPdfValue {
  amount: number;
  direction: TransactionDirection;
  raw: string;
  startIndex: number;
  endIndex: number;
}

const VALUE_PATTERN = /[-+]?\s*(?:R\$\s*)?[-+]?\s*(?:\d{1,3}(?:\.\d{3})+|\d+)(?:[,.]\d{2})\s*[CD+\-]?/gi;

export function parsePdfMoney(raw: string): number | null {
  const clean = raw.replace(/R\$/gi, "").replace(/\s/g, "").replace(/[CD]$/i, "");
  const sign = clean.startsWith("-") || clean.endsWith("-") ? -1 : 1;
  const unsigned = clean.replace(/^[-+]/, "").replace(/[+\-]$/, "");
  let normalized = unsigned;
  if (unsigned.includes(",")) normalized = unsigned.replace(/\./g, "").replace(",", ".");
  else if ((unsigned.match(/\./g) || []).length > 1) normalized = unsigned.replace(/\./g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed * sign : null;
}

export function inferDirection(text: string, rawValue: string): TransactionDirection {
  const compact = rawValue.replace(/\s/g, "");
  if (/C$/i.test(compact)) return "CREDIT";
  if (/D$/i.test(compact)) return "DEBIT";
  if (/^-|-$/.test(compact)) return "DEBIT";
  if (/^\+|\+$/.test(compact)) return "CREDIT";
  const normalized = normalizeText(text);
  if (PDF_CREDIT_KEYWORDS.some((keyword) => normalized.includes(keyword))) return "CREDIT";
  if (PDF_DEBIT_KEYWORDS.some((keyword) => normalized.includes(keyword))) return "DEBIT";
  return "UNKNOWN";
}

export function extractPdfValues(text: string): ParsedPdfValue[] {
  const matches = [...text.matchAll(VALUE_PATTERN)];
  return matches.flatMap((match) => {
    const raw = match[0];
    const amount = parsePdfMoney(raw);
    if (amount === null) return [];
    return [{
      amount: Math.abs(amount),
      direction: inferDirection(text, raw),
      raw,
      startIndex: match.index || 0,
      endIndex: (match.index || 0) + raw.length,
    }];
  });
}

export function extractTransactionValue(text: string): ParsedPdfValue | null {
  const values = extractPdfValues(text);
  if (!values.length) return null;
  const explicit = values.find((value) => value.direction !== "UNKNOWN");
  return explicit || values[0];
}
