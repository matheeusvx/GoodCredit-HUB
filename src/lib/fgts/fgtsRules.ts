import { FgtsDocumentItem, FgtsUsageMode } from "../../types/fgts";

export const FGTS_RULES = {
  standardEmployeeRate: 0.08,
  apprenticeRate: 0.02,
  standardIncomeMultiplier: 12.5,
  minimumAmortizationIntervalMonths: 24,
  maximumInstallmentCoveragePercent: 0.8,
  minimumEmploymentYears: 3,
  lastReviewedAt: "2026-07-10"
} as const;

export const FGTS_USAGE_LABELS: Record<FgtsUsageMode, string> = {
  ACQUISITION: "Aquisição",
  AMORTIZATION: "Amortização",
  SETTLEMENT: "Liquidação",
  INSTALLMENTS: "Pagamento de Parte das Prestações"
};

export const FGTS_DOCUMENTS: FgtsDocumentItem[] = [
  { id: "statement", label: "Extrato atualizado do FGTS", required: true },
  { id: "pis", label: "Número do PIS/PASEP/NIS", required: true },
  { id: "ctps", label: "CTPS Digital, quando aplicável" },
  { id: "identity", label: "Documento de identificação" },
  { id: "civil-status", label: "Certidão de estado civil" },
  { id: "residence", label: "Comprovante de residência" },
  { id: "work-location", label: "Comprovação do local de trabalho, quando necessária" },
  { id: "income-tax", label: "Declaração de Imposto de Renda e recibo, quando aplicável" },
  { id: "authorization", label: "Autorização para consulta ou movimentação das contas vinculadas" },
  { id: "bank-forms", label: "Formulários exigidos pelo agente financeiro" },
  { id: "financing", label: "Documentos do financiamento ou contrato" },
  { id: "previous-use", label: "Informações sobre utilização anterior do FGTS" }
];

export const FGTS_INSTITUTIONAL_NOTICE =
  "A utilização do FGTS está sujeita às regras vigentes, ao enquadramento do trabalhador, do imóvel e do financiamento, à documentação apresentada e à análise do agente financeiro.";
