import type { BankStatementParser, ReconstructedPdfLine, TransactionDirection } from "../../../../types/pdfImport";
import { normalizeText } from "../../formatters";
import { extractSummaryTotal, isLikelyInstitutionalNoise, moneyTokens, parseDateAtStart, stripValues, totalsReconciliation, transaction } from "./parserUtils";
import { extractPdfValues } from "../pdfValueParser";

export const SantanderStatementParser: BankStatementParser = {
  id: "santander",
  label: "Santander",
  canHandle(context, text) { const value = normalizeText(text); return context.bankCode === "SANTANDER" ? 1 : value.includes("santander") && value.includes("conta corrente") ? 0.96 : 0; },
  parse(lines, context) {
    const transactions = []; const ignoredLines: ReconstructedPdfLine[] = []; const ambiguousLines: ReconstructedPdfLine[] = [];
    let currentDate: string | null = null; let pendingParts: string[] = [];
    const statementYear = context.fallbackYear || Number(lines.map((line) => line.text).join(" ").match(/\b(20\d{2})\b/)?.[1] || new Date().getFullYear());
    const movementPages = [...new Set(lines.filter((line) => /movimenta[cç][aã]o/i.test(normalizeText(line.text))).map((line) => line.pageNumber))].sort((a, b) => a - b);
    const startPage = movementPages[0] || 1; const nextSectionPage = movementPages[1] || Number.POSITIVE_INFINITY;
    const balancePages = lines.filter((line) => line.pageNumber >= startPage && line.pageNumber < nextSectionPage && /^saldo em\b/i.test(normalizeText(line.text))).map((line) => line.pageNumber);
    const endPage = balancePages.length ? Math.max(...balancePages) : nextSectionPage - 1;
    for (const line of lines) {
      const normalized = normalizeText(line.text);
      if (line.pageNumber < startPage || line.pageNumber > endPage || /movimenta[cç][aã]o/i.test(normalized) || /^saldo em\b/i.test(normalized) || isLikelyInstitutionalNoise(line.text) || /compras com cartao|comprovantes|transferencias enviadas|saldos por periodo|credito contratado|indices economicos/i.test(normalized)) { ignoredLines.push(line); continue; }
      const parsed = parseDateAtStart(line.text, statementYear); if (parsed.date) { currentDate = parsed.date; pendingParts = parsed.rest ? [parsed.rest] : []; }
      const coordinateValues = line.items.filter((item) => item.x >= 410 && item.x < 500).flatMap((item) => extractPdfValues(item.text));
      const values = coordinateValues.length ? coordinateValues : line.items.length ? [] : moneyTokens(parsed.rest);
      if (!values.length) { if (!parsed.date && currentDate && pendingParts.length && line.text.trim()) pendingParts.push(line.text); continue; }
      const movement = values[0]; const description = stripValues(parsed.rest);
      const direction: TransactionDirection = /^\s*-|-$/.test(movement.raw.replace(/\s/g, "")) ? "DEBIT" : "CREDIT";
      const warnings = /pix devolvido|estorno/i.test(normalized) ? ["Devolução ou estorno: não considerar como renda."] : [];
      const tx = transaction({ parserId: "santander", context, index: transactions.length, page: line.pageNumber, date: currentDate, description: `${pendingParts.join(" ")} ${description}`.trim(), amount: movement.amount, direction, confidence: 0.9, warnings });
      transactions.push(tx); if (tx.warnings.length) ambiguousLines.push(line);
      pendingParts = [];
    }
    const credit = extractSummaryTotal(lines, /total.*(credito|entrada)/); const debit = extractSummaryTotal(lines, /total.*(debito|saida)/);
    return { transactions, ignoredLines, ambiguousLines, parserId: "santander", parserLabel: "Santander", reconciliation: totalsReconciliation(transactions, credit, debit) };
  },
};
