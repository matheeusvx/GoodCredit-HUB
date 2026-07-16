import type { BankStatementParser, ReconstructedPdfLine } from "../../../../types/pdfImport";
import { normalizeText } from "../../formatters";
import { directionFromSignedValue, isLikelyInstitutionalNoise, moneyTokens, sanitizeBankText, similarName, stripValues, totalsReconciliation, transaction } from "./parserUtils";

const MONTHS: Record<string, number> = { janeiro: 1, fevereiro: 2, marco: 3, abril: 4, maio: 5, junho: 6, julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12 };
function interDate(text: string) { const match = normalizeText(text).match(/^(\d{1,2})\s+de\s+(janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+de\s+(\d{4})/); return match ? `${match[3]}-${String(MONTHS[match[2]]).padStart(2, "0")}-${String(match[1]).padStart(2, "0")}` : null; }
function quotedCounterparty(text: string) { const quoted = text.match(/["“]([^"”]+)["”]/)?.[1] || ""; return sanitizeBankText(quoted.replace(/^.*?[-:]/, "").trim()); }

export const InterStatementParser: BankStatementParser = {
  id: "inter",
  label: "Banco Inter",
  canHandle(context, text) { const value = normalizeText(text); return context.bankCode === "INTER" ? 1 : value.includes("banco inter") && value.includes("saldo por transacao") ? 0.99 : value.includes("saldo por transacao") ? 0.9 : 0; },
  parse(lines, context) {
    const transactions = []; const ignoredLines: ReconstructedPdfLine[] = []; const ambiguousLines: ReconstructedPdfLine[] = [];
    let currentDate: string | null = null; let holder = ""; let lastBalance: number | null = null; let openingBalance: number | null = null; let closingBalance: number | null = null;
    for (let index = 0; index < Math.min(lines.length, 30); index += 1) { if (/cpf|cnpj/i.test(lines[index].text) && index > 0) holder = sanitizeBankText(lines[index - 1].text); }
    for (const line of lines) {
      const normalized = normalizeText(line.text); const date = interDate(line.text);
      if (date) { currentDate = date; ignoredLines.push(line); continue; }
      const values = moneyTokens(line.text);
      if (/saldo do dia/i.test(normalized)) { if (values.length) closingBalance = values[0].amount * (/^-/.test(values[0].raw.trim()) ? -1 : 1); if (openingBalance === null) openingBalance = closingBalance; ignoredLines.push(line); continue; }
      if (isLikelyInstitutionalNoise(line.text) || /saldo (total|disponivel|bloqueado)|saldo por transacao|data.*historico/i.test(normalized)) { ignoredLines.push(line); continue; }
      if (!currentDate || values.length < 2) continue;
      if (values.length > 2) ambiguousLines.push(line);
      const movement = values[0]; const balanceToken = values[values.length - 1];
      const signedMovement = directionFromSignedValue(movement.raw, "CREDIT") === "DEBIT" ? -movement.amount : movement.amount;
      const balance = directionFromSignedValue(balanceToken.raw, "CREDIT") === "DEBIT" ? -balanceToken.amount : balanceToken.amount;
      const direction = signedMovement < 0 ? "DEBIT" : "CREDIT";
      const description = stripValues(line.text); const counterparty = quotedCounterparty(description);
      const warnings: string[] = [];
      if (!counterparty && /pix/i.test(normalized)) warnings.push("Contraparte não identificada.");
      if (lastBalance !== null && Math.abs((lastBalance + signedMovement) - balance) > 0.02) warnings.push("Quebra na sequência do saldo por transação.");
      if (/pix enviado devolvido/i.test(normalized)) warnings.push("Devolução de PIX: não considerar como renda.");
      const sameOwnership = similarName(holder, counterparty);
      if (sameOwnership) warnings.push("Possível mesma titularidade; confirme na revisão.");
      const tx = transaction({ parserId: "inter", context, index: transactions.length, page: line.pageNumber, date: currentDate, description, payer: counterparty, amount: movement.amount, direction, balance, confidence: warnings.length ? 0.72 : 0.94, warnings, classificationHint: sameOwnership ? "SAME_OWNERSHIP" : undefined });
      transactions.push(tx); lastBalance = balance; closingBalance = balance; if (tx.warnings.length) ambiguousLines.push(line);
    }
    const balanceDifference = lastBalance !== null && closingBalance !== null ? lastBalance - closingBalance : null;
    return { transactions, ignoredLines, ambiguousLines, parserId: "inter", parserLabel: "Banco Inter", reconciliation: totalsReconciliation(transactions, null, null, { openingBalance, closingBalance, balanceDifference, method: "BALANCE_SEQUENCE", warnings: ambiguousLines.length ? ["Há linhas que exigem conferência da sequência de saldos."] : [] }) };
  },
};
