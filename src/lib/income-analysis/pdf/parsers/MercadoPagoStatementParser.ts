import type { BankStatementParser, ReconstructedPdfLine } from "../../../../types/pdfImport";
import { normalizeText } from "../../formatters";
import { directionFromSignedValue, extractSummaryTotal, isLikelyInstitutionalNoise, moneyTokens, parseDateAtStart, stripValues, totalsReconciliation, transaction } from "./parserUtils";

export const MercadoPagoStatementParser: BankStatementParser = {
  id: "mercado-pago",
  label: "Mercado Pago",
  canHandle(context, text) { const value = normalizeText(text); return context.bankCode === "MERCADO_PAGO" ? 1 : value.includes("mercado pago") && value.includes("id da operacao") ? 0.98 : value.includes("mercado pago") ? 0.88 : 0; },
  parse(lines, context) {
    const transactions = []; const ignoredLines: ReconstructedPdfLine[] = []; const ambiguousLines: ReconstructedPdfLine[] = [];
    let pending = ""; let pendingPage = 1;
    for (const line of lines) {
      const normalized = normalizeText(line.text);
      if (isLikelyInstitutionalNoise(line.text) || /saldo (inicial|final)|data.*descri.*valor.*saldo|^total\b/i.test(normalized)) { ignoredLines.push(line); continue; }
      const parsed = parseDateAtStart(line.text);
      if (!parsed.date) { if (pending) pending += ` ${line.text}`; continue; }
      const values = moneyTokens(parsed.rest);
      if (!values.length) { pending = `${pending} ${parsed.rest}`.trim(); pendingPage = line.pageNumber; continue; }
      const movement = values[0];
      const description = `${pending} ${stripValues(parsed.rest)}`.replace(/\b\d{8,}\b/g, "").trim(); pending = "";
      const direction = directionFromSignedValue(movement.raw, "CREDIT");
      const tx = transaction({ parserId: "mercado-pago", context, index: transactions.length, page: pendingPage || line.pageNumber, date: parsed.date, description, amount: movement.amount, direction, confidence: 0.93 });
      if (/rendimentos?/i.test(normalized)) tx.warnings.push("Rendimento financeiro: desconsiderar da renda operacional.");
      transactions.push(tx); if (tx.warnings.length) ambiguousLines.push(line);
    }
    const credit = extractSummaryTotal(lines, /total.*(entrada|credito)/); const debit = extractSummaryTotal(lines, /total.*(saida|debito)/);
    return { transactions, ignoredLines, ambiguousLines, parserId: "mercado-pago", parserLabel: "Mercado Pago", reconciliation: totalsReconciliation(transactions, credit, debit) };
  },
};
