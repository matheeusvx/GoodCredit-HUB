import { describe, expect, it } from "vitest";
import { COMPLIANCE_CHECKLIST_ITEMS } from "../../data/complianceChecklistItems";
import { ComplianceChecklistItemState } from "../../types/complianceChecklist";
import { calculateComplianceChecklistSummary } from "./complianceChecklistSummary";

function buildItems(
  statuses: ComplianceChecklistItemState["status"][]
): ComplianceChecklistItemState[] {
  return COMPLIANCE_CHECKLIST_ITEMS.map((definition, index) => ({
    itemId: definition.id,
    status: statuses[index] ?? "PENDING",
    observation: "",
    updatedAt: null
  }));
}

describe("calculateComplianceChecklistSummary", () => {
  it("mantém exatamente os 15 itens na ordem operacional", () => {
    expect(COMPLIANCE_CHECKLIST_ITEMS).toHaveLength(15);
    expect(COMPLIANCE_CHECKLIST_ITEMS.map((item) => item.order)).toEqual(
      Array.from({ length: 15 }, (_, index) => index + 1)
    );
    expect(new Set(COMPLIANCE_CHECKLIST_ITEMS.map((item) => item.icon)).size).toBe(15);
  });

  it("calcula progresso e mantém o checklist em andamento", () => {
    const summary = calculateComplianceChecklistSummary(
      buildItems(["COMPLIANT", "HAS_ISSUE", "NOT_APPLICABLE"])
    );

    expect(summary).toMatchObject({
      total: 15,
      compliant: 1,
      hasIssue: 1,
      notApplicable: 1,
      pending: 12,
      completed: 3,
      completionPercent: 20,
      overallStatus: "HAS_ISSUES"
    });
  });

  it("prioriza o status geral com pendências", () => {
    const summary = calculateComplianceChecklistSummary(
      buildItems(["HAS_ISSUE", ...Array(14).fill("COMPLIANT")])
    );
    expect(summary.overallStatus).toBe("HAS_ISSUES");
  });

  it("marca como concluído quando não existem pendências nem itens pendentes", () => {
    const summary = calculateComplianceChecklistSummary(
      buildItems(Array(15).fill("COMPLIANT"))
    );
    expect(summary.completionPercent).toBe(100);
    expect(summary.overallStatus).toBe("COMPLETED");
  });
});
