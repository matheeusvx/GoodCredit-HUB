export const IQ_STATUS_LABELS = {
  SANTANDER: "Santander", CAIXA: "Caixa", INTER: "Inter", ITAU: "Itaú", BRADESCO: "Bradesco", BANCO_DO_BRASIL: "Banco do Brasil", NAO: "Não"
} as const;
export const PAYMENT_STATUS_LABELS = {
  TO_CHARGE: "Cobrar", FULL_PAYMENT: "PG Total", FOLLOWED_ACCOUNT: "Seguiu Conta", ADVISORY_ONLY: "Assessoria", NO_PAYMENT: "Sem Pagar"
} as const;
export const COLLECTION_STATUS_LABELS = {
  TO_CHARGE: "Cobrar", ALREADY_PAID: "Já Pago", NOTHING_PAID: "Não Pagou Nada", DO_NOT_CHARGE: "Não Cobrar", CHARGE_SENT: "Enviamos Cobrança"
} as const;
export const ITBI_PAYMENT_STATUS_LABELS = {
  PENDING: "Pendente", PAID_BY_GOODCREDIT: "Pago pela GoodCredit", PAID_BY_CLIENT: "Pago pelo cliente", EXEMPT: "Isento", NOT_APPLICABLE: "Não se aplica"
} as const;
export const REGISTRY_COSTS_PAYMENT_STATUS_LABELS = {
  PENDING: "Pendente", PAID_BY_GOODCREDIT: "Pago pela GoodCredit", PAID_BY_CLIENT: "Pago pelo cliente", NOT_APPLICABLE: "Não se aplica"
} as const;
export const SELLER_PAYMENT_STATUS_LABELS = {
  PENDING: "Pendente", IN_PROGRESS: "Em processamento", PAID: "Pago", NOT_APPLICABLE: "Não se aplica"
} as const;

export const INCOME_CATEGORIES = ["Assessoria", "Recursos para custas", "Pagamento total", "Complemento", "Outros recebimentos"] as const;
export const EXPENSE_CATEGORIES = ["ITBI", "Custas cartorárias", "Motoboy", "Prenotação", "Reingresso", "Certidão", "Averbação", "Prefeitura", "Devolução ao cliente", "Outras despesas"] as const;
