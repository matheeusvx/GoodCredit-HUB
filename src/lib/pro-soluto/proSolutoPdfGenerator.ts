import jsPDF from "jspdf";
import { ProSolutoCalculationResult, ProSolutoForm } from "../../types/proSoluto";
import { formatCurrencyBRL } from "../fgts/currency";
import { buildProSolutoExplanation } from "./proSolutoExplanation";

function formatPercent(value: number | null): string {
  if (value === null) return "Não informado";
  return value.toLocaleString("pt-BR", { style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function getLogoDataUrl(): Promise<string | null> {
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

export async function generateProSolutoPdf(
  form: ProSolutoForm,
  result: ProSolutoCalculationResult
): Promise<void> {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  let y = 16;

  const ensureSpace = (height: number) => {
    if (y + height <= pageHeight - 18) return;
    pdf.addPage();
    y = 18;
  };

  const writeSectionTitle = (title: string) => {
    ensureSpace(12);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.setTextColor(15, 23, 42);
    pdf.text(title, margin, y);
    y += 7;
  };

  const writeRows = (rows: Array<[string, string]>) => {
    rows.forEach(([label, value]) => {
      ensureSpace(8);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.setTextColor(71, 85, 105);
      pdf.text(`${label}:`, margin, y);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(15, 23, 42);
      pdf.text(value, margin + 62, y);
      y += 6;
    });
    y += 3;
  };

  const logo = await getLogoDataUrl();
  if (logo) pdf.addImage(logo, "PNG", margin, y, 38, 24);
  else {
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(22, 163, 74);
    pdf.setFontSize(18);
    pdf.text("GoodCredit Hub", margin, y + 12);
  }
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.setTextColor(15, 23, 42);
  pdf.text("Cálculo de Pró-Soluto", margin, y + 34);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(71, 85, 105);
  pdf.text(`Cliente/processo: ${form.clientName || "Não informado"}`, margin, y + 41);
  pdf.text(`Data de geração: ${new Date().toLocaleDateString("pt-BR")}`, margin, y + 47);
  y += 58;

  writeSectionTitle("Dados da operação");
  writeRows([
    ["Valor de compra", formatCurrencyBRL(form.purchasePrice)],
    ["Avaliação de engenharia", form.appraisalValue ? formatCurrencyBRL(form.appraisalValue) : "Não informada"],
    ["Percentual financiável", formatPercent(form.financeablePercent)],
    ["Base financiável", formatCurrencyBRL(result.financingBase)],
    ["Limite financiável", result.financingLimit === null ? "Não calculado" : formatCurrencyBRL(result.financingLimit)],
    ["Financiamento aprovado", form.approvedFinancing ? formatCurrencyBRL(form.approvedFinancing) : "Não informado"],
    ["Financiamento considerado", `${formatCurrencyBRL(result.financingConsidered)}${result.financingIsEstimated ? " (estimado)" : ""}`]
  ]);

  writeSectionTitle("Composição dos recursos");
  writeRows([
    ["FGTS", formatCurrencyBRL(form.fgtsAmount)],
    ["Subsídio", formatCurrencyBRL(form.subsidyAmount)],
    ["Entrada já paga", formatCurrencyBRL(form.paidEntryAmount)],
    ["Outros recursos", formatCurrencyBRL(form.otherOwnResources)],
    ["Recursos complementares", formatCurrencyBRL(result.complementaryResources)],
    ["Total coberto", formatCurrencyBRL(result.totalCovered)]
  ]);

  ensureSpace(34);
  pdf.setFillColor(result.proSoluto > 0 ? 255 : 240, result.proSoluto > 0 ? 251 : 253, result.proSoluto > 0 ? 235 : 244);
  pdf.setDrawColor(result.proSoluto > 0 ? 253 : 187, result.proSoluto > 0 ? 230 : 247, result.proSoluto > 0 ? 138 : 208);
  pdf.roundedRect(margin, y, contentWidth, 27, 2, 2, "FD");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(71, 85, 105);
  pdf.text("Pró-soluto estimado", margin + 6, y + 8);
  pdf.setFontSize(17);
  pdf.setTextColor(result.proSoluto > 0 ? 180 : 21, result.proSoluto > 0 ? 83 : 128, result.proSoluto > 0 ? 9 : 61);
  pdf.text(formatCurrencyBRL(result.proSoluto), margin + 6, y + 19);
  pdf.setFontSize(9);
  pdf.setTextColor(71, 85, 105);
  pdf.text(`Percentual descoberto: ${formatPercent(result.uncoveredPercent)}`, margin + 92, y + 10);
  pdf.text(`Recursos excedentes: ${formatCurrencyBRL(result.surplusResources)}`, margin + 92, y + 18);
  y += 36;

  writeSectionTitle("Explicação do cálculo");
  buildProSolutoExplanation(form, result).forEach((step) => {
    const lines = pdf.splitTextToSize(`${step.number}. ${step.title}: ${step.substitution} = ${step.result}`, contentWidth);
    ensureSpace(lines.length * 5 + 4);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    pdf.setTextColor(51, 65, 85);
    pdf.text(lines, margin, y);
    y += lines.length * 5 + 3;
  });

  if (result.warnings.length) {
    writeSectionTitle("Alertas");
    result.warnings.forEach((warning) => {
      const lines = pdf.splitTextToSize(`• ${warning.message}`, contentWidth);
      ensureSpace(lines.length * 5 + 2);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8.5);
      pdf.setTextColor(92, 61, 16);
      pdf.text(lines, margin, y);
      y += lines.length * 5 + 2;
    });
  }

  ensureSpace(22);
  y += 4;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.setTextColor(71, 85, 105);
  const notice = "Este cálculo possui caráter orientativo e está sujeito à validação do financiamento, da avaliação de engenharia e da composição final da operação.";
  pdf.text(pdf.splitTextToSize(notice, contentWidth), margin, y);

  const pages = pdf.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    pdf.setPage(page);
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    pdf.text("GoodCredit Hub • Relatório gerado localmente", margin, pageHeight - 8);
    pdf.text(`${page}/${pages}`, pageWidth - margin - 8, pageHeight - 8);
  }

  const safeName = (form.clientName || "operacao").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  pdf.save(`goodcredit-pro-soluto-${safeName}.pdf`);
}

