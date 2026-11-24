import type { NormalizedBankTransaction } from "../../types/statementAnalysis";
import { normalizeText } from "../income-analysis/formatters";

export function markDuplicateTransactions(transactions: NormalizedBankTransaction[]): NormalizedBankTransaction[] {
  const seen = new Map<string, NormalizedBankTransaction>();
  const occurrences = new Map<string, number>();
  const positions = new Map<string, NormalizedBankTransaction>();
  const documents = new Map<string, NormalizedBankTransaction>();
  return transactions.map((item) => {
    const accountKey = `${item.bank}|${normalizeText(item.accountHolder)}|${item.maskedAccount}|${normalizeText(item.counterparty)}`;
    const identityKey = `${accountKey}|${item.fingerprint}`;
    const fileKey = `${item.sourceFileId}|${identityKey}`;
    const occurrence = occurrences.get(fileKey) || 0;
    occurrences.set(fileKey, occurrence + 1);
    // Match the nth occurrence to the nth occurrence in overlapping files.
    // Two equal legitimate payments in the same statement stay distinct.
    const key = `${identityKey}|${occurrence}`;
    const position = item.sourceRow === null ? null : `${fileKey}|${item.sourcePage}|${item.sourceRow}`;
    const document = item.documentId ? `${fileKey}|${item.documentId}` : null;
    const existing = (position ? positions.get(position) : undefined) || (document ? documents.get(document) : undefined) || seen.get(key);
    if (position && !positions.has(position)) positions.set(position, item);
    if (document && !documents.has(document)) documents.set(document, item);
    if (!existing) {
      seen.set(key, item);
      return item;
    }
    const sameSpreadsheetPosition = item.sourceFileId === existing.sourceFileId
      && item.sourceRow !== null
      && item.sourcePage === existing.sourcePage
      && item.sourceRow === existing.sourceRow;
    const duplicateAcrossFiles = item.sourceFileId !== existing.sourceFileId;
    const sameDocument = item.sourceFileId === existing.sourceFileId && Boolean(item.documentId) && item.documentId === existing.documentId;
    if (!sameSpreadsheetPosition && !duplicateAcrossFiles && !sameDocument) return item;
    return { ...item, classification: "EXCLUDED_DUPLICATE", classificationReason: "Movimentação duplicada em arquivo ou seção repetida.", classificationConfidence: 0.99, linkedTransactionId: existing.id, warnings: [...item.warnings, "Possível duplicidade vinculada."] };
  });
}
