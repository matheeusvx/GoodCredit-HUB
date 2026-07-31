import { REGISTRATION_FINANCIAL_MODE_LABELS, REGISTRATION_FINANCIAL_STATUS_LABELS } from "./constants";
import { formatCentsBRL } from "./money";
import type { RegistrationFinancialCaseWithMetrics } from "../../../types/registrationFinancial";

function quote(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

export function buildRegistrationFinancialCsv(records: RegistrationFinancialCaseWithMetrics[]): string {
  const header = ["Cliente", "Processo", "Cartório", "Cidade", "Modalidade", "Status", "Assessoria pendente", "Saldo disponível", "Complemento", "Atualizado em"];
  const rows = records.map(({ financialCase, metrics }) => [
    financialCase.clientName, financialCase.processReference, financialCase.registryOffice, financialCase.city,
    REGISTRATION_FINANCIAL_MODE_LABELS[financialCase.operationMode], REGISTRATION_FINANCIAL_STATUS_LABELS[metrics.status],
    formatCentsBRL(metrics.advisoryPendingCents), formatCentsBRL(metrics.availableBalanceCents), formatCentsBRL(metrics.complementRequiredCents),
    new Date(financialCase.updatedAt).toLocaleString("pt-BR")
  ]);
  return `\uFEFF${[header, ...rows].map((row) => row.map(quote).join(";")).join("\r\n")}`;
}

export function downloadRegistrationFinancialCsv(records: RegistrationFinancialCaseWithMetrics[]): void {
  const blob = new Blob([buildRegistrationFinancialCsv(records)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `balancetes-cartoriais-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}
