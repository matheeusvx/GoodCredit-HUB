import type { CrmAttendedClient } from "../../types/crmDashboard.js";

export function attendedClientSituation(
  client: CrmAttendedClient,
  currentBlessUserId: string,
): string {
  if (
    client.currentBlessUserId === currentBlessUserId
    && ["STARTED", "PENDING", "IN_PROGRESS"].includes(client.currentStatus)
  ) return "Em sua carteira";
  if (client.currentStatus === "COMPLETED") return "Concluído";
  if (client.currentBlessUserId !== currentBlessUserId && client.transferredInPeriod) {
    return "Transferido";
  }
  if (client.currentAssignmentScope === "UNASSIGNED") return "Sem responsável";
  if (client.currentAssignmentScope === "UNKNOWN") return "Sem classificação atual";
  return "Fora da sua carteira";
}
