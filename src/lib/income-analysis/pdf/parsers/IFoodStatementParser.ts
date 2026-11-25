import type { BankStatementParser, ReconstructedPdfLine } from "../../../../types/pdfImport";
import { normalizeDate, normalizeText } from "../../formatters";
import { directionFromSignedValue, moneyTokens, parseDateAtStart, totalsReconciliation, transaction } from "./parserUtils";

export function isIFoodStatement(normalizedText: string): boolean {
  return /\bextrato da conta digital ifood\b/.test(normalizedText)
    && /\bdata\s+movimentacao\s+descricao da movimentacao\s+valor\b/.test(normalizedText);
}

export const IFoodStatementParser: BankStatementParser = {
  id: "ifood",
  label: "iFood",
  canHandle(_context, text) {
    return isIFoodStatement(normalizeText(text)) ? 1 : 0;
  },
  parse(lines, context) {
    const transactions = [];
    const ignoredLines: ReconstructedPdfLine[] = [];
    const ambiguousLines: ReconstructedPdfLine[] = [];
    let periodStart: string | null = null;
    let periodEnd: string | null = null;

    for (const line of lines) {
      const { date, rest } = parseDateAtStart(line.text);
      if (!date) {
        const period = normalizeText(line.text).match(/^periodo selecionado\s+(\d{2}\/\d{2}\/\d{4})\s+a\s+(\d{2}\/\d{2}\/\d{4})$/);
        if (period) {
          periodStart = normalizeDate(period[1]);
          periodEnd = normalizeDate(period[2]);
        }
        ignoredLines.push(line);
        continue;
      }

      const value = moneyTokens(rest).at(-1);
      const description = value ? rest.slice(0, value.startIndex).trim() : "";
      if (!value || !description || rest.slice(value.endIndex).trim()) {
        ambiguousLines.push(line);
        continue;
      }
      transactions.push(transaction({
        parserId: "ifood",
        context,
        index: transactions.length,
        page: line.pageNumber,
        date,
        description,
        amount: value.amount,
        direction: directionFromSignedValue(value.raw, "CREDIT"),
        confidence: 0.95,
      }));
    }

    return {
      transactions,
      ignoredLines,
      ambiguousLines,
      parserId: "ifood",
      parserLabel: "iFood",
      reconciliation: totalsReconciliation(transactions, null, null),
      statementMetadata: { holderName: null, holderCpf: null, agency: null, account: null, periodStart, periodEnd },
    };
  },
};
