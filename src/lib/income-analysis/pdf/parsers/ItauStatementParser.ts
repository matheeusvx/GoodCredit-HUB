import type { BankStatementParser, ReconstructedPdfLine, TransactionDirection } from "../../../../types/pdfImport";
import { normalizeText } from "../../formatters";
import { isLikelyInstitutionalNoise, moneyTokens, parseDateAtStart, similarName, stripValues, totalsReconciliation, transaction } from "./parserUtils";

export const ItauStatementParser: BankStatementParser = {
  id: "itau",
  label: "Itaú",
  canHandle(context, text) { const value = normalizeText(text); return context.bankCode === "ITAU" ? 1 : value.includes("itau") && (value.includes("extrato conta") || value.includes("limite da conta")) ? 0.98 : 0; },
  parse(lines, context) {
    const transactions = []; const ignoredLines: ReconstructedPdfLine[] = []; const ambiguousLines: ReconstructedPdfLine[] = [];
    const header = lines.find((line) => /data.*lan[cç]amentos.*valor.*saldo/i.test(normalizeText(line.text)));
    const valueX = header?.items.find((item) => /^valor/i.test(normalizeText(item.text)))?.x ?? 400;
    const balanceX = header?.items.find((item) => /^saldo/i.test(normalizeText(item.text)))?.x ?? 500;
    let holder = ""; let currentDate: string | null = null; const dailyBalances: number[] = [];
    for (let index = 0; index < Math.min(30, lines.length); index += 1) if (/agencia|conta/i.test(normalizeText(lines[index].text)) && index > 0) holder = lines[index - 1].text;
    for (const line of lines) {
      const normalized = normalizeText(line.text); const parsed = parseDateAtStart(line.text, context.fallbackYear); if (parsed.date) currentDate = parsed.date;
      const values = moneyTokens(parsed.rest);
      if (/saldo do dia/i.test(normalized)) { if (values.length) dailyBalances.push(/^\s*-/.test(values.at(-1)!.raw) ? -values.at(-1)!.amount : values.at(-1)!.amount); ignoredLines.push(line); continue; }
      if (isLikelyInstitutionalNoise(line.text) || /limite (da conta|disponivel|total)|saldo em conta|data.*lancamentos.*valor.*saldo/i.test(normalized)) { ignoredLines.push(line); continue; }
      if (!currentDate || !values.length) continue;
      const valueCandidate = values.find((candidate) => {
        const item = line.items.find((entry) => entry.text.includes(candidate.raw.trim()) || candidate.raw.includes(entry.text.trim()));
        return item ? Math.abs(item.x - valueX) <= Math.abs(item.x - balanceX) : values.length === 1;
      });
      if (!valueCandidate) { ambiguousLines.push(line); continue; }
      const description = stripValues(parsed.rest); let direction: TransactionDirection = /^\s*-/.test(valueCandidate.raw) ? "DEBIT" : "CREDIT";
      const warnings: string[] = [];
      if (/rend pago aplic|rendimento/i.test(normalized)) warnings.push("Rendimento financeiro: desconsiderar da renda operacional.");
      if (/estorno|devolucao/i.test(normalized)) warnings.push("Estorno ou devolução: não considerar como renda.");
      if (direction === "CREDIT" && !/salario|remuneracao|adiantamento|comissao|pix|ted|estorno|rend/i.test(normalized)) warnings.push("Crédito sem classificação segura.");
      const sameOwnership = /pix transf/i.test(normalized) && similarName(holder, description);
      if (sameOwnership) warnings.push("Possível transferência de mesma titularidade.");
      const tx = transaction({ parserId: "itau", context, index: transactions.length, page: line.pageNumber, date: currentDate, description, amount: valueCandidate.amount, direction, confidence: header ? 0.93 : 0.76, warnings, classificationHint: sameOwnership ? "SAME_OWNERSHIP" : undefined });
      transactions.push(tx); if (tx.warnings.length) ambiguousLines.push(line);
    }
    const firstBalance = dailyBalances[0] ?? null; const lastBalance = dailyBalances.at(-1) ?? null; const net = transactions.reduce((sum, item) => sum + (item.direction === "CREDIT" ? item.amount || 0 : -(item.amount || 0)), 0);
    const forwardDifference = firstBalance !== null && lastBalance !== null ? firstBalance + net - lastBalance : null; const reverseDifference = firstBalance !== null && lastBalance !== null ? lastBalance + net - firstBalance : null; const reversed = reverseDifference !== null && (forwardDifference === null || Math.abs(reverseDifference) < Math.abs(forwardDifference));
    const openingBalance = reversed ? lastBalance : firstBalance; const closingBalance = reversed ? firstBalance : lastBalance; const balanceDifference = reversed ? reverseDifference : forwardDifference;
    return { transactions, ignoredLines, ambiguousLines, parserId: "itau", parserLabel: "Itaú", reconciliation: totalsReconciliation(transactions, null, null, { openingBalance, closingBalance, balanceDifference, method: "BALANCE_SEQUENCE", warnings: balanceDifference !== null && Math.abs(balanceDifference) > 0.01 ? ["A evolução dos saldos apresenta divergência."] : [] }) };
  },
};
