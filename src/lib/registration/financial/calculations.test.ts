import { describe, expect, it } from "vitest";
import { calculateRegistrationDashboard, calculateRegistrationFinancialMetrics } from "./calculations";
import type { RegistrationFinancialCase, RegistrationFinancialTransaction } from "../../../types/registrationFinancial";

function financialCase(patch: Partial<RegistrationFinancialCase> = {}): RegistrationFinancialCase {
  return { id: "case-1", ownerId: "user-1", clientName: "Cliente Exemplo", processReference: "PROC-1", registryOffice: "1º Cartório", city: "São Paulo", operationMode: "FULL_PAYMENT_TO_GOODCREDIT", advisoryFeeExpectedCents: 200_000, estimatedItbiCents: 0, estimatedRegistryCents: 0, estimatedOtherCostsCents: 0, notes: "", financialFinalizedAt: null, openedAt: "2026-07-31", archivedAt: null, createdAt: "2026-07-31T12:00:00Z", updatedAt: "2026-07-31T12:00:00Z", ...patch };
}

function transaction(type: RegistrationFinancialTransaction["transactionType"], amountCents: number, patch: Partial<RegistrationFinancialTransaction> = {}): RegistrationFinancialTransaction {
  return { id: crypto.randomUUID(), caseId: "case-1", ownerId: "user-1", transactionType: type, category: "", transactionDate: "2026-07-31", amountCents, advisoryAllocationCents: 0, costAllocationCents: 0, customerInterestCents: 0, customerTotalPaidCents: amountCents, adjustmentDirection: null, paymentMethod: "", installments: null, installmentAmountCents: null, cardBrand: "", beneficiary: "", referenceNumber: "", description: "", notes: "", createdAt: "2026-07-31T12:00:00Z", updatedAt: "2026-07-31T12:00:00Z", ...patch };
}

describe("cálculos do Balancete Cartorial", () => {
  it("separa assessoria e recursos para custas em centavos", () => {
    const metrics = calculateRegistrationFinancialMetrics(financialCase(), [transaction("INCOME", 500_000, { advisoryAllocationCents: 200_000, costAllocationCents: 300_000 })]);
    expect(metrics.advisoryReceivedCents).toBe(200_000);
    expect(metrics.costFundsReceivedCents).toBe(300_000);
    expect(metrics.availableBalanceCents).toBe(300_000);
    expect(metrics.status).toBe("FUNDS_AVAILABLE");
  });

  it("calcula complemento sem produzir saldo disponível negativo", () => {
    const metrics = calculateRegistrationFinancialMetrics(financialCase(), [
      transaction("INCOME", 300_000, { advisoryAllocationCents: 200_000, costAllocationCents: 100_000 }),
      transaction("EXPENSE", 135_000)
    ]);
    expect(metrics.costBalanceCents).toBe(-35_000);
    expect(metrics.complementRequiredCents).toBe(35_000);
    expect(metrics.availableBalanceCents).toBe(0);
    expect(metrics.status).toBe("COMPLEMENT_REQUIRED");
  });

  it("não mistura juros do cartão nem pagamento direto com o caixa da GoodCredit", () => {
    const metrics = calculateRegistrationFinancialMetrics(financialCase(), [
      transaction("INCOME", 300_000, { advisoryAllocationCents: 200_000, costAllocationCents: 100_000, customerInterestCents: 18_000, customerTotalPaidCents: 318_000 }),
      transaction("DIRECT_CUSTOMER_PAYMENT", 75_000)
    ]);
    expect(metrics.costBalanceCents).toBe(100_000);
    expect(metrics.customerInterestCents).toBe(18_000);
    expect(metrics.directCustomerPaymentsCents).toBe(75_000);
  });

  it("indica valor a devolver ao finalizar com saldo positivo", () => {
    const item = financialCase({ financialFinalizedAt: "2026-07-31T15:00:00Z" });
    const metrics = calculateRegistrationFinancialMetrics(item, [transaction("INCOME", 250_000, { advisoryAllocationCents: 200_000, costAllocationCents: 50_000 })]);
    expect(metrics.status).toBe("VALUE_TO_REFUND");
    expect(metrics.availableBalanceCents).toBe(50_000);
  });

  it("conclui o modo somente assessoria sem alocar custas", () => {
    const item = financialCase({ operationMode: "ADVISORY_ONLY", financialFinalizedAt: "2026-07-31T15:00:00Z" });
    const metrics = calculateRegistrationFinancialMetrics(item, [transaction("INCOME", 200_000, { advisoryAllocationCents: 200_000 })]);
    expect(metrics.costBalanceCents).toBe(0);
    expect(metrics.status).toBe("COMPLETED");
  });

  it("soma os indicadores do painel apenas com processos ativos", () => {
    const active = financialCase();
    const archived = financialCase({ id: "case-2", archivedAt: "2026-07-31T16:00:00Z" });
    const dashboard = calculateRegistrationDashboard([
      { financialCase: active, metrics: calculateRegistrationFinancialMetrics(active, []) },
      { financialCase: archived, metrics: calculateRegistrationFinancialMetrics(archived, []) }
    ]);
    expect(dashboard.activeCases).toBe(1);
    expect(dashboard.pendingAdvisoryCents).toBe(200_000);
  });
});
