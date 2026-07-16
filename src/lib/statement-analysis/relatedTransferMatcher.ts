import type { NormalizedBankTransaction } from "../../types/statementAnalysis";
import { normalizeText } from "../income-analysis/formatters";

function compatible(left: NormalizedBankTransaction, right: NormalizedBankTransaction) {
  if (!left.date || left.date !== right.date || left.sourceFileId === right.sourceFileId || left.direction === right.direction) return false;
  if (Math.abs(left.amount - right.amount) > 0.01) return false;
  const holder = normalizeText(left.accountHolder); const counterpart = normalizeText(right.counterparty);
  return !holder || !counterpart || holder.includes(counterpart) || counterpart.includes(holder) || left.maskedAccount !== right.maskedAccount;
}

export function matchInternalTransfers(transactions: NormalizedBankTransaction[]): NormalizedBankTransaction[] {
  const result = transactions.map((item) => ({ ...item }));
  for (let leftIndex = 0; leftIndex < result.length; leftIndex += 1) {
    const left = result[leftIndex]; if (left.linkedTransactionId || left.classification === "EXCLUDED_DUPLICATE") continue;
    const rightIndex = result.findIndex((right, index) => index > leftIndex && !right.linkedTransactionId && compatible(left, right));
    if (rightIndex < 0) continue;
    const right = result[rightIndex];
    result[leftIndex] = { ...left, classification: "EXCLUDED_INTERNAL_TRANSFER", classificationReason: "Transferência vinculada entre contas analisadas.", classificationConfidence: 0.97, linkedTransactionId: right.id };
    result[rightIndex] = { ...right, classification: "EXCLUDED_INTERNAL_TRANSFER", classificationReason: "Transferência vinculada entre contas analisadas.", classificationConfidence: 0.97, linkedTransactionId: left.id };
  }
  return result;
}

export function markTransitoryPairs(transactions: NormalizedBankTransaction[]): NormalizedBankTransaction[] {
  const result = transactions.map((item) => ({ ...item }));
  for (let index = 0; index < result.length; index += 1) {
    const credit = result[index]; if (credit.direction !== "CREDIT" || credit.linkedTransactionId || !credit.date) continue;
    const pairIndex = result.findIndex((item, candidate) => candidate !== index && item.direction === "DEBIT" && !item.linkedTransactionId && item.date === credit.date && Math.abs(item.amount - credit.amount) <= 0.01 && normalizeText(item.counterparty || item.description) === normalizeText(credit.counterparty || credit.description));
    if (pairIndex < 0) continue;
    const debit = result[pairIndex];
    result[index] = { ...credit, classification: "EXCLUDED_TRANSITORY_MOVEMENT", classificationReason: "Entrada e saída equivalentes para a mesma contraparte.", classificationConfidence: 0.9, linkedTransactionId: debit.id };
    result[pairIndex] = { ...debit, classification: "EXCLUDED_TRANSITORY_MOVEMENT", classificationReason: "Entrada e saída equivalentes para a mesma contraparte.", classificationConfidence: 0.9, linkedTransactionId: credit.id };
  }
  return result;
}
