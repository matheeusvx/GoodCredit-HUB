import { describe, expect, it } from "vitest";
import { buildProSolutoFormFromSimulation } from "./proSolutoImport";

describe("buildProSolutoFormFromSimulation", () => {
  it("importa somente CCV, crédito, FGTS, entrada e identificação", () => {
    const form = buildProSolutoFormFromSimulation({
      nomeCompleto: "Cliente exemplo",
      valorImovelInput: "R$ 270.000,00",
      valorFinanciamentoInput: "R$ 200.000,00",
      possuiFgts: "SIM",
      saldoFgtsInput: "R$ 28.000,00",
      pretendeEntrada: "SIM",
      valorEntradaInput: "R$ 10.000,00"
    });

    expect(form).toMatchObject({
      clientName: "Cliente exemplo",
      sellerReceivableAmount: 270000,
      approvedCreditAmount: 200000,
      fgtsAmount: 28000,
      paidEntryAmount: 10000,
      appraisalValue: 0,
      financeablePercent: 0.8
    });
  });
});
