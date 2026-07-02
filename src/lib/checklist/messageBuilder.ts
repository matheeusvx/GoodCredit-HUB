import { GeneratedChecklist } from "../../types/checklist";

export function buildChecklistWhatsAppMessage(checklist: GeneratedChecklist): string {
  const name = checklist.formData.nome.trim();
  const greeting = name ? `Olá, ${name}! Tudo bem?` : "Olá! Tudo bem?";
  const categories = checklist.categories
    .map((category) => {
      const docs = category.items.length > 0 ? category.items.map((item) => `- ${item.label}`).join("\n") : "- Sem documentos adicionais.";
      const alerts = category.alerts?.length ? `\nAlertas:\n${category.alerts.map((alert) => `- ${alert.label}`).join("\n")}` : "";
      return `${category.title}\n${docs}${alerts}`;
    })
    .join("\n\n");
  const alerts = checklist.importantAlerts.length
    ? checklist.importantAlerts.map((alert) => `- ${alert.label}`).join("\n")
    : "- Sem observacoes adicionais.";

  return [
    greeting,
    "",
    "Segue abaixo o checklist documental necessário para seguirmos com a conferência do seu processo.",
    "",
    "Pedimos que todos os documentos sejam enviados em formato PDF.",
    "",
    categories,
    "",
    "Observações importantes:",
    alerts,
    "",
    "Qualquer dúvida, estamos à disposição.",
    "",
    "Att,",
    "GoodCredit"
  ].join("\n");
}
