import {
  ComplianceChecklistFilter,
  ComplianceChecklistItemDefinition,
  ComplianceChecklistStatus
} from "../types/complianceChecklist";

export const COMPLIANCE_CHECKLIST_ITEMS: ComplianceChecklistItemDefinition[] = [
  { id: "fgts-three-years-letter", order: 1, label: "Verificar Carta FGTS — 3 anos", icon: "FileClock" },
  { id: "update-pf3", order: 2, label: "Atualizar PF3", icon: "RefreshCw" },
  { id: "registration-analysis", order: 3, label: "Análise de Matrícula", icon: "FileSearch" },
  { id: "confirm-iq", order: 4, label: "Confirmar IQ", icon: "Landmark" },
  { id: "updated-registration", order: 5, label: "Matrícula Atualizada", icon: "FileCheck2" },
  { id: "correct-ir-damp", order: 6, label: "IR Correto na DAMP", icon: "ReceiptText" },
  {
    id: "registration-address-report",
    order: 7,
    label: "Matrícula e Endereço Corretos no Laudo",
    icon: "MapPinned"
  },
  {
    id: "residence-registration-form",
    order: 8,
    label: "Comprovante de Residência × Ficha de Cadastro",
    icon: "ContactRound"
  },
  {
    id: "income-registration-form",
    order: 9,
    label: "Comprovação de Renda × Ficha de Cadastro",
    icon: "WalletCards"
  },
  { id: "civil-status-siopi", order: 10, label: "Estado Civil × SIOPI", icon: "HeartHandshake" },
  { id: "siopi", order: 11, label: "SIOPI", icon: "MonitorCheck" },
  { id: "forms", order: 12, label: "Formulários", icon: "ClipboardList" },
  { id: "research", order: 13, label: "Pesquisas", icon: "SearchCheck" },
  { id: "discontinued-income", order: 14, label: "Renda Descontinuada", icon: "TrendingDown" },
  { id: "fgts-authorization-screen", order: 15, label: "Tela de Autorização do FGTS", icon: "MonitorCog" }
];

export const COMPLIANCE_STATUS_LABELS: Record<ComplianceChecklistStatus, string> = {
  PENDING: "Pendente",
  COMPLIANT: "Conforme",
  HAS_ISSUE: "Com pendência",
  NOT_APPLICABLE: "Não se aplica"
};

export const COMPLIANCE_FILTER_LABELS: Record<ComplianceChecklistFilter, string> = {
  ALL: "Todos",
  ...COMPLIANCE_STATUS_LABELS
};
