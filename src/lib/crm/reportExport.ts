import jsPDF from "jspdf";
import type { WorkBook, WorkSheet } from "@e965/xlsx";
import type {
  CrmAssignmentHistoryCoverage,
  CrmDashboardResponse,
  CrmSessionStatus,
} from "../../types/crmDashboard.js";
import { attendedClientSituation } from "./attendancePresentation.js";

const TIMEZONE = "America/Sao_Paulo";
const STATUS_LABELS: Record<CrmSessionStatus, string> = {
  UNDEFINED: "Não definido",
  STARTED: "Iniciado",
  PENDING: "Pendente",
  IN_PROGRESS: "Em andamento",
  COMPLETED: "Concluído",
  HIDDEN: "Oculto",
};
const MOVEMENT_LABELS = {
  RECEIVED: "Recebido",
  TRANSFERRED: "Transferido",
  UNASSIGNED: "Responsável removido",
  COMPLETED: "Concluído",
  REOPENED: "Reaberto",
} as const;

export interface CrmReportModel {
  userName: string;
  periodFrom: string;
  periodTo: string;
  periodLabel: string;
  generatedAt: string;
  generatedAtLabel: string;
  assignmentCoverage: CrmAssignmentHistoryCoverage;
  assignmentCoverageNote: string | null;
  metricsCoverageNote: string | null;
  summary: {
    currentPortfolio: number;
    clientsServed: number;
    received: number | null;
    transferred: number | null;
    averageResponseSeconds: number | null;
    awaitingResponse: number;
    conversationsWithUnread: number;
    inactiveOver24h: number;
  };
  clients: Array<{
    contactName: string;
    status: string;
    firstInteraction: string;
    lastInteraction: string;
    agentMessageCount: number;
    customerMessageCount: number;
    totalRelevantMessages: number;
    situation: string;
    receivedInPeriod: boolean;
    transferredInPeriod: boolean;
  }>;
  dailyPerformance: Array<{
    date: string;
    clientsServed: number;
    received: number | null;
    transferred: number | null;
    averageResponseSeconds: number | null;
  }>;
  movements: Array<{
    contactName: string;
    type: string;
    occurredAt: string;
  }>;
}

function dateKey(value: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

function formatDateKey(value: string): string {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  const rounded = Math.max(0, Math.round(seconds));
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const remainingSeconds = rounded % 60;
  if (hours) return `${hours}h ${minutes}m`;
  if (minutes) return remainingSeconds ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  return `${remainingSeconds}s`;
}

function coverageNote(
  coverage: CrmAssignmentHistoryCoverage,
  availableFrom: string | null,
): string | null {
  if (coverage === "FULL") return null;
  if (coverage === "NONE") return "Histórico de recebimentos e transferências indisponível no período.";
  return availableFrom
    ? `Histórico de recebimentos e transferências disponível desde ${formatDateTime(availableFrom)}.`
    : "Histórico de recebimentos e transferências parcialmente disponível no período.";
}

export function createCrmReportModel(
  dashboard: CrmDashboardResponse,
  generatedAt = new Date(),
): CrmReportModel {
  const requestedStart = new Date(dashboard.analytics.period.requestedStartAt);
  const requestedEndInclusive = new Date(
    new Date(dashboard.analytics.period.requestedEndAt).getTime() - 1,
  );
  const periodFrom = dateKey(requestedStart);
  const periodTo = dateKey(requestedEndInclusive);
  const assignmentCoverage = dashboard.analytics.availability.assignmentCoverage;
  const currentBlessUserId = dashboard.user?.blessUserId || "";
  return {
    userName: dashboard.user?.name || "Usuário não identificado",
    periodFrom,
    periodTo,
    periodLabel: periodFrom === periodTo
      ? formatDateKey(periodFrom)
      : `${formatDateKey(periodFrom)} a ${formatDateKey(periodTo)}`,
    generatedAt: generatedAt.toISOString(),
    generatedAtLabel: formatDateTime(generatedAt.toISOString()),
    assignmentCoverage,
    assignmentCoverageNote: coverageNote(
      assignmentCoverage,
      dashboard.analytics.availability.assignmentHistoryStartAt,
    ),
    metricsCoverageNote: dashboard.analytics.period.limitedByMetricsStartAt
      ? `Dados históricos disponíveis a partir de ${formatDateTime(dashboard.analytics.period.effectiveStartAt)}.`
      : null,
    summary: {
      currentPortfolio: dashboard.metrics.currentPortfolio,
      clientsServed: dashboard.analytics.periodSummary.clientsServed,
      received: dashboard.analytics.periodSummary.received,
      transferred: dashboard.analytics.periodSummary.transferred,
      averageResponseSeconds: dashboard.analytics.periodSummary.averageResponseSeconds,
      awaitingResponse: dashboard.metrics.awaitingResponse,
      conversationsWithUnread: dashboard.metrics.conversationsWithUnread,
      inactiveOver24h: dashboard.metrics.inactiveOver24h,
    },
    clients: dashboard.analytics.attendedClients.map((client) => ({
      contactName: client.contactName,
      status: STATUS_LABELS[client.currentStatus],
      firstInteraction: formatDateTime(client.firstAgentInteractionAt),
      lastInteraction: formatDateTime(client.lastAgentInteractionAt),
      agentMessageCount: client.agentMessageCount,
      customerMessageCount: client.customerMessageCount,
      totalRelevantMessages: client.totalRelevantMessages,
      situation: attendedClientSituation(client, currentBlessUserId),
      receivedInPeriod: client.receivedInPeriod,
      transferredInPeriod: client.transferredInPeriod,
    })),
    dailyPerformance: dashboard.analytics.dailySeries.map((day) => ({
      date: formatDateKey(day.date),
      clientsServed: day.clientsServed,
      received: day.received,
      transferred: day.transferred,
      averageResponseSeconds: day.averageResponseSeconds,
    })),
    movements: dashboard.analytics.attendanceMovements.map((movement) => ({
      contactName: movement.contactName,
      type: MOVEMENT_LABELS[movement.type],
      occurredAt: formatDateTime(movement.occurredAt),
    })),
  };
}

function slug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "usuario";
}

export function crmReportFileName(model: CrmReportModel, extension: "pdf" | "xlsx"): string {
  return `goodcredit-crm-${slug(model.userName)}-${model.periodFrom}-a-${model.periodTo}.${extension}`;
}

function setColumnWidths(sheet: WorkSheet, widths: number[]): void {
  sheet["!cols"] = widths.map((wch) => ({ wch }));
}

export async function buildCrmExcelWorkbook(model: CrmReportModel): Promise<WorkBook> {
  const XLSX = await import("@e965/xlsx");
  const workbook = XLSX.utils.book_new();
  const summaryRows: unknown[][] = [
    ["Indicador", "Valor"],
    ["Usuário", model.userName],
    ["Período", model.periodLabel],
    ["Data de geração", model.generatedAtLabel],
    ["Carteira atual", model.summary.currentPortfolio],
    ["Clientes atendidos", model.summary.clientsServed],
    ["Recebidos", model.summary.received ?? "—"],
    ["Transferidos", model.summary.transferred ?? "—"],
    ["Tempo médio de resposta", formatDuration(model.summary.averageResponseSeconds)],
    ["Aguardando você", model.summary.awaitingResponse],
    ["Não lidos", model.summary.conversationsWithUnread],
    ["Sem interação >24h", model.summary.inactiveOver24h],
  ];
  if (model.metricsCoverageNote) summaryRows.push(["Observação", model.metricsCoverageNote]);
  if (model.assignmentCoverageNote) summaryRows.push(["Observação", model.assignmentCoverageNote]);
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  setColumnWidths(summarySheet, [30, 55]);
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Resumo");

  const attendanceSheet = XLSX.utils.aoa_to_sheet([
    [
      "Cliente", "Status", "Primeira interação", "Última interação",
      "Mensagens enviadas pelo funcionário", "Mensagens recebidas",
      "Total de interações", "Situação atual", "Recebido no período",
      "Transferido no período",
    ],
    ...model.clients.map((client) => [
      client.contactName,
      client.status,
      client.firstInteraction,
      client.lastInteraction,
      client.agentMessageCount,
      client.customerMessageCount,
      client.totalRelevantMessages,
      client.situation,
      client.receivedInPeriod ? "Sim" : "Não",
      client.transferredInPeriod ? "Sim" : "Não",
    ]),
  ]);
  setColumnWidths(attendanceSheet, [34, 18, 22, 22, 24, 20, 18, 24, 20, 22]);
  XLSX.utils.book_append_sheet(workbook, attendanceSheet, "Atendimentos");

  const performanceSheet = XLSX.utils.aoa_to_sheet([
    ["Data", "Clientes atendidos", "Recebidos", "Transferidos", "Tempo médio de resposta"],
    ...model.dailyPerformance.map((day) => [
      day.date,
      day.clientsServed,
      day.received ?? "—",
      day.transferred ?? "—",
      formatDuration(day.averageResponseSeconds),
    ]),
  ]);
  setColumnWidths(performanceSheet, [16, 20, 16, 16, 26]);
  XLSX.utils.book_append_sheet(workbook, performanceSheet, "Performance diária");

  if (model.assignmentCoverage !== "NONE") {
    const movementSheet = XLSX.utils.aoa_to_sheet([
      ["Cliente", "Tipo", "Data/hora"],
      ...model.movements.map((movement) => [
        movement.contactName,
        movement.type,
        movement.occurredAt,
      ]),
    ]);
    setColumnWidths(movementSheet, [36, 24, 24]);
    XLSX.utils.book_append_sheet(workbook, movementSheet, "Movimentações");
  }
  workbook.Props = {
    Title: "Relatório de Performance CRM",
    Subject: model.periodLabel,
    Author: "GoodCredit",
    CreatedDate: new Date(model.generatedAt),
  };
  return workbook;
}

export async function downloadCrmExcelReport(model: CrmReportModel): Promise<void> {
  const XLSX = await import("@e965/xlsx");
  const workbook = await buildCrmExcelWorkbook(model);
  XLSX.writeFile(workbook, crmReportFileName(model, "xlsx"), { compression: true });
}

interface PdfContext {
  pdf: jsPDF;
  y: number;
  margin: number;
  pageWidth: number;
  pageHeight: number;
}

function addContinuationPage(context: PdfContext): void {
  context.pdf.addPage();
  context.y = 15;
  context.pdf.setFont("helvetica", "bold");
  context.pdf.setFontSize(9);
  context.pdf.setTextColor(32, 77, 63);
  context.pdf.text("GoodCredit · Relatório de Performance CRM", context.margin, context.y);
  context.y += 8;
}

function ensurePdfSpace(context: PdfContext, height: number): void {
  if (context.y + height > context.pageHeight - 15) addContinuationPage(context);
}

function drawSectionTitle(context: PdfContext, title: string): void {
  ensurePdfSpace(context, 12);
  context.pdf.setFont("helvetica", "bold");
  context.pdf.setFontSize(11);
  context.pdf.setTextColor(15, 23, 42);
  context.pdf.text(title, context.margin, context.y);
  context.y += 7;
}

function drawPdfTable(
  context: PdfContext,
  headers: string[],
  widths: number[],
  rows: Array<Array<string | number>>,
): void {
  const lineHeight = 3.6;
  const drawHeader = () => {
    ensurePdfSpace(context, 9);
    context.pdf.setFillColor(241, 245, 249);
    context.pdf.setDrawColor(203, 213, 225);
    context.pdf.setFont("helvetica", "bold");
    context.pdf.setFontSize(7.4);
    context.pdf.setTextColor(51, 65, 85);
    let x = context.margin;
    headers.forEach((header, index) => {
      context.pdf.rect(x, context.y, widths[index], 8, "FD");
      context.pdf.text(header, x + 1.5, context.y + 5.1, { maxWidth: widths[index] - 3 });
      x += widths[index];
    });
    context.y += 8;
  };
  drawHeader();
  rows.forEach((row) => {
    const wrapped = row.map((value, index) =>
      context.pdf.splitTextToSize(String(value), Math.max(4, widths[index] - 3)) as string[]
    );
    const rowHeight = Math.max(7, Math.max(...wrapped.map((lines) => lines.length)) * lineHeight + 3);
    if (context.y + rowHeight > context.pageHeight - 15) {
      addContinuationPage(context);
      drawHeader();
    }
    context.pdf.setDrawColor(226, 232, 240);
    context.pdf.setFont("helvetica", "normal");
    context.pdf.setFontSize(7.2);
    context.pdf.setTextColor(51, 65, 85);
    let x = context.margin;
    wrapped.forEach((lines, index) => {
      context.pdf.rect(x, context.y, widths[index], rowHeight);
      context.pdf.text(lines, x + 1.5, context.y + 4.5);
      x += widths[index];
    });
    context.y += rowHeight;
  });
  context.y += 6;
}

export function buildCrmPdfReport(model: CrmReportModel): jsPDF {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const context: PdfContext = {
    pdf,
    y: 18,
    margin: 15,
    pageWidth: pdf.internal.pageSize.getWidth(),
    pageHeight: pdf.internal.pageSize.getHeight(),
  };
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.setTextColor(32, 77, 63);
  pdf.text("GoodCredit", context.margin, context.y);
  context.y += 8;
  pdf.setFontSize(20);
  pdf.setTextColor(15, 23, 42);
  pdf.text("Relatório de Performance CRM", context.margin, context.y);
  context.y += 8;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(71, 85, 105);
  pdf.text(`Usuário: ${model.userName}`, context.margin, context.y);
  context.y += 5;
  pdf.text(`Período: ${model.periodLabel}`, context.margin, context.y);
  context.y += 5;
  pdf.text(`Gerado em: ${model.generatedAtLabel}`, context.margin, context.y);
  context.y += 10;

  drawSectionTitle(context, "Resumo executivo");
  drawPdfTable(context, ["Indicador", "Valor"], [105, 75], [
    ["Carteira atual", model.summary.currentPortfolio],
    ["Clientes atendidos", model.summary.clientsServed],
    ["Recebidos", model.summary.received ?? "—"],
    ["Transferidos", model.summary.transferred ?? "—"],
    ["Tempo médio de resposta", formatDuration(model.summary.averageResponseSeconds)],
  ]);
  for (const note of [model.metricsCoverageNote, model.assignmentCoverageNote].filter(
    (value): value is string => Boolean(value),
  )) {
    ensurePdfSpace(context, 12);
    pdf.setFillColor(255, 251, 235);
    pdf.setTextColor(146, 64, 14);
    pdf.setFontSize(8);
    const lines = pdf.splitTextToSize(note, 174) as string[];
    const height = lines.length * 4 + 5;
    pdf.roundedRect(context.margin, context.y, 180, height, 2, 2, "F");
    pdf.text(lines, context.margin + 3, context.y + 4.5);
    context.y += height + 7;
  }

  drawSectionTitle(context, "Performance do período");
  drawPdfTable(context, ["Data", "Clientes", "Recebidos", "Transferidos", "Resposta média"], [28, 30, 35, 38, 49], model.dailyPerformance.map((day) => [
    day.date,
    day.clientsServed,
    day.received ?? "—",
    day.transferred ?? "—",
    formatDuration(day.averageResponseSeconds),
  ]));

  drawSectionTitle(context, "Clientes atendidos");
  drawPdfTable(context, ["Cliente", "Status", "Primeira", "Última", "Interações", "Situação"], [43, 25, 31, 31, 20, 30], model.clients.map((client) => [
    client.contactName,
    client.status,
    client.firstInteraction,
    client.lastInteraction,
    client.totalRelevantMessages,
    client.situation,
  ]));

  drawSectionTitle(context, "Prioridades atuais");
  drawPdfTable(context, ["Indicador", "Quantidade"], [125, 55], [
    ["Aguardando você", model.summary.awaitingResponse],
    ["Conversas com não lidas", model.summary.conversationsWithUnread],
    ["Sem interação >24h", model.summary.inactiveOver24h],
  ]);

  if (model.assignmentCoverage !== "NONE") {
    drawSectionTitle(context, "Movimentações");
    drawPdfTable(context, ["Cliente", "Tipo", "Data/hora"], [75, 45, 60], model.movements.map((movement) => [
      movement.contactName,
      movement.type,
      movement.occurredAt,
    ]));
  }

  const pages = pdf.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    pdf.setPage(page);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.setTextColor(100, 116, 139);
    pdf.text(`Página ${page} de ${pages}`, context.pageWidth - context.margin, context.pageHeight - 8, { align: "right" });
  }
  return pdf;
}

export function downloadCrmPdfReport(model: CrmReportModel): void {
  buildCrmPdfReport(model).save(crmReportFileName(model, "pdf"));
}
