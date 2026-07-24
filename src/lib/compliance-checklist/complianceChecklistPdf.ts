import jsPDF from "jspdf";
import {
  COMPLIANCE_CHECKLIST_ITEMS,
  COMPLIANCE_STATUS_LABELS
} from "../../data/complianceChecklistItems";
import {
  ComplianceChecklistState,
  ComplianceChecklistSummary,
  ComplianceChecklistStatus
} from "../../types/complianceChecklist";
import { COMPLIANCE_OVERALL_STATUS_LABELS } from "./complianceChecklistSummary";

export interface ComplianceChecklistPdfRow {
  order: number;
  verification: string;
  status: string;
  statusCode: ComplianceChecklistStatus;
  observation: string;
}

export interface ComplianceChecklistPdfModel {
  title: "Checklist de Conformidade";
  draft: boolean;
  clientName: string;
  processReference: string;
  analystName: string;
  reviewDate: string;
  generatedAt: string;
  summary: ComplianceChecklistSummary;
  overallStatusLabel: string;
  rows: ComplianceChecklistPdfRow[];
  issues: ComplianceChecklistPdfRow[];
  institutionalNotice: string;
}

export const COMPLIANCE_PDF_NOTICE =
  "Este documento é destinado ao controle interno da GoodCredit. O preenchimento do checklist não representa aprovação definitiva do processo e não substitui a análise documental, jurídica ou bancária.";

function formatDate(date: string): string {
  if (!date) return "Não informada";
  const [year, month, day] = date.split("-");
  return year && month && day ? `${day}/${month}/${year}` : date;
}

export function buildComplianceChecklistPdfModel(
  state: ComplianceChecklistState,
  summary: ComplianceChecklistSummary,
  draft: boolean,
  generatedAt = new Date()
): ComplianceChecklistPdfModel {
  const stateById = new Map(state.items.map((item) => [item.itemId, item]));
  const rows = COMPLIANCE_CHECKLIST_ITEMS.map((definition) => {
    const item = stateById.get(definition.id);
    const status = item?.status ?? "PENDING";
    return {
      order: definition.order,
      verification: definition.label,
      status: COMPLIANCE_STATUS_LABELS[status],
      statusCode: status,
      observation: item?.observation.trim() || "—"
    };
  });

  return {
    title: "Checklist de Conformidade",
    draft,
    clientName: state.clientName.trim(),
    processReference: state.processReference.trim() || "Não informada",
    analystName: state.analystName.trim() || "Não informado",
    reviewDate: formatDate(state.reviewDate),
    generatedAt: generatedAt.toLocaleString("pt-BR"),
    summary,
    overallStatusLabel: COMPLIANCE_OVERALL_STATUS_LABELS[summary.overallStatus],
    rows,
    issues: rows.filter((row) => row.statusCode === "HAS_ISSUE"),
    institutionalNotice: COMPLIANCE_PDF_NOTICE
  };
}

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

function safeFileName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "cliente";
}

const ROW_TONES: Record<ComplianceChecklistStatus, [number, number, number]> = {
  PENDING: [241, 245, 249],
  COMPLIANT: [240, 253, 244],
  HAS_ISSUE: [255, 251, 235],
  NOT_APPLICABLE: [248, 250, 252]
};

export async function generateComplianceChecklistPdf(
  state: ComplianceChecklistState,
  summary: ComplianceChecklistSummary,
  draft: boolean
): Promise<void> {
  const model = buildComplianceChecklistPdfModel(state, summary, draft);
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = 14;

  const addFooter = () => {
    const page = pdf.getNumberOfPages();
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    pdf.text("GoodCredit Hub • Uso interno", margin, pageHeight - 8);
    pdf.text(String(page), pageWidth - margin, pageHeight - 8, { align: "right" });
  };

  const newPage = () => {
    addFooter();
    pdf.addPage();
    y = 15;
  };

  const ensureSpace = (height: number) => {
    if (y + height > pageHeight - 16) newPage();
  };

  const sectionTitle = (title: string) => {
    ensureSpace(12);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.setTextColor(15, 23, 42);
    pdf.text(title, margin, y);
    y += 7;
  };

  const logo = await loadLogo();
  if (logo) {
    pdf.addImage(logo, "PNG", margin, y, 34, 25);
  } else {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.setTextColor(22, 163, 74);
    pdf.text("GoodCredit Hub", margin, y + 12);
  }

  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(15, 23, 42);
  pdf.setFontSize(18);
  pdf.text(model.title, margin, y + 34);
  if (model.draft) {
    pdf.setFillColor(255, 251, 235);
    pdf.setDrawColor(245, 158, 11);
    pdf.roundedRect(pageWidth - margin - 52, y + 26, 52, 10, 2, 2, "FD");
    pdf.setFontSize(9);
    pdf.setTextColor(146, 64, 14);
    pdf.text("RELATÓRIO EM RASCUNHO", pageWidth - margin - 26, y + 32.5, {
      align: "center"
    });
  }
  y += 45;

  sectionTitle("Identificação");
  const identificationRows: Array<[string, string]> = [
    ["Cliente", model.clientName],
    ["Referência do processo", model.processReference],
    ["Responsável", model.analystName],
    ["Data da conferência", model.reviewDate],
    ["Data e hora da geração", model.generatedAt]
  ];
  identificationRows.forEach(([label, value]) => {
    ensureSpace(6);
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(71, 85, 105);
    pdf.text(`${label}:`, margin, y);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(15, 23, 42);
    pdf.text(value, margin + 47, y);
    y += 5.5;
  });
  y += 3;

  sectionTitle("Resumo da conferência");
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(51, 65, 85);
  const summaryText =
    `${summary.total} verificações • ${summary.compliant} conformes • ` +
    `${summary.hasIssue} com pendência • ${summary.pending} pendentes • ` +
    `${summary.notApplicable} não aplicáveis • ${summary.completionPercent}% concluído`;
  pdf.text(pdf.splitTextToSize(summaryText, contentWidth), margin, y);
  y += 10;
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(summary.hasIssue > 0 ? 146 : 21, summary.hasIssue > 0 ? 64 : 128, summary.hasIssue > 0 ? 14 : 61);
  pdf.text(`Status geral: ${model.overallStatusLabel}`, margin, y);
  y += 9;

  sectionTitle("Checklist completo");
  const columns = [
    { label: "Nº", x: margin, width: 10 },
    { label: "Verificação", x: margin + 10, width: 72 },
    { label: "Status", x: margin + 82, width: 32 },
    { label: "Observação", x: margin + 114, width: contentWidth - 114 }
  ];

  const drawTableHeader = () => {
    pdf.setFillColor(30, 64, 92);
    pdf.rect(margin, y, contentWidth, 8, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(255, 255, 255);
    columns.forEach((column) => pdf.text(column.label, column.x + 2, y + 5.3));
    y += 8;
  };

  drawTableHeader();
  model.rows.forEach((row) => {
    const cells = [
      [String(row.order), columns[0]],
      [row.verification, columns[1]],
      [row.status, columns[2]],
      [row.observation, columns[3]]
    ] as const;
    const lines = cells.map(([text, column]) =>
      pdf.splitTextToSize(text, column.width - 4)
    );
    const rowHeight = Math.max(9, Math.max(...lines.map((value) => value.length)) * 4 + 3);
    if (y + rowHeight > pageHeight - 16) {
      newPage();
      drawTableHeader();
    }

    const [red, green, blue] = ROW_TONES[row.statusCode];
    pdf.setFillColor(red, green, blue);
    pdf.setDrawColor(226, 232, 240);
    pdf.rect(margin, y, contentWidth, rowHeight, "FD");
    pdf.setFont("helvetica", row.statusCode === "HAS_ISSUE" ? "bold" : "normal");
    pdf.setFontSize(7.8);
    pdf.setTextColor(15, 23, 42);
    lines.forEach((cellLines, index) => {
      pdf.text(cellLines, columns[index].x + 2, y + 5);
    });
    y += rowHeight;
  });
  y += 7;

  sectionTitle("Pendências identificadas");
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(51, 65, 85);
  if (model.issues.length === 0) {
    pdf.text("Não foram identificadas pendências nos itens concluídos.", margin, y);
    y += 7;
  } else {
    model.issues.forEach((issue) => {
      const text = `${issue.order}. ${issue.verification} — ${issue.observation}`;
      const lines = pdf.splitTextToSize(text, contentWidth);
      ensureSpace(lines.length * 4.5 + 3);
      pdf.text(lines, margin, y);
      y += lines.length * 4.5 + 3;
    });
  }

  ensureSpace(25);
  y += 4;
  pdf.setFillColor(239, 246, 255);
  pdf.setDrawColor(191, 219, 254);
  const noticeLines = pdf.splitTextToSize(model.institutionalNotice, contentWidth - 10);
  const noticeHeight = noticeLines.length * 4.5 + 10;
  pdf.roundedRect(margin, y, contentWidth, noticeHeight, 2, 2, "FD");
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.setTextColor(30, 64, 92);
  pdf.text(noticeLines, margin + 5, y + 6);

  addFooter();
  pdf.save(`checklist-conformidade-${safeFileName(model.clientName)}.pdf`);
}
