import { describe, expect, it } from "vitest";
import { validateRegistrationTransaction } from "./validation";
import type { RegistrationFinancialTransactionInput } from "../../../types/registrationFinancial";

function input(patch: Partial<RegistrationFinancialTransactionInput> = {}): RegistrationFinancialTransactionInput {
  return { transactionType: "INCOME", category: "", transactionDate: "2026-07-31", amountCents: 300_000, advisoryAllocationCents: 200_000, costAllocationCents: 100_000, customerInterestCents: 0, customerTotalPaidCents: 300_000, adjustmentDirection: null, paymentMethod: "", installments: null, installmentAmountCents: null, cardBrand: "", beneficiary: "", referenceNumber: "", description: "", notes: "", ...patch };
}

describe("validação de lançamentos cartoriais", () => {
  it("exige distribuição exata da entrada", () => {
    expect(validateRegistrationTransaction("FULL_PAYMENT_TO_GOODCREDIT", input({ costAllocationCents: 99_999 }))).toContain("A distribuição entre assessoria e custas deve corresponder exatamente ao valor líquido recebido.");
  });
  it("impede custas no modo somente assessoria", () => {
    expect(validateRegistrationTransaction("ADVISORY_ONLY", input())).toContain("No modo Somente assessoria, a alocação para custas deve ser zero.");
  });
  it("aceita juros quando o total do cliente é maior que o líquido recebido", () => {
    expect(validateRegistrationTransaction("FULL_PAYMENT_TO_GOODCREDIT", input({ customerInterestCents: 20_000, customerTotalPaidCents: 320_000 }))).toEqual([]);
  });
});
