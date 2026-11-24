import type { NormalizedBankTransaction } from "../../types/statementAnalysis";

export function reviewTransaction(item: NormalizedBankTransaction, patch: Partial<NormalizedBankTransaction>, reason: string, reviewedAt = new Date().toISOString()): NormalizedBankTransaction {
  if (!reason.trim()) throw new Error("Justificativa obrigatória para revisão manual.");
  const previousValues = { ...Object.fromEntries(Object.keys(patch).map((key) => [key, item[key as keyof NormalizedBankTransaction]])), classificationReason: item.classificationReason };
  return { ...item, ...patch, manuallyReviewed: true, classificationReason: reason.trim(), classificationConfidence: 1,
    reviewAudit: [...(item.reviewAudit || []), {
      previousClassification: item.classification,
      newClassification: patch.classification || item.classification,
      previousRelationship: item.relatedPartyClassification?.relationship || "UNKNOWN",
      newRelationship: patch.relatedPartyClassification?.relationship || item.relatedPartyClassification?.relationship || "UNKNOWN",
      reason: reason.trim(), reviewedAt, reviewedBy: "Sessão atual", previousValues, newValues: { ...patch, classificationReason: reason.trim() },
    }],
  };
}
