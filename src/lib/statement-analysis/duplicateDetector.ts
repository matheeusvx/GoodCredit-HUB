import type { NormalizedBankTransaction } from "../../types/statementAnalysis";

export function markDuplicateTransactions(transactions: NormalizedBankTransaction[]): NormalizedBankTransaction[] {
  const seen = new Map<string, NormalizedBankTransaction>();
  return transactions.map((item) => {
    const existing = seen.get(item.fingerprint);
    if (!existing) {
      seen.set(item.fingerprint, item);
      return item;
    }
    const sameSpreadsheetPosition = item.sourceFileId === existing.sourceFileId
      && item.sourceRow !== null
      && item.sourceRow === existing.sourceRow;
    const duplicateAcrossFiles = item.sourceFileId !== existing.sourceFileId;
    if (!sameSpreadsheetPosition && !duplicateAcrossFiles) return item;
    return { ...item, classification: "EXCLUDED_DUPLICATE", classificationReason: "Movimentação duplicada em arquivo ou seção repetida.", classificationConfidence: 0.99, linkedTransactionId: existing.id, warnings: [...item.warnings, "Possível duplicidade vinculada."] };
  });
}
