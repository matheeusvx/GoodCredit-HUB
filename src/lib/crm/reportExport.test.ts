import { describe, expect, it } from "vitest";
import type { CrmDashboardResponse } from "../../types/crmDashboard.js";
import {
  buildCrmExcelWorkbook,
  buildCrmPdfReport,
  createCrmReportModel,
  crmReportFileName,
} from "./reportExport.js";

function dashboardFixture(): CrmDashboardResponse {
  const comparisonMetric = {
    current: 1,
    previous: 0,
    absoluteChange: 1,
    percentChange: null,
    available: true,
  };
  return {
    user: { name: "Matheus Morelli", blessUserId: "user-a" },
    metrics: {
      currentPortfolio: 4,
      receivedToday: 2,
      transferredToday: 1,
      averageResponseSecondsToday: 90,
      clientsServedToday: 1,
      awaitingResponse: 2,
      conversationsWithUnread: 1,
      totalUnreadMessages: 3,
      inactiveOver24h: 1,
    },
    sessions: [{
      sessionId: "session-1",
      contactName: "Cliente Teste",
      status: "IN_PROGRESS",
      lastInteractionAt: "2026-08-27T14:00:00Z",
      unreadCount: 0,
      awaitingResponse: false,
      inactiveOver24h: false,
    }],
    analytics: {
      period: {
        key: "custom",
        timezone: "America/Sao_Paulo",
        requestedStartAt: "2026-08-21T03:00:00.000Z",
        requestedEndAt: "2026-08-28T03:00:00.000Z",
        effectiveStartAt: "2026-08-21T03:00:00.000Z",
        effectiveEndAt: "2026-08-28T03:00:00.000Z",
        limitedByMetricsStartAt: false,
      },
      availability: {
        metricsStartAt: "2026-08-01T03:00:00.000Z",
        assignmentHistoryStartAt: "2026-08-01T03:00:00.000Z",
        messagesHistoryStartAt: "2026-08-01T03:00:00.000Z",
        responsesHistoryStartAt: "2026-08-01T03:00:00.000Z",
        assignmentCoverage: "FULL",
        limitations: ["PORTFOLIO_HISTORY_UNAVAILABLE_CURRENT_SNAPSHOT_ONLY"],
      },
      periodSummary: {
        received: 2,
        transferred: 1,
        clientsServed: 1,
        averageResponseSeconds: 90,
        responseCount: 2,
      },
      comparison: {
        previousPeriod: {
          startAt: "2026-08-14T03:00:00.000Z",
          endAt: "2026-08-21T03:00:00.000Z",
          effectiveStartAt: "2026-08-14T03:00:00.000Z",
          effectiveEndAt: "2026-08-21T03:00:00.000Z",
          limitedByMetricsStartAt: false,
        },
        received: comparisonMetric,
        transferred: comparisonMetric,
        clientsServed: comparisonMetric,
        averageResponseSeconds: comparisonMetric,
      },
      dailySeries: [{
        date: "2026-08-27",
        received: 2,
        transferred: 1,
        clientsServed: 1,
        responseCount: 2,
        averageResponseSeconds: 90,
        availability: {
          assignments: true,
          assignmentCoverage: "FULL",
          messages: true,
          responses: true,
        },
      }],
      portfolioHealth: {
        total: 4,
        responded: 2,
        awaitingResponse: 2,
        conversationsWithUnread: 1,
        inactiveOver24h: 1,
      },
      portfolioDistribution: {
        awaitingResponse: 2,
        unread: 1,
        inactive: 1,
        ok: 0,
        total: 4,
      },
      attendedClients: [{
        sessionId: "session-1",
        contactName: "Cliente Teste",
        currentStatus: "IN_PROGRESS",
        firstAgentInteractionAt: "2026-08-27T12:00:00.000Z",
        lastAgentInteractionAt: "2026-08-27T14:00:00.000Z",
        agentMessageCount: 2,
        customerMessageCount: 3,
        totalRelevantMessages: 5,
        currentAssignmentScope: "VALID",
        currentBlessUserId: "user-a",
        receivedInPeriod: true,
        transferredInPeriod: false,
      }],
      attendanceMovements: [{
        contactName: "Cliente Teste",
        type: "RECEIVED",
        occurredAt: "2026-08-27T11:00:00.000Z",
      }],
    },
    meta: {
      metricsStartAt: "2026-08-01T03:00:00.000Z",
      monitorStartedAt: "2026-08-01T03:00:00.000Z",
      lastSyncAt: "2026-08-27T14:00:00.000Z",
      integrationStatus: "READY",
    },
  };
}

describe("exportação de relatórios CRM", () => {
  it("preserva o período customizado, os KPIs e o nome sanitizado do arquivo", () => {
    const model = createCrmReportModel(
      dashboardFixture(),
      new Date("2026-08-27T15:00:00.000Z"),
    );
    expect(model.periodLabel).toBe("21/08/2026 a 27/08/2026");
    expect(model.summary).toMatchObject({
      currentPortfolio: 4,
      clientsServed: 1,
      received: 2,
      transferred: 1,
      averageResponseSeconds: 90,
    });
    expect(crmReportFileName(model, "xlsx")).toBe(
      "goodcredit-crm-matheus-morelli-2026-08-21-a-2026-08-27.xlsx",
    );
  });

  it("gera Excel com as abas e dados de clientes esperados", async () => {
    const XLSX = await import("@e965/xlsx");
    const workbook = await buildCrmExcelWorkbook(createCrmReportModel(dashboardFixture()));
    expect(workbook.SheetNames).toEqual([
      "Resumo",
      "Atendimentos",
      "Performance diária",
      "Movimentações",
    ]);
    const attendanceRows = XLSX.utils.sheet_to_json<unknown[]>(
      workbook.Sheets.Atendimentos,
      { header: 1, raw: true, defval: "" },
    );
    expect(attendanceRows[1]).toEqual([
      "Cliente Teste",
      "Em andamento",
      "27/08/2026, 09:00",
      "27/08/2026, 11:00",
      2,
      3,
      5,
      "Em sua carteira",
      "Sim",
      "Não",
    ]);
    const fileBytes = XLSX.write(workbook, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
    expect(fileBytes.byteLength).toBeGreaterThan(1_000);
  });

  it("representa dados indisponíveis como traço e omite movimentações sem coverage", async () => {
    const dashboard = dashboardFixture();
    dashboard.analytics.periodSummary.received = null;
    dashboard.analytics.periodSummary.transferred = null;
    dashboard.analytics.availability.assignmentCoverage = "NONE";
    dashboard.analytics.attendanceMovements = [];
    const model = createCrmReportModel(dashboard);
    const workbook = await buildCrmExcelWorkbook(model);
    expect(model.assignmentCoverageNote).toContain("indisponível");
    expect(workbook.SheetNames).not.toContain("Movimentações");
    const XLSX = await import("@e965/xlsx");
    const summaryRows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets.Resumo, {
      header: 1,
      raw: true,
      defval: "",
    });
    expect(summaryRows).toContainEqual(["Recebidos", "—"]);
    expect(summaryRows).toContainEqual(["Transferidos", "—"]);
  });

  it("mantém números reais e sinaliza coverage parcial", async () => {
    const dashboard = dashboardFixture();
    dashboard.analytics.availability.assignmentCoverage = "PARTIAL";
    dashboard.analytics.availability.assignmentHistoryStartAt = "2026-08-25T18:38:00.000Z";
    const model = createCrmReportModel(dashboard);
    expect(model.summary.received).toBe(2);
    expect(model.summary.transferred).toBe(1);
    expect(model.assignmentCoverageNote).toContain("25/08/2026");
    expect((await buildCrmExcelWorkbook(model)).SheetNames).toContain("Movimentações");
  });

  it("gera PDF paginado sem erro para muitos clientes", () => {
    const dashboard = dashboardFixture();
    const base = dashboard.analytics.attendedClients[0];
    dashboard.analytics.attendedClients = Array.from({ length: 60 }, (_, index) => ({
      ...base,
      sessionId: `session-${index + 1}`,
      contactName: `Cliente Teste ${index + 1}`,
    }));
    const pdf = buildCrmPdfReport(createCrmReportModel(dashboard));
    expect(pdf.getNumberOfPages()).toBeGreaterThan(1);
    expect((pdf.output("arraybuffer") as ArrayBuffer).byteLength).toBeGreaterThan(1_000);
  });

  it("não propaga texto de mensagem para o modelo nem para a planilha", async () => {
    const dashboard = dashboardFixture();
    const secret = "CONTEÚDO PRIVADO DA MENSAGEM";
    Object.assign(dashboard.analytics.attendedClients[0], { messageBody: secret });
    const model = createCrmReportModel(dashboard);
    expect(JSON.stringify(model)).not.toContain(secret);
    const workbook = await buildCrmExcelWorkbook(model);
    const XLSX = await import("@e965/xlsx");
    const exportedRows = workbook.SheetNames.flatMap((sheetName) =>
      XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
        header: 1,
        raw: true,
        defval: "",
      })
    );
    expect(JSON.stringify(exportedRows)).not.toContain(secret);
  });
});
