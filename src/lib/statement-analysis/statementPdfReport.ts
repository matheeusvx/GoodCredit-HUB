import jsPDF from "jspdf";
import type { AutomatedIncomeResult } from "../../types/statementAnalysis";
import { formatCompetence, formatCurrencyBR } from "../income-analysis/formatters";
import { maskCpf, maskHolderName } from "../income-analysis/platforms/platformUtils";
import { getClassificationLabel, getConfidenceLabel, getReconciliationStatusLabel, getStabilityLabel } from "./presentationLabels";
import { fileInstitutionLabel, fileReadingLabel } from "./institutionSelection";
import { getInstitution } from "./institutionCatalog";

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

export async function generateStatementAnalysisPdf(result: AutomatedIncomeResult, save = true) {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 14;
  let y = 14;
  const brand = await logo();
  if (brand) pdf.addImage(brand, "PNG", margin, y, 28, 22);
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(17); pdf.setTextColor(15, 23, 42); pdf.text("Relatório de Análise de Perfil — Renda", margin, y + 28);
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor(71, 85, 105); pdf.text(`Cliente/processo: ${result.clientName || "Não informado"}`, margin, y + 36); pdf.text(`Gerado em ${new Date(result.generatedAt).toLocaleDateString("pt-BR")}`, margin, y + 42); y += 53;
  const readingNotes = () => {
    result.files.forEach((file, index) => {
      const notes = [
        `Arquivo ${index + 1}: ${fileInstitutionLabel(file)} | ${file.institutionSelectionMethod === "MANUAL" ? `seleção manual: ${getInstitution(file.selectedInstitution)?.label || "Outra instituição"}` : "detecção automática"} | ${fileReadingLabel(file)} | leitor utilizado: ${file.parserId || "não executado"}`,
        ...new Set([...(file.incompatibilityWarnings || []), ...(file.warnings || [])]),
      ];
      notes.forEach((note) => {
        const rows: string[] = pdf.splitTextToSize(note, 180);
        rows.forEach((row) => { if (y > 274) { pdf.addPage(); y = 15; } pdf.text(row, margin, y); y += 4.5; });
        y += 1;
      });
    });
    y += 4;
  };
  if (result.analysisType === "PLATFORM_INCOME" && result.platformIncomeResult) {
    const platform = result.platformIncomeResult;
    const platformStatus = {
      COMPLETE: "Análise concluída",
      INSUFFICIENT_DOCUMENTS: "Comprovantes insuficientes",
      HOLDER_MISMATCH: "Titulares divergentes",
      DUPLICATE_COMPETENCE: "Competência divergente",
      VALUE_DIVERGENCE: "Valores divergentes",
      REVIEW_REQUIRED: "Revisão necessária",
    }[platform.status];
    const usesAverage = platform.calculationMethod === "FOUR_MONTH_AVERAGE";
    const firstCompetence = result.months[0]?.competence;
    const lastCompetence = result.months.at(-1)?.competence;
    const competenceFact = usesAverage
      ? [
        "Período considerado",
        firstCompetence && lastCompetence
          ? `${formatCompetence(firstCompetence)} a ${formatCompetence(lastCompetence)}`
          : "Não definido",
      ]
      : [
        "Competência determinante",
        platform.determiningCompetence
          ? formatCompetence(platform.determiningCompetence)
          : "Não definida",
      ];
    const facts = [
      ["Plataforma", platform.platform],
      ["Titular", maskHolderName(platform.holderName)],
      ["CPF", maskCpf(platform.holderCpf)],
      ["Comprovantes selecionados", `${platform.selectedDocuments.length} de 4`],
      ["Renda considerada", formatCurrencyBR(result.confirmedMonthlyIncome)],
      competenceFact,
      ["Método", usesAverage ? "Média de 4 meses" : "Menor renda bruta"],
      ["Situação", platformStatus],
    ];
    facts.forEach(([label, value]) => {
      pdf.setFont("helvetica", "bold");
      pdf.text(`${label}:`, margin, y);
      pdf.setFont("helvetica", "normal");
      pdf.text(String(value), margin + 52, y);
      y += 6;
    });
    y += 4;
    readingNotes();
    if (y > 254) { pdf.addPage(); y = 15; }
    pdf.setFont("helvetica", "bold");
    pdf.text("Comprovantes mensais analisados", margin, y);
    y += 6;
    pdf.setFont("helvetica", "normal");
    platform.selectedDocuments.forEach((document) => {
      if (y > 274) { pdf.addPage(); y = 15; }
      const marker = !usesAverage && document.competence === platform.determiningCompetence
        ? " - menor renda bruta"
        : "";
      pdf.text(
        `${document.competence ? formatCompetence(document.competence) : "Competência não identificada"} | ${formatCurrencyBR(document.grossIncome || 0)}${marker}`,
        margin,
        y
      );
      y += 5;
    });
    y += 5;
    pdf.setFont("helvetica", "bold");
    pdf.text("Metodologia e documentos desconsiderados", margin, y);
    y += 6;
    pdf.setFont("helvetica", "normal");
    const notes = [
      platform.method,
      ...platform.ignoredDocuments.map((document) => {
        const reference = document.documentPeriod === "ANNUAL"
          ? `Resumo anual da ${document.platform}${document.periodStart ? ` — ${document.periodStart.slice(0, 4)}` : ""}`
          : `${document.platform} · ${document.competence ? formatCompetence(document.competence) : "competência não identificada"}`;
        return `${reference}: ${document.invalidReason || "Documento não selecionado."}`;
      }),
      ...platform.warnings,
    ];
    notes.forEach((line) => {
      if (y > 270) { pdf.addPage(); y = 15; }
      const rows = pdf.splitTextToSize(`• ${line}`, 180);
      pdf.text(rows, margin, y);
      y += rows.length * 4 + 1;
    });
    if (y > 260) { pdf.addPage(); y = 15; }
    y += 5;
    pdf.setFontSize(8);
    pdf.setTextColor(71, 85, 105);
    pdf.text(
      pdf.splitTextToSize(
        usesAverage
          ? "Indicador interno de apoio à análise. A renda considerada corresponde à média aritmética das rendas brutas dos quatro comprovantes mensais mais recentes da mesma plataforma. Não representa aprovação bancária."
          : "Indicador interno de apoio à análise. A renda considerada corresponde ao menor valor bruto entre os quatro comprovantes mensais mais recentes da mesma plataforma. Não representa aprovação bancária.",
        180
      ),
      margin,
      y
    );
    pdf.text("GoodCredit Hub · processamento local · dados sensíveis mascarados", margin, 290);
    if (save) pdf.save(`goodcredit-relatorio-renda-${result.clientName || "analise"}.pdf`);
    return pdf;
  }
  const facts = [
    ["Instituições", [...new Set(result.files.map(fileInstitutionLabel))].join(", ")],
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
  facts.forEach(([label, value]) => {
    const rows: string[] = pdf.splitTextToSize(String(value), 128);
    if (y + rows.length * 4.5 > 274) { pdf.addPage(); y = 15; }
    pdf.setFont("helvetica", "bold"); pdf.text(`${label}:`, margin, y);
    pdf.setFont("helvetica", "normal"); pdf.text(rows, margin + 52, y);
    y += Math.max(6, rows.length * 4.5 + 1);
  }); y += 4;
  readingNotes();
  if (y > 254) { pdf.addPage(); y = 15; }
  pdf.setFont("helvetica", "bold"); pdf.text("Resultado por mês", margin, y); y += 6; pdf.setFont("helvetica", "normal");
  const paragraph = (text: string) => {
    const rows: string[] = pdf.splitTextToSize(text, 180);
    rows.forEach((row) => { if (y > 274) { pdf.addPage(); y = 15; } pdf.text(row, margin, y); y += 4.5; });
    y += 1;
  };
  result.months.forEach((month) => {
    paragraph(`${formatCompetence(month.competence)} | ${month.creditCount ?? "-"} créditos | brutos ${formatCurrencyBR(month.totalCredits)} | depósitos/transferências ${formatCurrencyBR(month.depositTransferCredits ?? month.totalCredits)} | débitos ${formatCurrencyBR(month.totalDebits)}`);
    paragraph(`Confirmada ${formatCurrencyBR(month.confirmedIncome)} | potencial ${formatCurrencyBR(month.potentialIncome)} | excluídos ${formatCurrencyBR(month.excludedAmount)} | pendentes ${formatCurrencyBR(month.pendingAmount)} | rendimentos financeiros ${formatCurrencyBR(month.financialYield || 0)} | próprias ${formatCurrencyBR(month.sameOwnerCredits || 0)} | excepcionais ${formatCurrencyBR(month.exceptionalCredits || 0)}`);
    if (month.managerReference !== undefined) paragraph(`Referência manual ${formatCurrencyBR(month.managerReference)} | diferença da renda classificada ${formatCurrencyBR(month.managerDifference || 0)}${month.managerDifference ? " - revisar referência/classificação; valores bancários preservados." : ""}`);
  });
  y += 5; if (y > 250) { pdf.addPage(); y = 15; } pdf.setFont("helvetica", "bold"); pdf.text("Metodologia e pendências", margin, y); y += 6; pdf.setFont("helvetica", "normal");
  result.explanation.forEach((line) => paragraph(`• ${line}`));
  if (y > 260) { pdf.addPage(); y = 15; }
  pdf.setFont("helvetica", "bold"); pdf.text("Conciliação bancária", margin, y); y += 6; pdf.setFont("helvetica", "normal");
  result.files.forEach((file, index) => paragraph(`Arquivo ${index + 1}: ${file.name || "Extrato sintético"} | créditos extraídos ${formatCurrencyBR(file.reconciliation.creditTotal)} / oficiais ${file.reconciliation.statementCreditTotal === null ? "não informados" : formatCurrencyBR(file.reconciliation.statementCreditTotal)} | débitos extraídos ${formatCurrencyBR(file.reconciliation.debitTotal)} / oficiais ${file.reconciliation.statementDebitTotal === null ? "não informados" : formatCurrencyBR(file.reconciliation.statementDebitTotal)} | ${getReconciliationStatusLabel(file.reconciliation.status)}`));
  if (y > 245) { pdf.addPage(); y = 15; } else y += 8;
  pdf.setFont("helvetica", "bold"); pdf.text("Créditos: classificação e justificativas", margin, y); y += 7; pdf.setFont("helvetica", "normal");
  result.transactions.filter((item) => item.direction === "CREDIT").forEach((item) => {
    if (y > 245) { pdf.addPage(); y = 15; }
    const fileIndex = result.files.findIndex((file) => file.id === item.sourceFileId);
    paragraph(`${item.date || "Data não identificada"} | ${formatCurrencyBR(item.amount)} | ${getClassificationLabel(item.classification)} | arquivo ${fileIndex + 1}, página ${item.sourcePage ?? "-"}, linha ${item.sourceRow ?? "-"}`);
    paragraph(`${item.description} | ${item.counterparty || "Contraparte não identificada"}. ${item.classificationReason}`);
    (item.reviewAudit || []).forEach((entry) => paragraph(`Revisão ${entry.reviewedAt} | ${entry.reviewedBy} | ${getClassificationLabel(entry.previousClassification)} -> ${getClassificationLabel(entry.newClassification)}: ${entry.reason}`));
  });
  if (y > 260) { pdf.addPage(); y = 15; } y += 5; pdf.setFontSize(8); pdf.setTextColor(71, 85, 105); pdf.text(pdf.splitTextToSize("Indicador interno de apoio à análise. Não representa critério oficial de aprovação bancária. A validação final depende da documentação, coerência das movimentações e regras vigentes da instituição financeira.", 180), margin, y); pdf.text("GoodCredit Hub · processamento local · dados sensíveis mascarados", margin, 290);
  if (save) pdf.save(`goodcredit-relatorio-renda-${result.clientName || "analise"}.pdf`);
  return pdf;
}
