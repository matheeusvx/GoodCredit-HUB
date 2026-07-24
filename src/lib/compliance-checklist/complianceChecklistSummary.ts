import {
  ComplianceChecklistItemState,
  ComplianceChecklistSummary
} from "../../types/complianceChecklist";

export const COMPLIANCE_OVERALL_STATUS_LABELS = {
  IN_PROGRESS: "Conferência em andamento",
  HAS_ISSUES: "Conferência com pendências",
  COMPLETED: "Conformidade concluída"
} as const;

export function calculateComplianceChecklistSummary(
  items: ComplianceChecklistItemState[]
): ComplianceChecklistSummary {
  const total = items.length;
  const pending = items.filter((item) => item.status === "PENDING").length;
  const compliant = items.filter((item) => item.status === "COMPLIANT").length;
  const hasIssue = items.filter((item) => item.status === "HAS_ISSUE").length;
  const notApplicable = items.filter((item) => item.status === "NOT_APPLICABLE").length;
  const completed = total - pending;
  const completionPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const overallStatus =
    hasIssue > 0 ? "HAS_ISSUES" : pending > 0 ? "IN_PROGRESS" : "COMPLETED";

  return {
    total,
    pending,
    compliant,
    hasIssue,
    notApplicable,
    completed,
    completionPercent,
    overallStatus
  };
}
