import type { RegistrationFinancialCaseInput, RegistrationFinancialTransactionInput } from "../../../types/registrationFinancial";

export function validateRegistrationFinancialCase(input: RegistrationFinancialCaseInput): string[] {
  const errors: string[] = [];
  if (!input.clientName.trim()) errors.push("Informe o nome do cliente.");
  if (!input.openedAt) errors.push("Informe a data de abertura.");
  if (input.advisoryFeeExpectedCents < 0) errors.push("O valor da assessoria não pode ser negativo.");
  if ([input.estimatedItbiCents, input.estimatedRegistryCents, input.estimatedOtherCostsCents, input.itbiAmountCents, input.registryCostsCents].some((value) => value < 0)) {
    errors.push("Os valores estimados não podem ser negativos.");
  }
  return errors;
}

export function validateRegistrationTransaction(
  operationMode: RegistrationFinancialCaseInput["operationMode"],
  input: RegistrationFinancialTransactionInput
): string[] {
  const errors: string[] = [];
  if (!input.transactionDate) errors.push("Informe a data do lançamento.");
  if (input.amountCents <= 0) errors.push("Informe um valor maior que zero.");
  if (input.transactionType === "INCOME") {
    if (input.advisoryAllocationCents + input.costAllocationCents !== input.amountCents) {
      errors.push("A distribuição entre assessoria e custas deve corresponder exatamente ao valor líquido recebido.");
    }
    if (operationMode === "ADVISORY_ONLY" && input.costAllocationCents !== 0) {
      errors.push("No modo Somente assessoria, a alocação para custas deve ser zero.");
    }
    if (input.customerTotalPaidCents < input.amountCents) {
      errors.push("O total pago pelo cliente não pode ser menor que o valor líquido recebido.");
    }
  } else if (input.advisoryAllocationCents !== 0 || input.costAllocationCents !== 0) {
    errors.push("Somente entradas podem possuir distribuição entre assessoria e custas.");
  }
  if (input.transactionType === "ADJUSTMENT" && !input.adjustmentDirection) errors.push("Informe se o ajuste é positivo ou negativo.");
  return errors;
}
