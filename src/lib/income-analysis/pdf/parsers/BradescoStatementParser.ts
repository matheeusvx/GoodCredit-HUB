import type { BankStatementParser, ParsedPdfTransaction, ReconstructedPdfLine, TransactionDirection } from "../../../../types/pdfImport";
import { normalizeText } from "../../formatters";
import { extractSummaryTotal, isLikelyInstitutionalNoise, moneyTokens, parseDateAtStart, sanitizeBankText, stripValues, totalsReconciliation, transaction } from "./parserUtils";

function columnDirection(line: ReconstructedPdfLine, raw: string, creditX: number, debitX: number): TransactionDirection {
  const item = line.items.find((candidate) => candidate.text.includes(raw.trim()) || raw.includes(candidate.text.trim()));
  if (!item) return "UNKNOWN";
  return Math.abs(item.x - creditX) <= Math.abs(item.x - debitX) ? "CREDIT" : "DEBIT";
}

const INCOMING_TRANSFER = /\b(?:recebimento\s+ted|pix\s+recebido|transferencia\s+recebida)\b/;
const MOVEMENT_START = /\b(?:recebimento\s+ted|pix|transferencia\s+(?:recebida|enviada)|compra|pagamento|aplicacao|resgate|saque|tarifa|saldo)\b/;

function isTrailingCounterpartyLine(value: string): boolean {
  const normalized = normalizeText(value);
  if (!normalized || MOVEMENT_START.test(normalized) || moneyTokens(value).length) return false;
  return /[a-z]/i.test(value) && normalized.split(/\s+/).length >= 2;
}

export const BradescoStatementParser: BankStatementParser = {
  id: "bradesco",
  label: "Bradesco",
  canHandle(context, text) { const normalized = normalizeText(text); return context.bankCode === "BRADESCO" ? 1 : normalized.includes("bradesco") && normalized.includes("historico") ? 0.94 : 0; },
  parse(lines, context) {
    const transactions: ParsedPdfTransaction[] = []; const ignoredLines: ReconstructedPdfLine[] = []; const ambiguousLines: ReconstructedPdfLine[] = [];
    const header = lines.find((line) => /hist[oó]rico/i.test(line.text) && /cr[eé]dito/i.test(line.text) && /d[eé]bito/i.test(line.text));
    const creditX = header?.items.find((item) => /cr[eé]dito/i.test(item.text))?.x ?? 420;
    const debitX = header?.items.find((item) => /d[eé]bito/i.test(item.text))?.x ?? 490;
    let currentDate: string | null = null; let pendingDescription = ""; let pendingPage = 1;
    for (const line of lines) {
      const normalized = normalizeText(line.text);
      if (isLikelyInstitutionalNoise(line.text) || /extrato inexistente|^total\b|saldo anterior|saldo final|historico.*documento/i.test(normalized)) { ignoredLines.push(line); continue; }
      const parsedDate = parseDateAtStart(line.text, context.fallbackYear);
      if (parsedDate.date) currentDate = parsedDate.date;
      const values = moneyTokens(parsedDate.rest);
      if (!values.length) {
        const previous = transactions.at(-1);
        if (!parsedDate.date && previous && INCOMING_TRANSFER.test(normalizeText(previous.description)) && isTrailingCounterpartyLine(parsedDate.rest)) {
          previous.payer = previous.payer || sanitizeBankText(parsedDate.rest);
          previous.description = sanitizeBankText(`${previous.description} ${parsedDate.rest}`);
          continue;
        }
        if (/^rem:|^des:|^[a-z]/i.test(parsedDate.rest) && currentDate) { pendingDescription = `${pendingDescription} ${parsedDate.rest}`.trim(); pendingPage = line.pageNumber; }
        continue;
      }
      const movementCandidates = values.length >= 2 ? values.slice(0, -1) : values;
      const value = movementCandidates.find((candidate) => columnDirection(line, candidate.raw, creditX, debitX) !== "UNKNOWN") || movementCandidates[0];
      let direction = columnDirection(line, value.raw, creditX, debitX);
      if (direction === "UNKNOWN") direction = /(^|\s)-|\bd\s*$/i.test(value.raw) ? "DEBIT" : /pix recebido|credito|rem:/i.test(normalized) ? "CREDIT" : /pix enviado|pagamento|compra|des:/i.test(normalized) ? "DEBIT" : "UNKNOWN";
      const description = `${pendingDescription} ${stripValues(parsedDate.rest)}`.trim(); pendingDescription = "";
      const tx = transaction({ parserId: "bradesco", context, index: transactions.length, page: pendingPage || line.pageNumber, date: currentDate, description, amount: value.amount, direction, confidence: header ? 0.92 : 0.78 });
      transactions.push(tx); if (tx.warnings.length) ambiguousLines.push(line);
    }
    const credit = extractSummaryTotal(lines, /total.*credit/); const debit = extractSummaryTotal(lines, /total.*debit/);
    return { transactions, ignoredLines, ambiguousLines, parserId: "bradesco", parserLabel: "Bradesco", reconciliation: totalsReconciliation(transactions, credit, debit) };
  },
};
