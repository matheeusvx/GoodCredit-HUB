import jsPDF from "jspdf";
import { ProSolutoCalculationResult, ProSolutoForm } from "../../types/proSoluto";
import { formatCurrencyBRL } from "../fgts/currency";
import { buildProSolutoExplanation } from "./proSolutoExplanation";

interface ProSolutoPdfSection {
  title: string;
  rows: Array<[string, string]>;
}

export interface ProSolutoPdfModel {
  title: string;
  clientName: string;
  sections: ProSolutoPdfSection[];
  proSoluto: string;
  uncoveredPercent: string;
  surplusResources: string;
  explanation: string[];
  alerts: string[];
}

function formatPercent(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function buildProSolutoPdfModel(
  form: ProSolutoForm,
  result: ProSolutoCalculationResult
): ProSolutoPdfModel {
  return {
    title: "Cálculo de Pró-Soluto",
    clientName: form.clientName.trim() || "Não informado",
    sections: [
      {
        title: "Valor da operação",
        rows: [
          ["Valor que o vendedor precisa receber — CCV", formatCurrencyBRL(form.sellerReceivableAmount)],
          ["Valor de avaliação do imóvel", formatCurrencyBRL(form.appraisalValue)]
        ]
      },
      {
        title: "Limite e financiamento",
        rows: [
          ["Percentual máximo financiável", formatPercent(result.validatedFinanceablePercent)],
          ["Limite pela avaliação", formatCurrencyBRL(result.appraisalFinancingLimit)],
          [
            "Crédito aprovado",
            form.creditNotApprovedYet
              ? "Ainda não aprovado"
              : formatCurrencyBRL(form.approvedCreditAmount || 0)
          ],
          [
            "Financiamento considerado",
            `${formatCurrencyBRL(result.financingConsidered)}${
              result.financingIsEstimated ? " (estimado)" : ""
            }`
          ]
        ]
      },
      {
        title: "Recursos disponíveis",
        rows: [
          ["FGTS utilizado", formatCurrencyBRL(form.fgtsAmount)],
          ["Entrada já paga", formatCurrencyBRL(form.paidEntryAmount)],
          ["Total de recursos disponíveis", formatCurrencyBRL(result.totalAvailableResources)]
        ]
      }
    ],
    proSoluto: formatCurrencyBRL(result.proSoluto),
    uncoveredPercent: formatPercent(result.uncoveredPercent),
    surplusResources: formatCurrencyBRL(result.surplusResources),
    explanation: buildProSolutoExplanation(form, result).map(
      (step) =>
        `${step.number}. ${step.title}. ${step.description} ${step.calculation} Resultado: ${step.result}`
    ),
    alerts: result.warnings.map((warning) => warning.message)
  };
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
  const model = buildProSolutoPdfModel(form, result);
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
      const labelLines = pdf.splitTextToSize(`${label}:`, 68);
      const valueLines = pdf.splitTextToSize(value, contentWidth - 72);
      const height = Math.max(labelLines.length, valueLines.length) * 4.5 + 2;
      ensureSpace(height);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8.5);
      pdf.setTextColor(71, 85, 105);
      pdf.text(labelLines, margin, y);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(15, 23, 42);
      pdf.text(valueLines, margin + 72, y);
      y += height;
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
  pdf.text(model.title, margin, y + 34);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(71, 85, 105);
  pdf.text(`Cliente/processo: ${model.clientName}`, margin, y + 41);
  pdf.text(`Data de geração: ${new Date().toLocaleDateString("pt-BR")}`, margin, y + 47);
  y += 58;

  model.sections.forEach((section) => {
    writeSectionTitle(section.title);
    writeRows(section.rows);
  });

  ensureSpace(34);
  pdf.setFillColor(result.proSoluto > 0 ? 255 : 240, result.proSoluto > 0 ? 251 : 253, result.proSoluto > 0 ? 235 : 244);
  pdf.setDrawColor(result.proSoluto > 0 ? 253 : 187, result.proSoluto > 0 ? 230 : 247, result.proSoluto > 0 ? 138 : 208);
  pdf.roundedRect(margin, y, contentWidth, 27, 2, 2, "FD");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(71, 85, 105);
  pdf.text("Pró-soluto apurado", margin + 6, y + 8);
  pdf.setFontSize(17);
  pdf.setTextColor(result.proSoluto > 0 ? 180 : 21, result.proSoluto > 0 ? 83 : 128, result.proSoluto > 0 ? 9 : 61);
  pdf.text(model.proSoluto, margin + 6, y + 19);
  pdf.setFontSize(8.5);
  pdf.setTextColor(71, 85, 105);
  pdf.text(`Percentual descoberto: ${model.uncoveredPercent}`, margin + 92, y + 10);
  pdf.text(`Recursos excedentes: ${model.surplusResources}`, margin + 92, y + 18);
  y += 36;

  writeSectionTitle("Como o cálculo foi feito");
  model.explanation.forEach((text) => {
    const lines = pdf.splitTextToSize(text, contentWidth);
    ensureSpace(lines.length * 4.5 + 3);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    pdf.setTextColor(51, 65, 85);
    pdf.text(lines, margin, y);
    y += lines.length * 4.5 + 3;
  });

  if (model.alerts.length) {
    writeSectionTitle("Alertas e observações");
    model.alerts.forEach((alert) => {
      const lines = pdf.splitTextToSize(`• ${alert}`, contentWidth);
      ensureSpace(lines.length * 4.5 + 2);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8.5);
      pdf.setTextColor(92, 61, 16);
      pdf.text(lines, margin, y);
      y += lines.length * 4.5 + 2;
    });
  }

  ensureSpace(24);
  y += 4;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.setTextColor(71, 85, 105);
  const notice =
    "Cálculo orientativo. Confirme o crédito, a avaliação, o percentual financiável e a composição final da operação antes da formalização.";
  pdf.text(pdf.splitTextToSize(notice, contentWidth), margin, y);

  const pages = pdf.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    pdf.setPage(page);
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    pdf.text("GoodCredit Hub • Relatório gerado localmente", margin, pageHeight - 8);
    pdf.text(`${page}/${pages}`, pageWidth - margin - 8, pageHeight - 8);
  }

  const safeName = (form.clientName || "operacao")
    .replace(/[^a-z0-9]+/gi, "-")
    .toLowerCase();
  pdf.save(`goodcredit-pro-soluto-${safeName}.pdf`);
}
