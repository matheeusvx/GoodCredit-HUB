export type RegistrationFinancialOperationMode =
  | "FULL_PAYMENT_TO_GOODCREDIT"
  | "ADVISORY_ONLY";

export type RegistrationFinancialTransactionType =
  | "INCOME"
  | "EXPENSE"
  | "DIRECT_CUSTOMER_PAYMENT"
  | "REFUND"
  | "ADJUSTMENT";

export type RegistrationFinancialAdjustmentDirection = "POSITIVE" | "NEGATIVE";

export type RegistrationIqStatus =
  | "SANTANDER" | "CAIXA" | "INTER" | "ITAU" | "BRADESCO" | "BANCO_DO_BRASIL" | "NAO";
export type RegistrationPaymentStatus = "TO_CHARGE" | "FULL_PAYMENT" | "FOLLOWED_ACCOUNT" | "ADVISORY_ONLY" | "NO_PAYMENT";
export type RegistrationCollectionStatus = "TO_CHARGE" | "ALREADY_PAID" | "NOTHING_PAID" | "DO_NOT_CHARGE" | "CHARGE_SENT";
export type RegistrationItbiPaymentStatus = "PENDING" | "PAID_BY_GOODCREDIT" | "PAID_BY_CLIENT" | "EXEMPT" | "NOT_APPLICABLE";
export type RegistrationCostsPaymentStatus = "PENDING" | "PAID_BY_GOODCREDIT" | "PAID_BY_CLIENT" | "NOT_APPLICABLE";
export type RegistrationSellerPaymentStatus = "PENDING" | "IN_PROGRESS" | "PAID" | "NOT_APPLICABLE";

export type RegistrationFinancialStatus =
  | "AWAITING_PAYMENT"
  | "PARTIAL_PAYMENT"
  | "FUNDS_AVAILABLE"
  | "COSTS_IN_PROGRESS"
  | "COMPLEMENT_REQUIRED"
  | "VALUE_TO_REFUND"
  | "CONCILIATED"
  | "ADVISORY_PENDING"
  | "ADVISORY_PARTIAL"
  | "ADVISORY_RECEIVED"
  | "WAITING_DIRECT_PAYMENTS"
  | "DIRECT_COSTS_REGISTERED"
  | "COMPLETED"
  | "ARCHIVED";

export interface RegistrationFinancialCase {
  id: string;
  ownerId: string;
  clientName: string;
  processReference: string;
  registryOffice: string;
  city: string;
  controlNumber: number | null;
  signingDate: string | null;
  referralSource: string;
  bankBranch: string;
  iqStatus: RegistrationIqStatus | null;
  paymentStatus: RegistrationPaymentStatus | null;
  collectionStatus: RegistrationCollectionStatus | null;
  itbiAmountCents: number;
  itbiPaymentStatus: RegistrationItbiPaymentStatus | null;
  protocolReference: string;
  registryCostsCents: number;
  registryCostsPaymentStatus: RegistrationCostsPaymentStatus | null;
  operationalStatus: string;
  operationalStatusUpdatedAt: string | null;
  bankDeliveryDate: string | null;
  sellerPaymentStatus: RegistrationSellerPaymentStatus | null;
  sellerPaymentDate: string | null;
  operationMode: RegistrationFinancialOperationMode;
  advisoryFeeExpectedCents: number;
  estimatedItbiCents: number;
  estimatedRegistryCents: number;
  estimatedOtherCostsCents: number;
  notes: string;
  financialFinalizedAt: string | null;
  openedAt: string;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RegistrationFinancialTransaction {
  id: string;
  caseId: string;
  ownerId: string;
  transactionType: RegistrationFinancialTransactionType;
  category: string;
  transactionDate: string;
  amountCents: number;
  advisoryAllocationCents: number;
  costAllocationCents: number;
  customerInterestCents: number;
  customerTotalPaidCents: number;
  adjustmentDirection: RegistrationFinancialAdjustmentDirection | null;
  paymentMethod: string;
  installments: number | null;
  installmentAmountCents: number | null;
  cardBrand: string;
  beneficiary: string;
  referenceNumber: string;
  description: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface RegistrationFinancialMetrics {
  advisoryReceivedCents: number;
  advisoryPendingCents: number;
  costFundsReceivedCents: number;
  goodCreditExpensesCents: number;
  directCustomerPaymentsCents: number;
  refundsCents: number;
  positiveAdjustmentsCents: number;
  negativeAdjustmentsCents: number;
  costBalanceCents: number;
  availableBalanceCents: number;
  complementRequiredCents: number;
  customerInterestCents: number;
  customerTotalPaidCents: number;
  status: RegistrationFinancialStatus;
}

export interface RegistrationFinancialCaseWithMetrics {
  financialCase: RegistrationFinancialCase;
  metrics: RegistrationFinancialMetrics;
}

export interface RegistrationFinancialCaseDetail extends RegistrationFinancialCaseWithMetrics {
  transactions: RegistrationFinancialTransaction[];
}

export type RegistrationFinancialArchiveFilter = "ACTIVE" | "ARCHIVED" | "ALL";
export type RegistrationFinancialSort = "UPDATED_DESC" | "UPDATED_ASC" | "CLIENT_ASC" | "OPENED_DESC";

export interface RegistrationFinancialListFilters {
  search: string;
  operationMode: "ALL" | RegistrationFinancialOperationMode;
  status: "ALL" | RegistrationFinancialStatus;
  archive: RegistrationFinancialArchiveFilter;
  sort: RegistrationFinancialSort;
  page: number;
  pageSize: 10 | 25 | 50;
}

export interface RegistrationFinancialListResult {
  records: RegistrationFinancialCaseWithMetrics[];
  total: number;
}

export interface RegistrationFinancialDashboard {
  activeCases: number;
  pendingAdvisoryCents: number;
  availableBalanceCents: number;
  complementRequiredCents: number;
  valueToRefundCents: number;
}

export interface RegistrationOperationalDashboard {
  activeProcesses: number;
  toCharge: number;
  receivedByGoodCreditCents: number;
  pendingItbiOrRegistry: number;
}

export interface RegistrationFinancialReportFilters {
  startDate: string;
  endDate: string;
  clientSearch: string;
  processSearch: string;
  operationMode: "ALL" | RegistrationFinancialOperationMode;
  registryOffice: string;
  iqStatus: "ALL" | RegistrationIqStatus;
  paymentStatus: "ALL" | RegistrationPaymentStatus;
  collectionStatus: "ALL" | RegistrationCollectionStatus;
  archive: RegistrationFinancialArchiveFilter;
}

export interface RegistrationMonthlyCashFlow {
  competence: string;
  incomeCents: number;
  expensesCents: number;
  refundsCents: number;
  netBalanceCents: number;
  cumulativeBalanceCents: number;
}

export interface RegistrationCategorySummary {
  category: string;
  incomeCents: number;
  expenseCents: number;
  balanceCents: number;
}

export interface RegistrationProcessSummary {
  caseId: string;
  clientName: string;
  processReference: string;
  receivedCents: number;
  paidCents: number;
  balanceCents: number;
  pendingReceivableCents: number;
  refundableCents: number;
  status: RegistrationFinancialStatus;
}

export type RegistrationFinancialHealthStatus = "HEALTHY" | "ATTENTION" | "CRITICAL";

export interface RegistrationCashFlowReport {
  netIncomeCents: number;
  operationalExpensesCents: number;
  refundsCents: number;
  netBalanceCents: number;
  advisoryReceivedCents: number;
  costFundsReceivedCents: number;
  itbiPaidCents: number;
  registryFeesPaidCents: number;
  directCustomerPaymentsCents: number;
  customerInterestCents: number;
  receivableCents: number;
  refundableCents: number;
  pendingPaymentCents: number;
  divergenceCount: number;
  reconciledCount: number;
  expenseToIncomePercent: number | null;
  healthStatus: RegistrationFinancialHealthStatus;
  healthExplanation: string;
  monthly: RegistrationMonthlyCashFlow[];
  categories: RegistrationCategorySummary[];
  processes: RegistrationProcessSummary[];
}

export type RegistrationFinancialCaseInput = Pick<
  RegistrationFinancialCase,
  | "clientName"
  | "processReference"
  | "registryOffice"
  | "city"
  | "signingDate"
  | "referralSource"
  | "bankBranch"
  | "iqStatus"
  | "paymentStatus"
  | "collectionStatus"
  | "itbiAmountCents"
  | "itbiPaymentStatus"
  | "protocolReference"
  | "registryCostsCents"
  | "registryCostsPaymentStatus"
  | "operationalStatus"
  | "bankDeliveryDate"
  | "sellerPaymentStatus"
  | "sellerPaymentDate"
  | "operationMode"
  | "advisoryFeeExpectedCents"
  | "estimatedItbiCents"
  | "estimatedRegistryCents"
  | "estimatedOtherCostsCents"
  | "notes"
  | "openedAt"
>;

export type RegistrationFinancialTransactionInput = Omit<
  RegistrationFinancialTransaction,
  "id" | "caseId" | "ownerId" | "createdAt" | "updatedAt"
>;
