import { describe, expect, it } from "vitest";
import { buildClassificationExplanation, getReconciliationStatusLabel, getStabilityLabel } from "./presentationLabels";

describe("rótulos de apresentação da apuração de renda", () => {
  it("traduz o status conciliado", () => expect(getReconciliationStatusLabel("RECONCILED")).toBe("Conciliado"));
  it("aplica singular e plural aos reembolsos", () => {
    expect(buildClassificationExplanation("EXCLUDED_REFUND", 1)).toBe("1 movimentação foi desconsiderada por ser um reembolso.");
    expect(buildClassificationExplanation("EXCLUDED_REFUND", 3)).toBe("3 movimentações foram desconsideradas por serem reembolsos.");
  });
  it("descreve possível duplicidade", () => expect(buildClassificationExplanation("EXCLUDED_DUPLICATE", 1)).toBe("1 movimentação foi desconsiderada por possível duplicidade."));
  it("descreve pendências e renda confirmada", () => {
    expect(buildClassificationExplanation("PENDING_REVIEW", 13)).toBe("13 movimentações precisam de revisão.");
    expect(buildClassificationExplanation("INCLUDED_INCOME", 33)).toBe("33 entradas foram consideradas como renda confirmada.");
  });
  it("traduz dados insuficientes", () => expect(getStabilityLabel("INSUFFICIENT_DATA")).toBe("Dados insuficientes"));
});
