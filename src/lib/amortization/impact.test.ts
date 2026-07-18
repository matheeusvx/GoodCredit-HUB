import { describe, expect, it } from "vitest";
import { generateAmortizationSchedule } from "../financial";
import {
  calculateAmortizationImpact,
  contributionEventsToMap,
  hasActiveContributions
} from "./impact";
import { AmortizationContributionEvent, FinancingInputs } from "../../types/amortization";

const baseInputs: FinancingInputs = {
  nomeCliente: "Cliente teste",
  valorFinanciado: 12000,
  prazoMeses: 12,
  taxaAnual: 0.1,
  sistema: "SAC"
};

function event(
  source: "MANUAL" | "FGTS",
  month: number,
  requestedAmount: number,
  enabled = true
): AmortizationContributionEvent {
  return { id: `${source}-${month}`, source, month, requestedAmount, enabled };
}

describe("impacto das amortizações", () => {
  it("mantém o cenário original quando não existem amortizações", () => {
    const rows = generateAmortizationSchedule(baseInputs);
    const impact = calculateAmortizationImpact(rows);

    expect(impact.totalAmortizationApplied).toBe(0);
    expect(impact.correctedTermMonths).toBe(baseInputs.prazoMeses);
    expect(impact.eliminatedInstallments).toBe(0);
    expect(impact.correctedProjectedTotal).toBeCloseTo(impact.originalProjectedTotal, 6);
  });

  it("considera somente FGTS efetivamente aplicado e a limpeza restaura o original", () => {
    const fgts = { 3: 3000 };
    const impact = calculateAmortizationImpact(generateAmortizationSchedule(baseInputs, {}, fgts));
    const cleared = calculateAmortizationImpact(generateAmortizationSchedule(baseInputs));

    expect(impact.fgtsAmortizationApplied).toBe(3000);
    expect(impact.manualAmortizationApplied).toBe(0);
    expect(cleared.totalAmortizationApplied).toBe(0);
  });

  it("considera somente aportes manuais efetivamente aplicados", () => {
    const impact = calculateAmortizationImpact(generateAmortizationSchedule(baseInputs, { 2: 1500 }, {}));

    expect(impact.manualAmortizationApplied).toBe(1500);
    expect(impact.fgtsAmortizationApplied).toBe(0);
    expect(impact.interestSavings).toBeGreaterThan(0);
  });

  it("aplica manual antes de FGTS e limita ambas as fontes ao saldo restante", () => {
    const inputs = { ...baseInputs, valorFinanciado: 1000, prazoMeses: 2, taxaAnual: 0 };
    const rows = generateAmortizationSchedule(inputs, { 1: 300 }, { 1: 300 });
    const first = rows[0];
    const impact = calculateAmortizationImpact(rows);

    expect(first.manualContributionApplied).toBe(300);
    expect(first.fgtsContributionApplied).toBe(200);
    expect(first.fgtsContributionUnused).toBe(100);
    expect(first.simulatedFinalBalance).toBe(0);
    expect(impact.totalAmortizationApplied).toBe(500);
    expect(impact.correctedProjectedTotal).toBeCloseTo(1000, 6);
    expect(impact.totalCostReduction).toBeCloseTo(0, 6);
  });

  it("marca aporte maior que o saldo como parcialmente aplicado", () => {
    const inputs = { ...baseInputs, valorFinanciado: 1000, prazoMeses: 2, taxaAnual: 0 };
    const rows = generateAmortizationSchedule(inputs, { 1: 3000 }, {});
    const result = rows[0].eventResults[0];

    expect(result.appliedAmount).toBe(500);
    expect(result.unusedAmount).toBe(2500);
    expect(result.status).toBe("PARTIALLY_APPLIED");
    expect(rows[0].simulatedFinalBalance).toBe(0);
  });

  it("não aplica eventos posteriores à quitação", () => {
    const inputs = { ...baseInputs, valorFinanciado: 1000, prazoMeses: 3, taxaAnual: 0 };
    const rows = generateAmortizationSchedule(inputs, { 1: 1000, 2: 500 }, {});
    const laterResult = rows[1].eventResults[0];
    const impact = calculateAmortizationImpact(rows);

    expect(rows[1].afterPayoff).toBe(true);
    expect(laterResult.status).toBe("NOT_USED_AFTER_PAYOFF");
    expect(laterResult.appliedAmount).toBe(0);
    expect(impact.unusedManualAmount).toBeCloseTo(rows[0].manualContributionUnused + 500, 6);
  });

  it.each(["SAC", "PRICE"] as const)("preserva o contrato %s e encerra o corrigido após a quitação", (sistema) => {
    const inputs = { ...baseInputs, sistema };
    const rows = generateAmortizationSchedule(inputs, { 1: 20000 }, {});
    const impact = calculateAmortizationImpact(rows);

    expect(rows).toHaveLength(inputs.prazoMeses);
    expect(rows[0].contractInstallment).toBeGreaterThan(0);
    expect(rows[0].simulatedFinalBalance).toBe(0);
    expect(rows.slice(1).every((row) => row.afterPayoff && row.simulatedInterest === 0)).toBe(true);
    expect(impact.correctedTermMonths).toBe(1);
  });

  it("centraliza a regra de evento ativo e ignora eventos zerados ou desativados", () => {
    const events = [event("FGTS", 24, 10000, false), event("FGTS", 48, 0), event("FGTS", 72, 5000)];

    expect(hasActiveContributions(events, "FGTS", 420)).toBe(true);
    expect(contributionEventsToMap(events, "FGTS", 60)).toEqual({});
  });

  it("registra eventos configurados inválidos sem aplicá-los", () => {
    const invalid = event("MANUAL", 0, 1000);
    const impact = calculateAmortizationImpact(generateAmortizationSchedule(baseInputs), [invalid]);

    expect(impact.eventResults).toContainEqual(expect.objectContaining({ status: "INVALID", appliedAmount: 0 }));
  });
});
