import jsPDF from "jspdf";
import { FgtsEligibilityResult, FgtsIncomeForm, FgtsIncomeResult, FgtsProjectionResult } from "../../types/fgts";
import { formatCurrencyBR } from "../financial";
import { FGTS_DOCUMENTS, FGTS_INSTITUTIONAL_NOTICE, FGTS_USAGE_LABELS } from "./fgtsRules";

async function loadLogo(): Promise<string | null> {
  try {
    const response = await fetch("/logo-goodcredit-hub.png");
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function generateFgtsPdf(data: { clientName: string; usageMode: keyof typeof FGTS_USAGE_LABELS | ""; eligibility: FgtsEligibilityResult; incomeForm: FgtsIncomeForm; incomeResult: FgtsIncomeResult; projection: FgtsProjectionResult; checkedDocuments: Record<string, boolean> }) {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 15;
  let y = 16;
  const logo = await loadLogo();
  if (logo) pdf.addImage(logo, "PNG", margin, y, 32, 24);
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(18); pdf.setTextColor(15, 23, 42); pdf.text("Análise de Uso de FGTS", margin, y + 30);
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor(71, 85, 105);
  pdf.text(`Cliente/processo: ${data.clientName || "Não informado"}`, margin, y + 38);
  pdf.text(`Data de geração: ${new Date().toLocaleDateString("pt-BR")}`, margin, y + 44); y += 54;
  const facts = [
    `Triagem: ${data.eligibility.label}`,
    `Modalidade: ${data.usageMode ? FGTS_USAGE_LABELS[data.usageMode] : "Não informada"}`,
    `Renda do holerite: ${formatCurrencyBR(data.incomeForm.payslipGross)}`,
    `Renda estimada pelo FGTS: ${formatCurrencyBR(data.incomeResult.estimatedIncome)}`,
    `Renda considerada: ${formatCurrencyBR(data.incomeResult.consideredIncome)}`,
    `Critério: ${data.incomeResult.criterionLabel}`,
    `Próxima utilização indicativa: ${data.projection.nextEligibleDate ? new Date(`${data.projection.nextEligibleDate}T12:00:00`).toLocaleDateString("pt-BR") : "Não informada"}`,
    `Total projetado: ${formatCurrencyBR(data.projection.totalProjected)}`
  ];
  pdf.setFontSize(10); pdf.setTextColor(15, 23, 42);
  facts.forEach((fact) => { pdf.text(fact, margin, y); y += 6; }); y += 3;
  pdf.setFont("helvetica", "bold"); pdf.text("Cronograma de amortizações", margin, y); y += 6; pdf.setFont("helvetica", "normal");
  data.projection.events.filter((event) => event.active).slice(0, 12).forEach((event) => { pdf.text(`Evento ${event.eventNumber} | mês ${event.month} | ${formatCurrencyBR(event.amount)} | ${event.estimatedDate ? new Date(`${event.estimatedDate}T12:00:00`).toLocaleDateString("pt-BR") : "data não informada"}`, margin, y); y += 5; });
  y += 3; pdf.setFont("helvetica", "bold"); pdf.text("Checklist documental", margin, y); y += 6; pdf.setFont("helvetica", "normal");
  FGTS_DOCUMENTS.forEach((item) => { if (y > 272) { pdf.addPage(); y = 16; } pdf.text(`${data.checkedDocuments[item.id] ? "[x]" : "[ ]"} ${item.label}`, margin, y); y += 5; });
  if (y > 250) { pdf.addPage(); y = 16; } y += 4; pdf.setFontSize(8); pdf.setTextColor(71, 85, 105); pdf.text(pdf.splitTextToSize(FGTS_INSTITUTIONAL_NOTICE, 180), margin, y);
  pdf.text("GoodCredit Hub — relatório orientativo gerado localmente.", margin, 290);
  pdf.save(`goodcredit-fgts-${data.clientName || "analise"}.pdf`);
}
