import { describe, expect, it } from "vitest";
import { ProSolutoForm } from "../../types/proSoluto";
import { calculateProSoluto } from "./proSolutoCalculator";
import { buildProSolutoMessage } from "./proSolutoMessageBuilder";
import { buildProSolutoPdfModel } from "./proSolutoPdfGenerator";

const form: ProSolutoForm = {
  clientName: "Processo exemplo",
  sellerReceivableAmount: 270000,
  appraisalValue: 250000,
  financeablePercent: 0.8,
  approvedCreditAmount: 220000,
  creditNotApprovedYet: false,
  fgtsAmount: 28000,
  paidEntryAmount: 10000
};

describe("saídas do pró-soluto", () => {
  it("gera resumo com a nova composição e sem os campos removidos", () => {
    const text = buildProSolutoMessage(form, calculateProSoluto(form));

    expect(text).toContain("Valor que o vendedor precisa receber — CCV");
    expect(text).toContain("Limite de financiamento pela avaliação");
    expect(text).toContain("Total de recursos disponíveis");
    expect(text).not.toContain("Subsídio");
    expect(text).not.toContain("Outros recursos próprios");
  });

  it("gera o modelo do PDF com quatro etapas e todos os valores auditáveis", () => {
    const model = buildProSolutoPdfModel(form, calculateProSoluto(form));
    const serialized = JSON.stringify(model);

    expect(model.sections).toHaveLength(3);
    expect(model.explanation).toHaveLength(4);
    expect(model.proSoluto).toBe("R$ 32.000,00");
    expect(serialized).toContain("Crédito aprovado");
    expect(serialized).not.toContain("Subsídio");
    expect(serialized).not.toContain("Outros recursos");
  });

  it("resumo e PDF usam o percentual validado pelo motor", () => {
    const invalidForm = { ...form, financeablePercent: 0.95 };
    const result = calculateProSoluto(invalidForm);
    const message = buildProSolutoMessage(invalidForm, result);
    const model = buildProSolutoPdfModel(invalidForm, result);

    expect(result.validatedFinanceablePercent).toBe(0.8);
    expect(message).toContain("Percentual máximo financiável: 80,00%");
    expect(message).not.toContain("95,00%");
    expect(JSON.stringify(model)).toContain("80,00%");
    expect(JSON.stringify(model)).not.toContain("95,00%");
  });
});
