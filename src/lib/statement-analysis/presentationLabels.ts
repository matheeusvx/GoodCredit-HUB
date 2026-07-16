import type {
  AutomatedIncomeResult,
  ExtractionMethod,
  NormalizedTransactionClassification,
  ReconciliationStatus,
  StatementFileFormat,
  StatementFileStatus,
  SupportedBank,
} from "../../types/statementAnalysis";

export const RECONCILIATION_STATUS_LABELS: Record<ReconciliationStatus, string> = {
  RECONCILED: "Conciliado",
  SMALL_DIFFERENCE: "Pequena divergência",
  DIVERGENCE: "Divergência encontrada",
  NO_SUMMARY: "Sem resumo para conferência",
};

export const TRANSACTION_CLASSIFICATION_LABELS: Record<NormalizedTransactionClassification, string> = {
  INCLUDED_INCOME: "Considerada como renda",
  EXCLUDED_SAME_OWNER: "Desconsiderada — mesma titularidade",
  EXCLUDED_RELATED_PERSON: "Desconsiderada — pessoa relacionada",
  EXCLUDED_INTERNAL_TRANSFER: "Desconsiderada — transferência entre contas analisadas",
  EXCLUDED_INVESTMENT_REDEMPTION: "Desconsiderada — resgate ou movimentação de aplicação",
  EXCLUDED_REFUND: "Desconsiderada — reembolso",
  EXCLUDED_REVERSAL: "Desconsiderada — estorno ou devolução",
  EXCLUDED_LOAN: "Desconsiderada — empréstimo ou crédito contratado",
  EXCLUDED_FINANCIAL_YIELD: "Desconsiderada — rendimento financeiro",
  EXCLUDED_DUPLICATE: "Desconsiderada — movimentação duplicada",
  EXCLUDED_ASSET_SALE: "Desconsiderada — venda pontual de bem",
  EXCLUDED_TRANSITORY_MOVEMENT: "Desconsiderada — movimentação transitória",
  EXCLUDED_OTHER: "Desconsiderada — outro motivo",
  PENDING_REVIEW: "Pendente de revisão",
};

export const CONFIDENCE_LABELS = { HIGH: "Alta", MEDIUM: "Média", LOW: "Baixa" } as const;
export const MONTH_STATUS_LABELS = { COMPLETE: "Completo", INCOMPLETE: "Incompleto", UNKNOWN: "Período não identificado" } as const;
export const STABILITY_LABELS = {
  HIGH: "Alta estabilidade",
  HIGH_STABILITY: "Alta estabilidade",
  MODERATE: "Estabilidade moderada",
  MODERATE_STABILITY: "Estabilidade moderada",
  ELEVATED: "Alta oscilação",
  HIGH_VARIATION: "Alta oscilação",
  INSUFFICIENT: "Dados insuficientes",
  INSUFFICIENT_DATA: "Dados insuficientes",
} as const;

export const PROCESSING_STATUS_LABELS: Record<StatementFileStatus | "CANCELLED", string> = {
  READY: "Pronto", READING: "Lendo arquivo", PROCESSING: "Processando", COMPLETED: "Concluído",
  DIVERGENT: "Com divergência", REVIEW_REQUIRED: "Necessita revisão", PASSWORD_REQUIRED: "Senha necessária",
  UNRECOGNIZED: "Formato não reconhecido", ERROR: "Erro", CANCELLED: "Cancelado",
};

export const EXTRACTION_METHOD_LABELS: Record<ExtractionMethod, string> = {
  PDF_TEXT: "Texto extraído do PDF", PDF_OCR: "Leitura por OCR", CSV: "Arquivo CSV", XLSX: "Planilha Excel",
};

const FILE_FORMAT_LABELS: Record<StatementFileFormat, string> = { PDF: "Documento PDF", CSV: "Arquivo CSV", XLSX: "Planilha Excel", XLS: "Planilha Excel" };
const BANK_LABELS: Record<SupportedBank | "AUTO", string> = {
  AUTO: "Banco identificado automaticamente", CAIXA: "Caixa", INTER: "Banco Inter", BRADESCO: "Bradesco",
  ITAU: "Itaú", SANTANDER: "Santander", NUBANK: "Nubank", MERCADO_PAGO: "Mercado Pago", OTHER: "Outro banco",
};
const PARSER_LABELS: Record<string, string> = {
  nubank: "Nubank", bradesco: "Bradesco", caixa: "Caixa", inter: "Banco Inter", itau: "Itaú",
  santander: "Santander", "mercado-pago": "Mercado Pago", generic: "Formato bancário genérico",
  "spreadsheet-auto": "Mapeamento automático de planilha", mixed: "Leitura combinada",
};

export const getReconciliationStatusLabel = (status: ReconciliationStatus) => RECONCILIATION_STATUS_LABELS[status];
export const getClassificationLabel = (classification: NormalizedTransactionClassification) => TRANSACTION_CLASSIFICATION_LABELS[classification];
export function getConfidenceLabel(confidence: keyof typeof CONFIDENCE_LABELS | number): string {
  if (typeof confidence === "number") return confidence >= 0.8 ? CONFIDENCE_LABELS.HIGH : confidence >= 0.6 ? CONFIDENCE_LABELS.MEDIUM : CONFIDENCE_LABELS.LOW;
  return CONFIDENCE_LABELS[confidence];
}
export const getMonthStatusLabel = (status: keyof typeof MONTH_STATUS_LABELS) => MONTH_STATUS_LABELS[status];
export const getStabilityLabel = (status: AutomatedIncomeResult["stability"] | keyof typeof STABILITY_LABELS) => STABILITY_LABELS[status];
export const getProcessingStatusLabel = (status: StatementFileStatus | "CANCELLED") => PROCESSING_STATUS_LABELS[status];
export const getExtractionMethodLabel = (method: ExtractionMethod | null) => method ? EXTRACTION_METHOD_LABELS[method] : "Não processado";
export const getFileFormatLabel = (format: StatementFileFormat) => FILE_FORMAT_LABELS[format];
export const getBankLabel = (bank: SupportedBank | "AUTO") => BANK_LABELS[bank];
export const getParserLabel = (parserId: string) => PARSER_LABELS[parserId] || "Formato identificado automaticamente";

export function buildClassificationExplanation(classification: NormalizedTransactionClassification, count: number): string {
  const singular = count === 1;
  switch (classification) {
    case "INCLUDED_INCOME": return singular ? "1 entrada foi considerada como renda confirmada." : `${count} entradas foram consideradas como renda confirmada.`;
    case "PENDING_REVIEW": return singular ? "1 movimentação precisa de revisão." : `${count} movimentações precisam de revisão.`;
    case "EXCLUDED_SAME_OWNER": return singular ? "1 movimentação foi desconsiderada por ser de mesma titularidade." : `${count} movimentações foram desconsideradas por serem de mesma titularidade.`;
    case "EXCLUDED_RELATED_PERSON": return singular ? "1 movimentação foi desconsiderada por ser de uma pessoa relacionada." : `${count} movimentações foram desconsideradas por serem de pessoas relacionadas.`;
    case "EXCLUDED_INTERNAL_TRANSFER": return singular ? "1 movimentação foi desconsiderada por ser uma transferência entre contas analisadas." : `${count} movimentações foram desconsideradas por serem transferências entre contas analisadas.`;
    case "EXCLUDED_INVESTMENT_REDEMPTION": return singular ? "1 movimentação foi desconsiderada por ser resgate ou movimentação de aplicação." : `${count} movimentações foram desconsideradas por serem resgates ou movimentações de aplicação.`;
    case "EXCLUDED_REFUND": return singular ? "1 movimentação foi desconsiderada por ser um reembolso." : `${count} movimentações foram desconsideradas por serem reembolsos.`;
    case "EXCLUDED_REVERSAL": return singular ? "1 movimentação foi desconsiderada por ser estorno ou devolução." : `${count} movimentações foram desconsideradas por serem estornos ou devoluções.`;
    case "EXCLUDED_LOAN": return singular ? "1 movimentação foi desconsiderada por ser empréstimo ou crédito contratado." : `${count} movimentações foram desconsideradas por serem empréstimos ou créditos contratados.`;
    case "EXCLUDED_FINANCIAL_YIELD": return singular ? "1 movimentação foi desconsiderada por ser rendimento financeiro." : `${count} movimentações foram desconsideradas por serem rendimentos financeiros.`;
    case "EXCLUDED_DUPLICATE": return singular ? "1 movimentação foi desconsiderada por possível duplicidade." : `${count} movimentações foram desconsideradas por possível duplicidade.`;
    case "EXCLUDED_ASSET_SALE": return singular ? "1 movimentação foi desconsiderada por ser uma venda pontual de bem." : `${count} movimentações foram desconsideradas por serem vendas pontuais de bens.`;
    case "EXCLUDED_TRANSITORY_MOVEMENT": return singular ? "1 movimentação foi desconsiderada por ser transitória." : `${count} movimentações foram desconsideradas por serem transitórias.`;
    case "EXCLUDED_OTHER": return singular ? "1 movimentação foi desconsiderada por outro motivo." : `${count} movimentações foram desconsideradas por outros motivos.`;
  }
}
