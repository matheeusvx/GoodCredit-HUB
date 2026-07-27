import type {
  ComplianceChecklistOverallStatus,
  ComplianceChecklistSaveStatus
} from "../../types/complianceChecklist";

export const COMPLIANCE_LIST_STATUS_LABELS: Record<
  ComplianceChecklistOverallStatus,
  string
> = {
  IN_PROGRESS: "Em andamento",
  HAS_ISSUES: "Com pendências",
  COMPLETED: "Concluído"
};

export const COMPLIANCE_SAVE_STATUS_LABELS: Record<
  ComplianceChecklistSaveStatus,
  string
> = {
  IDLE: "Sem alterações",
  PENDING: "Alterações pendentes",
  SAVING: "Salvando...",
  SAVED: "Salvo",
  ERROR: "Erro ao salvar",
  CONFLICT: "Atualização concorrente"
};

export function formatComplianceDate(value: string): string {
  if (!value) return "Não informada";
  const date = new Date(value.includes("T") ? value : `${value}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("pt-BR");
}

export function formatComplianceDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short"
      });
}
