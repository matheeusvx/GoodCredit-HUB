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

export type RegistrationFinancialCaseInput = Pick<
  RegistrationFinancialCase,
  | "clientName"
  | "processReference"
  | "registryOffice"
  | "city"
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
