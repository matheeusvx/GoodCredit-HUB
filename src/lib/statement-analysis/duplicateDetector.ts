import type { NormalizedBankTransaction } from "../../types/statementAnalysis";

export function markDuplicateTransactions(transactions: NormalizedBankTransaction[]): NormalizedBankTransaction[] {
  const seen = new Map<string, string>();
  return transactions.map((item) => {
    const existing = seen.get(item.fingerprint);
    if (!existing) { seen.set(item.fingerprint, item.id); return item; }
    return { ...item, classification: "EXCLUDED_DUPLICATE", classificationReason: "Movimentação duplicada em arquivo ou seção repetida.", classificationConfidence: 0.99, linkedTransactionId: existing, warnings: [...item.warnings, "Possível duplicidade vinculada."] };
  });
}
