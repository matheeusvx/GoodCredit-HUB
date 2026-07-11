import { ClassificationReason, IncomeProfile, TransactionClassification } from "../../types/incomeAnalysis";

export const INCOME_ANALYSIS_RULES = {
  classifications: { INCLUDE: "Considerar como renda", EXCLUDE: "Desconsiderar", REVIEW: "Revisar manualmente" },
  exclusionReasons: {
    SAME_OWNERSHIP: "Mesma titularidade", SPOUSE_OR_COPARTICIPANT: "Cônjuge ou outro proponente", PARENTS_OR_FAMILY: "Pais ou familiares", INVESTMENT_REDEMPTION: "Resgate ou baixa de aplicação", DUPLICATE: "Duplicidade", REVERSAL: "Estorno", LOAN: "Empréstimo ou crédito contratado", REFUND: "Reembolso ou devolução", BETWEEN_ANALYZED_ACCOUNTS: "Transferência entre contas analisadas", OWN_CAPITAL: "Aporte de capital próprio", ASSET_SALE: "Venda de bem ou entrada extraordinária", OTHER: "Outro"
  },
  inclusionReasons: {
    PROFESSIONAL_REVENUE: "Receita da atividade profissional", CLIENT_PAYMENT: "Pagamento de cliente", SERVICE: "Prestação de serviço", RECURRING_SALE: "Venda recorrente de produto", FEES: "Honorários", COMMISSION: "Comissão", PRO_LABORE: "Pró-labore", RECURRING_DISTRIBUTION: "Distribuição recorrente compatível", SALARY_COMPLEMENT: "Salário ou renda complementar", OPERATING_REVENUE: "Receita operacional identificada", OTHER: "Outro"
  },
  reviewReasons: {
    UNIDENTIFIED_PIX: "PIX sem identificação", CASH_DEPOSIT: "Depósito em dinheiro", GENERIC_DESCRIPTION: "Descrição genérica", UNUSUAL_VALUE: "Valor atípico", POSSIBLE_DUPLICATE: "Possível duplicidade", ONE_OFF_ENTRY: "Entrada não recorrente", FRACTIONED_CREDITS: "Múltiplos créditos fracionados", LOW_CONFIDENCE: "Sugestão automática com baixa confiança", OTHER: "Outro"
  },
  moderateVariationPercent: 0.30,
  highVariationPercent: 0.60
} as const;

export const INCOME_PROFILE_LABELS: Record<IncomeProfile, string> = { AUTONOMO: "Profissional Autônomo", LIBERAL: "Profissional Liberal", EMPRESARIO: "Empresário", MEI: "Microempreendedor Individual — MEI", INFORMAL: "Trabalhador Informal", CLT_COMPLEMENTAR: "CLT com renda complementar", OUTRO: "Outro" };

export const CLASSIFICATION_KEYWORDS: Array<{ terms: string[]; classification: TransactionClassification; reason: ClassificationReason; label: string }> = [
  { terms: ["mesma titularidade", "minhas contas", "conta propria", "ted propria", "pix de conta propria"], classification: "EXCLUDE", reason: "SAME_OWNERSHIP", label: "Possível transferência de mesma titularidade" },
  { terms: ["resgate", "cdb", "investimento", "fundo", "corretora"], classification: "EXCLUDE", reason: "INVESTMENT_REDEMPTION", label: "Possível resgate de aplicação" },
  { terms: ["estorno", "devolucao", "reembolso"], classification: "EXCLUDE", reason: "REVERSAL", label: "Possível estorno ou devolução" },
  { terms: ["emprestimo", "credito pessoal", "antecipacao", "financiamento"], classification: "EXCLUDE", reason: "LOAN", label: "Possível crédito contratado" },
  { terms: ["pix recebido", "credito recebido"], classification: "REVIEW", reason: "UNIDENTIFIED_PIX", label: "Crédito sem origem confirmada" }
];

export function reasonOptions(classification: TransactionClassification): Array<{ value: string; label: string }> {
  const source = classification === "INCLUDE" ? INCOME_ANALYSIS_RULES.inclusionReasons : classification === "EXCLUDE" ? INCOME_ANALYSIS_RULES.exclusionReasons : INCOME_ANALYSIS_RULES.reviewReasons;
  return Object.entries(source).map(([value, label]) => ({ value, label }));
}
