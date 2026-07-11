import { BankTransaction } from "../../types/incomeAnalysis";
import { CLASSIFICATION_KEYWORDS } from "./incomeRules";
import { normalizeText } from "./formatters";

export function suggestTransactionClassification(transaction: Pick<BankTransaction, "description" | "payer" | "type">): BankTransaction["suggestion"] {
  if (transaction.type === "DEBIT") return { classification: "EXCLUDE", reason: "OTHER", label: "Débito não compõe renda" };
  const text = normalizeText(`${transaction.description} ${transaction.payer}`);
  const match = CLASSIFICATION_KEYWORDS.find((rule) => rule.terms.some((term) => text.includes(term)));
  return match ? { classification: match.classification, reason: match.reason, label: match.label } : undefined;
}

export function flagPossibleDuplicates(transactions: BankTransaction[]): BankTransaction[] {
  return transactions.map((transaction, index) => {
    if (transaction.type !== "CREDIT") return transaction;
    const duplicate = transactions.some((other, otherIndex) => otherIndex !== index && other.date === transaction.date && Math.abs(other.amount - transaction.amount) < 0.01 && normalizeText(other.description).slice(0, 18) === normalizeText(transaction.description).slice(0, 18));
    return duplicate ? { ...transaction, suggestion: { classification: "REVIEW", reason: "POSSIBLE_DUPLICATE", label: "Possível duplicidade — revisar" } } : transaction;
  });
}
