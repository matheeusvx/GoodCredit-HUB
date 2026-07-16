import jsPDF from "jspdf";
import type { AutomatedIncomeResult } from "../../types/statementAnalysis";
import { formatCompetence, formatCurrencyBR } from "../income-analysis/formatters";
import { getBankLabel, getConfidenceLabel, getReconciliationStatusLabel, getStabilityLabel } from "./presentationLabels";

async function logo() {
  try {
    const response = await fetch("/logo-goodcredit-hub.png");
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function generateStatementAnalysisPdf(result: AutomatedIncomeResult) {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 14;
  let y = 14;
  const brand = await logo();
  if (brand) pdf.addImage(brand, "PNG", margin, y, 28, 22);
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(17); pdf.setTextColor(15, 23, 42); pdf.text("Relatório de Apuração de Renda", margin, y + 28);
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor(71, 85, 105); pdf.text(`Cliente/processo: ${result.clientName || "Não informado"}`, margin, y + 36); pdf.text(`Gerado em ${new Date(result.generatedAt).toLocaleDateString("pt-BR")}`, margin, y + 42); y += 53;
  const facts = [
    ["Bancos", [...new Set(result.files.map((file) => getBankLabel(file.bank)))].join(", ")],
    ["Meses completos", String(result.completeMonths)],
    ["Renda confirmada", formatCurrencyBR(result.confirmedMonthlyIncome)],
    ["Renda potencial", formatCurrencyBR(result.potentialMonthlyIncome)],
    ["Mediana", formatCurrencyBR(result.medianIncome)],
    ["Estabilidade", getStabilityLabel(result.stability)],
    ["Concentração maior pagador", `${(result.topPayerShare * 100).toFixed(1)}%`],
    ["Conciliação", getReconciliationStatusLabel(result.reconciliationStatus)],
    ["Confiança da extração", `${getConfidenceLabel(result.extractionConfidence)} (${Math.round(result.extractionConfidence * 100)}%)`],
    ["Confiança da classificação", `${getConfidenceLabel(result.classificationConfidence)} (${Math.round(result.classificationConfidence * 100)}%)`],
  ];
  facts.forEach(([label, value]) => { pdf.setFont("helvetica", "bold"); pdf.text(`${label}:`, margin, y); pdf.setFont("helvetica", "normal"); pdf.text(String(value), margin + 52, y); y += 6; }); y += 4;
  pdf.setFont("helvetica", "bold"); pdf.text("Resultado por mês", margin, y); y += 6; pdf.setFont("helvetica", "normal");
  result.months.forEach((month) => { if (y > 274) { pdf.addPage(); y = 15; } pdf.text(`${formatCompetence(month.competence)} | confirmada ${formatCurrencyBR(month.confirmedIncome)} | potencial ${formatCurrencyBR(month.potentialIncome)} | pendente ${formatCurrencyBR(month.pendingAmount)}`, margin, y); y += 5; });
  y += 5; if (y > 250) { pdf.addPage(); y = 15; } pdf.setFont("helvetica", "bold"); pdf.text("Metodologia e pendências", margin, y); y += 6; pdf.setFont("helvetica", "normal");
  result.explanation.forEach((line) => { const rows = pdf.splitTextToSize(`• ${line}`, 180); pdf.text(rows, margin, y); y += rows.length * 4 + 1; });
  if (y > 260) { pdf.addPage(); y = 15; } y += 5; pdf.setFontSize(8); pdf.setTextColor(71, 85, 105); pdf.text(pdf.splitTextToSize("Indicador interno de apoio à análise. Não representa critério oficial de aprovação bancária. A validação final depende da documentação, coerência das movimentações e regras vigentes da instituição financeira.", 180), margin, y); pdf.text("GoodCredit Hub · processamento local · dados sensíveis mascarados", margin, 290); pdf.save(`goodcredit-relatorio-renda-${result.clientName || "analise"}.pdf`);
}
