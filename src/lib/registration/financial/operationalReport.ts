import type {
  RegistrationCashFlowReport,
  RegistrationCategorySummary,
  RegistrationFinancialCaseWithMetrics,
  RegistrationFinancialReportFilters,
  RegistrationFinancialTransaction,
  RegistrationOperationalDashboard,
  RegistrationProcessSummary
} from "../../../types/registrationFinancial";
import { formatCentsBRL } from "./money";

export function calculateOperationalDashboard(
  records: RegistrationFinancialCaseWithMetrics[]
): RegistrationOperationalDashboard {
  const active = records.filter(({ financialCase }) => !financialCase.archivedAt);
  return {
    activeProcesses: active.length,
    toCharge: active.filter(({ financialCase }) => financialCase.paymentStatus === "TO_CHARGE" || financialCase.collectionStatus === "TO_CHARGE" || financialCase.collectionStatus === "NOTHING_PAID").length,
    receivedByGoodCreditCents: active.reduce((total, item) => total + item.metrics.advisoryReceivedCents + item.metrics.costFundsReceivedCents, 0),
    pendingItbiOrRegistry: active.filter(({ financialCase }) =>
      (!financialCase.itbiPaymentStatus || financialCase.itbiPaymentStatus === "PENDING") ||
      (!financialCase.registryCostsPaymentStatus || financialCase.registryCostsPaymentStatus === "PENDING")
    ).length
  };
}

function matchesCaseFilters(record: RegistrationFinancialCaseWithMetrics, filters: RegistrationFinancialReportFilters): boolean {
  const item = record.financialCase;
  if (filters.archive === "ACTIVE" && item.archivedAt) return false;
  if (filters.archive === "ARCHIVED" && !item.archivedAt) return false;
  if (filters.clientSearch && !item.clientName.toLocaleLowerCase("pt-BR").includes(filters.clientSearch.toLocaleLowerCase("pt-BR"))) return false;
  if (filters.processSearch && !item.processReference.toLocaleLowerCase("pt-BR").includes(filters.processSearch.toLocaleLowerCase("pt-BR"))) return false;
  if (filters.operationMode !== "ALL" && item.operationMode !== filters.operationMode) return false;
  if (filters.registryOffice && !item.registryOffice.toLocaleLowerCase("pt-BR").includes(filters.registryOffice.toLocaleLowerCase("pt-BR"))) return false;
  if (filters.iqStatus !== "ALL" && item.iqStatus !== filters.iqStatus) return false;
  if (filters.paymentStatus !== "ALL" && item.paymentStatus !== filters.paymentStatus) return false;
  if (filters.collectionStatus !== "ALL" && item.collectionStatus !== filters.collectionStatus) return false;
  return true;
}

function categoryName(transaction: RegistrationFinancialTransaction): string {
  const value = transaction.category.trim().toLocaleLowerCase("pt-BR");
  if (transaction.transactionType === "REFUND" || value.includes("devol")) return "Devoluções";
  if (value.includes("itbi")) return "ITBI";
  if (value.includes("cartor") || value.includes("registry")) return "Custas cartorárias";
  if (value.includes("motoboy")) return "Motoboy";
  if (transaction.transactionType === "INCOME" && transaction.advisoryAllocationCents > 0 && transaction.costAllocationCents === 0) return "Assessoria";
  if (transaction.transactionType === "INCOME" && transaction.costAllocationCents > 0 && transaction.advisoryAllocationCents === 0) return "Recursos para custas";
  return transaction.transactionType === "INCOME" ? "Outras entradas" : "Outras despesas";
}

export function calculateCategorySummary(transactions: RegistrationFinancialTransaction[]): RegistrationCategorySummary[] {
  const categories = ["Assessoria", "Recursos para custas", "ITBI", "Custas cartorárias", "Motoboy", "Devoluções", "Outras despesas"];
  const map = new Map<string, RegistrationCategorySummary>(categories.map((category) => [category, { category, incomeCents: 0, expenseCents: 0, balanceCents: 0 }]));
  const add = (category: string, incomeCents: number, expenseCents: number) => {
    const current = map.get(category) ?? { category, incomeCents: 0, expenseCents: 0, balanceCents: 0 };
    current.incomeCents += incomeCents;
    current.expenseCents += expenseCents;
    current.balanceCents = current.incomeCents - current.expenseCents;
    map.set(category, current);
  };
  for (const transaction of transactions) {
    if (transaction.transactionType === "INCOME") {
      if (transaction.advisoryAllocationCents > 0) add("Assessoria", transaction.advisoryAllocationCents, 0);
      if (transaction.costAllocationCents > 0) add("Recursos para custas", transaction.costAllocationCents, 0);
      const unallocatedCents = Math.max(transaction.amountCents - transaction.advisoryAllocationCents - transaction.costAllocationCents, 0);
      if (unallocatedCents > 0) add("Outras entradas", unallocatedCents, 0);
      continue;
    }
    if (transaction.transactionType !== "EXPENSE" && transaction.transactionType !== "REFUND") continue;
    const category = categoryName(transaction);
    add(category, 0, transaction.amountCents);
  }
  return [...map.values()];
}

export function calculateProcessSummary(
  records: RegistrationFinancialCaseWithMetrics[],
  transactions: RegistrationFinancialTransaction[]
): RegistrationProcessSummary[] {
  return records.map(({ financialCase, metrics }) => {
    const own = transactions.filter((item) => item.caseId === financialCase.id);
    const receivedCents = own.filter((item) => item.transactionType === "INCOME").reduce((sum, item) => sum + item.amountCents, 0);
    const paidCents = own.filter((item) => item.transactionType === "EXPENSE" || item.transactionType === "REFUND").reduce((sum, item) => sum + item.amountCents, 0);
    return {
      caseId: financialCase.id, clientName: financialCase.clientName, processReference: financialCase.processReference,
      receivedCents, paidCents, balanceCents: receivedCents - paidCents,
      pendingReceivableCents: metrics.advisoryPendingCents + metrics.complementRequiredCents,
      refundableCents: metrics.status === "VALUE_TO_REFUND" ? metrics.availableBalanceCents : 0,
      status: metrics.status
    };
  });
}

export function calculateCashFlowReport(
  records: RegistrationFinancialCaseWithMetrics[],
  transactions: RegistrationFinancialTransaction[],
  filters: RegistrationFinancialReportFilters
): RegistrationCashFlowReport {
  const filteredRecords = records.filter((record) => matchesCaseFilters(record, filters));
  const ids = new Set(filteredRecords.map(({ financialCase }) => financialCase.id));
  const filteredTransactions = transactions.filter((item) => ids.has(item.caseId) && item.transactionDate >= filters.startDate && item.transactionDate <= filters.endDate);
  const incomes = filteredTransactions.filter((item) => item.transactionType === "INCOME");
  const expenses = filteredTransactions.filter((item) => item.transactionType === "EXPENSE");
  const refunds = filteredTransactions.filter((item) => item.transactionType === "REFUND");
  const direct = filteredTransactions.filter((item) => item.transactionType === "DIRECT_CUSTOMER_PAYMENT");
  const netIncomeCents = incomes.reduce((sum, item) => sum + item.amountCents, 0);
  const operationalExpensesCents = expenses.reduce((sum, item) => sum + item.amountCents, 0);
  const refundsCents = refunds.reduce((sum, item) => sum + item.amountCents, 0);
  const netBalanceCents = netIncomeCents - operationalExpensesCents - refundsCents;
  const receivableCents = filteredRecords.reduce((sum, item) => sum + item.metrics.advisoryPendingCents + item.metrics.complementRequiredCents, 0);
  const refundableCents = filteredRecords.reduce((sum, item) => sum + (item.metrics.status === "VALUE_TO_REFUND" ? item.metrics.availableBalanceCents : 0), 0);
  const pendingPaymentCents = filteredRecords.reduce((sum, { financialCase }) => sum +
    ((!financialCase.itbiPaymentStatus || financialCase.itbiPaymentStatus === "PENDING") ? financialCase.itbiAmountCents : 0) +
    ((!financialCase.registryCostsPaymentStatus || financialCase.registryCostsPaymentStatus === "PENDING") ? financialCase.registryCostsCents : 0), 0);
  const divergenceCount = filteredRecords.filter(({ financialCase, metrics }) => metrics.complementRequiredCents > 0 || financialCase.collectionStatus === "NOTHING_PAID" || financialCase.paymentStatus === "TO_CHARGE").length;
  const paymentWithoutFundsCount = filteredRecords.filter(({ metrics }) => metrics.complementRequiredCents > 0).length;
  const reconciledCount = filteredRecords.filter(({ metrics }) => metrics.status === "CONCILIATED" || metrics.status === "COMPLETED").length;
  const expenseToIncomePercent = netIncomeCents > 0 ? ((operationalExpensesCents + refundsCents) / netIncomeCents) * 100 : null;

  let healthStatus: RegistrationCashFlowReport["healthStatus"] = "HEALTHY";
  let healthExplanation = "Saldo não negativo e nenhuma divergência crítica no período.";
  if (netBalanceCents < 0 || (netIncomeCents === 0 && operationalExpensesCents + refundsCents > 0)) {
    healthStatus = "CRITICAL";
    healthExplanation = `As saídas superam as entradas em ${formatCentsBRL(Math.abs(netBalanceCents))}.`;
  } else if (paymentWithoutFundsCount > 0) {
    healthStatus = "CRITICAL";
    healthExplanation = `Existem ${paymentWithoutFundsCount} processo(s) com pagamentos sem recursos correspondentes registrados.`;
  } else if (receivableCents > 0 || pendingPaymentCents > 0 || divergenceCount > 0 || (expenseToIncomePercent !== null && expenseToIncomePercent >= 80)) {
    healthStatus = "ATTENTION";
    healthExplanation = `Existem ${formatCentsBRL(receivableCents)} pendentes de recebimento e ${formatCentsBRL(pendingPaymentCents)} pendentes de pagamento.`;
  }

  const monthMap = new Map<string, { incomeCents: number; expensesCents: number; refundsCents: number }>();
  for (const item of filteredTransactions) {
    const competence = item.transactionDate.slice(0, 7);
    const current = monthMap.get(competence) ?? { incomeCents: 0, expensesCents: 0, refundsCents: 0 };
    if (item.transactionType === "INCOME") current.incomeCents += item.amountCents;
    if (item.transactionType === "EXPENSE") current.expensesCents += item.amountCents;
    if (item.transactionType === "REFUND") current.refundsCents += item.amountCents;
    monthMap.set(competence, current);
  }
  let cumulativeBalanceCents = 0;
  const monthly = [...monthMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([competence, value]) => {
    const monthlyBalance = value.incomeCents - value.expensesCents - value.refundsCents;
    cumulativeBalanceCents += monthlyBalance;
    return { competence, ...value, netBalanceCents: monthlyBalance, cumulativeBalanceCents };
  });

  return {
    netIncomeCents, operationalExpensesCents, refundsCents, netBalanceCents,
    advisoryReceivedCents: incomes.reduce((sum, item) => sum + item.advisoryAllocationCents, 0),
    costFundsReceivedCents: incomes.reduce((sum, item) => sum + item.costAllocationCents, 0),
    itbiPaidCents: expenses.filter((item) => categoryName(item) === "ITBI").reduce((sum, item) => sum + item.amountCents, 0),
    registryFeesPaidCents: expenses.filter((item) => categoryName(item) === "Custas cartorárias").reduce((sum, item) => sum + item.amountCents, 0),
    directCustomerPaymentsCents: direct.reduce((sum, item) => sum + item.amountCents, 0),
    customerInterestCents: incomes.reduce((sum, item) => sum + item.customerInterestCents, 0),
    receivableCents, refundableCents, pendingPaymentCents, divergenceCount, reconciledCount, expenseToIncomePercent,
    healthStatus, healthExplanation, monthly, categories: calculateCategorySummary(filteredTransactions), processes: calculateProcessSummary(filteredRecords, filteredTransactions)
  };
}
