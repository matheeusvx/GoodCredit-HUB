export const DEFAULT_REGISTRATION_ADVISORY_FEE_CENTS = 200_000;

export const REGISTRATION_FINANCIAL_MODE_LABELS = {
  FULL_PAYMENT_TO_GOODCREDIT: "Pagamento total à GoodCredit",
  ADVISORY_ONLY: "Somente assessoria"
} as const;

export const REGISTRATION_FINANCIAL_STATUS_LABELS = {
  AWAITING_PAYMENT: "Aguardando pagamento",
  PARTIAL_PAYMENT: "Pagamento parcial",
  FUNDS_AVAILABLE: "Recursos disponíveis",
  COSTS_IN_PROGRESS: "Custas em andamento",
  COMPLEMENT_REQUIRED: "Complemento necessário",
  VALUE_TO_REFUND: "Valor a devolver",
  CONCILIATED: "Conciliado",
  ADVISORY_PENDING: "Assessoria pendente",
  ADVISORY_PARTIAL: "Assessoria parcial",
  ADVISORY_RECEIVED: "Assessoria recebida",
  WAITING_DIRECT_PAYMENTS: "Aguardando pagamentos diretos",
  DIRECT_COSTS_REGISTERED: "Custas diretas registradas",
  COMPLETED: "Concluído",
  ARCHIVED: "Arquivado"
} as const;

export const REGISTRATION_TRANSACTION_LABELS = {
  INCOME: "Entrada",
  EXPENSE: "Despesa paga pela GoodCredit",
  DIRECT_CUSTOMER_PAYMENT: "Pagamento direto do cliente",
  REFUND: "Devolução ao cliente",
  ADJUSTMENT: "Ajuste"
} as const;
