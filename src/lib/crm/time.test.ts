import { describe, expect, it } from "vitest";
import {
  parseCrmAnalyticsPeriodQuery,
  resolveCrmAnalyticsPeriod,
} from "./time.js";

const NOW = new Date("2026-08-25T15:00:00Z");
const METRICS_START = "2026-08-01T03:00:00Z";

describe("períodos de analytics do CRM", () => {
  it("resolve today em America/Sao_Paulo", () => {
    const period = resolveCrmAnalyticsPeriod(
      parseCrmAnalyticsPeriodQuery({ period: "today" }),
      METRICS_START,
      NOW
    );
    expect(period.metadata).toMatchObject({
      key: "today",
      timezone: "America/Sao_Paulo",
      requestedStartAt: "2026-08-25T03:00:00.000Z",
      requestedEndAt: "2026-08-26T03:00:00.000Z",
      limitedByMetricsStartAt: false,
    });
  });

  it("resolve os sete dias incluindo hoje", () => {
    const period = resolveCrmAnalyticsPeriod({ key: "7d" }, METRICS_START, NOW);
    expect(period.metadata.requestedStartAt).toBe("2026-08-19T03:00:00.000Z");
    expect(period.metadata.requestedEndAt).toBe("2026-08-26T03:00:00.000Z");
    expect(period.dayCount).toBe(7);
  });

  it("resolve o mês atual até o fim do dia corrente", () => {
    const period = resolveCrmAnalyticsPeriod({ key: "month" }, METRICS_START, NOW);
    expect(period.metadata.requestedStartAt).toBe("2026-08-01T03:00:00.000Z");
    expect(period.metadata.requestedEndAt).toBe("2026-08-26T03:00:00.000Z");
    expect(period.dayCount).toBe(25);
  });

  it("resolve custom com from e to inclusivos", () => {
    const request = parseCrmAnalyticsPeriodQuery({
      period: "custom",
      from: "2026-08-05",
      to: "2026-08-20",
    });
    const period = resolveCrmAnalyticsPeriod(request, METRICS_START, NOW);
    expect(period.metadata.requestedStartAt).toBe("2026-08-05T03:00:00.000Z");
    expect(period.metadata.requestedEndAt).toBe("2026-08-21T03:00:00.000Z");
    expect(period.dayCount).toBe(16);
  });

  it("trunca o início em CRM_METRICS_START_AT", () => {
    const period = resolveCrmAnalyticsPeriod({ key: "30d" }, METRICS_START, NOW);
    expect(period.metadata.requestedStartAt).toBe("2026-07-27T03:00:00.000Z");
    expect(period.metadata.effectiveStartAt).toBe("2026-08-01T03:00:00.000Z");
    expect(period.metadata.limitedByMetricsStartAt).toBe(true);
  });

  it("cria comparação imediatamente anterior com o mesmo número de dias", () => {
    const period = resolveCrmAnalyticsPeriod({ key: "7d" }, METRICS_START, NOW);
    expect(period.previousRequestedStart.toISOString()).toBe("2026-08-12T03:00:00.000Z");
    expect(period.previousRequestedEnd.toISOString()).toBe("2026-08-19T03:00:00.000Z");
  });

  it("rejeita custom inválido ou superior a 366 dias", () => {
    expect(() => parseCrmAnalyticsPeriodQuery({
      period: "custom",
      from: "2026-02-30",
      to: "2026-03-01",
    })).toThrow();
    expect(() => parseCrmAnalyticsPeriodQuery({
      period: "custom",
      from: "2026-08-20",
      to: "2026-08-05",
    })).toThrow();
    expect(() => parseCrmAnalyticsPeriodQuery({
      period: "custom",
      from: "2025-01-01",
      to: "2026-01-02",
    })).toThrow();
  });
});
