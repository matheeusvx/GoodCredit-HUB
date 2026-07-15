import { BankTransaction } from "../../../types/incomeAnalysis";
import { ParsedPdfTransaction } from "../../../types/pdfImport";
import { normalizeText } from "../formatters";

function normalizedDescription(value: string): string {
  return normalizeText(value).replace(/\W/g, "").slice(0, 36);
}

export function pdfTransactionFingerprint(transaction: Pick<ParsedPdfTransaction, "date" | "amount" | "description" | "account" | "direction">): string {
  return [transaction.date || "", (transaction.amount || 0).toFixed(2), normalizedDescription(transaction.description), transaction.account, transaction.direction].join("|");
}

export function flagPdfDuplicates(transactions: ParsedPdfTransaction[], existing: BankTransaction[]): ParsedPdfTransaction[] {
  return transactions.map((transaction) => {
    if (!transaction.date || transaction.amount === null) return transaction;
    const exact = existing.find((item) => item.date === transaction.date
      && Math.abs(item.amount - transaction.amount!) < 0.01
      && item.account === transaction.account
      && item.type === transaction.direction
      && normalizedDescription(item.description) === normalizedDescription(transaction.description));
    const probable = exact || existing.find((item) => item.date === transaction.date
      && Math.abs(item.amount - transaction.amount!) < 0.01
      && item.type === transaction.direction
      && normalizedDescription(item.description).slice(0, 18) === normalizedDescription(transaction.description).slice(0, 18));
    if (!probable) return transaction;
    return {
      ...transaction,
      selected: false,
      duplicateOf: probable.id,
      warnings: [...transaction.warnings, "Possível movimentação já importada."],
    };
  });
}
