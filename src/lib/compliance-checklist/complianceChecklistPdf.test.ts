import { describe, expect, it } from "vitest";
import { calculateComplianceChecklistSummary } from "./complianceChecklistSummary";
import { buildComplianceChecklistPdfModel, COMPLIANCE_PDF_NOTICE } from "./complianceChecklistPdf";
import { createInitialComplianceChecklistState } from "./complianceChecklistStorage";

describe("buildComplianceChecklistPdfModel", () => {
  it("gera um modelo completo com os 15 itens e identificação", () => {
    const state = createInitialComplianceChecklistState("2026-07-24");
    state.clientName = "Cliente exemplo";
    state.processReference = "PROC-123";
    state.analystName = "Analista";
    state.items[0] = {
      ...state.items[0],
      status: "COMPLIANT",
      observation: "Conferido"
    };
    const summary = calculateComplianceChecklistSummary(state.items);
    const model = buildComplianceChecklistPdfModel(
      state,
      summary,
      false,
      new Date("2026-07-24T15:00:00")
    );

    expect(model.title).toBe("Checklist de Conformidade");
    expect(model.clientName).toBe("Cliente exemplo");
    expect(model.rows).toHaveLength(15);
    expect(model.rows[0]).toMatchObject({
      verification: "Verificar Carta FGTS — 3 anos",
      status: "Conforme",
      observation: "Conferido"
    });
    expect(model.institutionalNotice).toBe(COMPLIANCE_PDF_NOTICE);
  });

  it("identifica pendências com suas observações", () => {
    const state = createInitialComplianceChecklistState("2026-07-24");
    state.clientName = "Cliente exemplo";
    state.items[1] = {
      ...state.items[1],
      status: "HAS_ISSUE",
      observation: "PF3 precisa ser atualizado"
    };
    const model = buildComplianceChecklistPdfModel(
      state,
      calculateComplianceChecklistSummary(state.items),
      false
    );

    expect(model.issues).toHaveLength(1);
    expect(model.issues[0].observation).toBe("PF3 precisa ser atualizado");
    expect(model.overallStatusLabel).toBe("Conferência com pendências");
  });

  it("marca o relatório como rascunho quando solicitado", () => {
    const state = createInitialComplianceChecklistState("2026-07-24");
    state.clientName = "Cliente exemplo";
    const model = buildComplianceChecklistPdfModel(
      state,
      calculateComplianceChecklistSummary(state.items),
      true
    );

    expect(model.draft).toBe(true);
    expect(model.summary.completed).toBe(0);
    expect(model.issues).toHaveLength(0);
  });
});
