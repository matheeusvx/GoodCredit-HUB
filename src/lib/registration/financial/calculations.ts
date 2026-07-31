import type {
  RegistrationFinancialCase,
  RegistrationFinancialMetrics,
  RegistrationFinancialStatus,
  RegistrationFinancialTransaction
} from "../../../types/registrationFinancial";

function sum(transactions: RegistrationFinancialTransaction[], predicate: (item: RegistrationFinancialTransaction) => boolean) {
  return transactions.filter(predicate).reduce((total, item) => total + item.amountCents, 0);
}

export function calculateRegistrationFinancialMetrics(
  financialCase: RegistrationFinancialCase,
  transactions: RegistrationFinancialTransaction[]
): RegistrationFinancialMetrics {
  const income = transactions.filter((item) => item.transactionType === "INCOME");
  const advisoryReceivedCents = income.reduce((total, item) => total + item.advisoryAllocationCents, 0);
  const costFundsReceivedCents = income.reduce((total, item) => total + item.costAllocationCents, 0);
  const goodCreditExpensesCents = sum(transactions, (item) => item.transactionType === "EXPENSE");
  const directCustomerPaymentsCents = sum(transactions, (item) => item.transactionType === "DIRECT_CUSTOMER_PAYMENT");
  const refundsCents = sum(transactions, (item) => item.transactionType === "REFUND");
  const positiveAdjustmentsCents = sum(transactions, (item) => item.transactionType === "ADJUSTMENT" && item.adjustmentDirection === "POSITIVE");
  const negativeAdjustmentsCents = sum(transactions, (item) => item.transactionType === "ADJUSTMENT" && item.adjustmentDirection === "NEGATIVE");
  const customerInterestCents = income.reduce((total, item) => total + item.customerInterestCents, 0);
  const customerTotalPaidCents = income.reduce((total, item) => total + Math.max(item.customerTotalPaidCents, item.amountCents), 0);
  const advisoryPendingCents = Math.max(financialCase.advisoryFeeExpectedCents - advisoryReceivedCents, 0);
  const costBalanceCents = costFundsReceivedCents + positiveAdjustmentsCents - goodCreditExpensesCents - refundsCents - negativeAdjustmentsCents;
  const availableBalanceCents = Math.max(costBalanceCents, 0);
  const complementRequiredCents = Math.max(-costBalanceCents, 0);

  const metricsWithoutStatus = {
    advisoryReceivedCents,
    advisoryPendingCents,
    costFundsReceivedCents,
    goodCreditExpensesCents,
    directCustomerPaymentsCents,
    refundsCents,
    positiveAdjustmentsCents,
    negativeAdjustmentsCents,
    costBalanceCents,
    availableBalanceCents,
    complementRequiredCents,
    customerInterestCents,
    customerTotalPaidCents
  };
  return { ...metricsWithoutStatus, status: deriveRegistrationFinancialStatus(financialCase, transactions, metricsWithoutStatus) };
}

function deriveRegistrationFinancialStatus(
  financialCase: RegistrationFinancialCase,
  transactions: RegistrationFinancialTransaction[],
  metrics: Omit<RegistrationFinancialMetrics, "status">
): RegistrationFinancialStatus {
  if (financialCase.archivedAt) return "ARCHIVED";
  const finalized = Boolean(financialCase.financialFinalizedAt);
  if (financialCase.operationMode === "ADVISORY_ONLY") {
    if (finalized) return "COMPLETED";
    if (metrics.advisoryReceivedCents === 0) return "ADVISORY_PENDING";
    if (metrics.advisoryPendingCents > 0) return "ADVISORY_PARTIAL";
    const expectedDirectCosts = financialCase.estimatedItbiCents + financialCase.estimatedRegistryCents + financialCase.estimatedOtherCostsCents;
    if (expectedDirectCosts > 0 && metrics.directCustomerPaymentsCents === 0) return "WAITING_DIRECT_PAYMENTS";
    if (metrics.directCustomerPaymentsCents > 0) return "DIRECT_COSTS_REGISTERED";
    return "ADVISORY_RECEIVED";
  }
  if (finalized && metrics.costBalanceCents === 0 && metrics.advisoryPendingCents === 0) return "CONCILIATED";
  if (metrics.complementRequiredCents > 0) return "COMPLEMENT_REQUIRED";
  if (finalized && metrics.availableBalanceCents > 0) return "VALUE_TO_REFUND";
  if (metrics.costFundsReceivedCents === 0 && metrics.advisoryReceivedCents === 0) return "AWAITING_PAYMENT";
  if (metrics.advisoryPendingCents > 0) return "PARTIAL_PAYMENT";
  if (metrics.goodCreditExpensesCents > 0) return "COSTS_IN_PROGRESS";
  if (metrics.availableBalanceCents > 0) return "FUNDS_AVAILABLE";
  return transactions.length > 0 ? "COSTS_IN_PROGRESS" : "AWAITING_PAYMENT";
}

export function calculateRegistrationDashboard(records: Array<{ financialCase: RegistrationFinancialCase; metrics: RegistrationFinancialMetrics }>) {
  const active = records.filter(({ financialCase }) => !financialCase.archivedAt);
  return {
    activeCases: active.length,
    pendingAdvisoryCents: active.reduce((total, record) => total + record.metrics.advisoryPendingCents, 0),
    availableBalanceCents: active.reduce((total, record) => total + record.metrics.availableBalanceCents, 0),
    complementRequiredCents: active.reduce((total, record) => total + record.metrics.complementRequiredCents, 0),
    valueToRefundCents: active.filter((record) => record.metrics.status === "VALUE_TO_REFUND").reduce((total, record) => total + record.metrics.availableBalanceCents, 0)
  };
}
