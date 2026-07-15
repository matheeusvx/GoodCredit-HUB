import {
  BankStatementParser,
  ParsedPdfTransaction,
  PdfParsingContext,
  ReconstructedPdfLine,
} from "../../../../types/pdfImport";
import { competenceFromDate, maskAccount } from "../../formatters";
import { parsePdfDate } from "../pdfDateParser";
import { splitNoiseLines } from "../pdfNoiseFilter";
import { extractTransactionValue } from "../pdfValueParser";

interface PendingTransaction {
  pageNumber: number;
  lines: ReconstructedPdfLine[];
  dateEndIndex: number;
  date: string | null;
  dateWarning?: string;
}

function buildTransaction(pending: PendingTransaction, context: PdfParsingContext, index: number): ParsedPdfTransaction {
  const rawText = pending.lines.map((line) => line.text).join(" ").replace(/\s+/g, " ").trim();
  const value = extractTransactionValue(rawText);
  const descriptionStart = pending.dateEndIndex;
  const descriptionEnd = value?.startIndex ?? rawText.length;
  const description = rawText.slice(descriptionStart, descriptionEnd).replace(/\s+/g, " ").trim() || "Descrição não identificada";
  const warnings = [pending.dateWarning, !value ? "Valor não identificado." : "", value?.direction === "UNKNOWN" ? "Crédito ou débito não identificado." : ""].filter(Boolean) as string[];
  let confidence = 0.15;
  if (pending.date) confidence += 0.35;
  if (value) confidence += 0.3;
  if (value && value.direction !== "UNKNOWN") confidence += 0.15;
  if (description && description !== "Descrição não identificada") confidence += 0.05;
  if (context.source === "PDF_OCR") confidence -= 0.15;
  confidence = Math.max(0.1, Math.min(1, confidence));
  return {
    id: `pdf-${context.source.toLowerCase()}-${pending.pageNumber}-${index}-${Date.now()}`,
    selected: Boolean(pending.date && value),
    date: pending.date,
    competence: pending.date ? competenceFromDate(pending.date) : null,
    description,
    payer: "",
    amount: value?.amount ?? null,
    direction: value?.direction ?? "UNKNOWN",
    account: maskAccount(context.account),
    pageNumber: pending.pageNumber,
    source: context.source,
    confidence,
    rawText,
    warnings,
  };
}

function fallbackYear(context: PdfParsingContext): number | undefined {
  return context.fallbackYear || (context.periodStart ? Number(context.periodStart.slice(0, 4)) : undefined);
}

export const GenericBankStatementParser: BankStatementParser = {
  id: "generic",
  label: "Parser genérico de extrato",
  canHandle: () => 0.5,
  parse(lines, context) {
    const { content, ignored } = splitNoiseLines(lines);
    const transactions: ParsedPdfTransaction[] = [];
    const ambiguousLines: ReconstructedPdfLine[] = [];
    let pending: PendingTransaction | null = null;

    const flush = () => {
      if (!pending) return;
      const transaction = buildTransaction(pending, context, transactions.length);
      transactions.push(transaction);
      if (!transaction.date || transaction.amount === null || transaction.direction === "UNKNOWN") ambiguousLines.push(...pending.lines);
      pending = null;
    };

    content.forEach((line) => {
      const parsedDate = parsePdfDate(line.text, fallbackYear(context));
      if (parsedDate) {
        flush();
        pending = {
          pageNumber: line.pageNumber,
          lines: [line],
          dateEndIndex: parsedDate.endIndex,
          date: parsedDate.date,
          dateWarning: parsedDate.warning,
        };
        return;
      }
      if (!pending) {
        if (extractTransactionValue(line.text)) ambiguousLines.push(line);
        return;
      }
      const currentRaw = pending.lines.map((item) => item.text).join(" ");
      if (extractTransactionValue(currentRaw)) {
        flush();
        if (extractTransactionValue(line.text)) ambiguousLines.push(line);
        return;
      }
      pending.lines.push(line);
    });
    flush();
    return { transactions, ignoredLines: ignored, ambiguousLines, parserId: "generic", parserLabel: "Parser genérico" };
  },
};
