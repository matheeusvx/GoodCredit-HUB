import { describe, expect, it } from "vitest";
import { buildMonthlyBuckets, buildStatusBuckets, buildWeekdayBuckets, percentChange, type ProductivitySource } from "./productivity";

const now = new Date(2026, 10, 24, 15, 0, 0); // 24/11/2026, terça

const source: ProductivitySource = {
  checklists: [
    { status: "COMPLETED", createdAt: "2026-11-03T13:00:00Z", updatedAt: "2026-11-05T13:00:00Z", archivedAt: null },
    { status: "HAS_ISSUES", createdAt: "2026-10-10T13:00:00Z", updatedAt: "2026-10-10T18:00:00Z", archivedAt: null },
    { status: "IN_PROGRESS", createdAt: "2026-06-01T13:00:00Z", updatedAt: "2026-06-01T13:00:00Z", archivedAt: "2026-07-01T00:00:00Z" }
  ],
  registros: [
    { status: "AWAITING_PAYMENT", openedAt: "2026-11-17", createdAt: "2026-11-17T12:00:00Z", finalizedAt: null, archivedAt: null },
    { status: "COSTS_IN_PROGRESS", openedAt: "2026-09-02", createdAt: "2026-09-02T12:00:00Z", finalizedAt: "2026-10-01T00:00:00Z", archivedAt: null }
  ],
  transactions: [{ createdAt: "2026-11-17T14:00:00Z" }]
};

describe("buildMonthlyBuckets", () => {
  it("counts checklists and registros in each of the last months, oldest first", () => {
    const months = buildMonthlyBuckets(source, 3, now);
    expect(months.map((m) => m.month)).toEqual(["2026-09-01", "2026-10-01", "2026-11-01"]);
    expect(months[2]).toMatchObject({ checklists: 1, registros: 1, total: 2 });
    expect(months[1]).toMatchObject({ checklists: 1, registros: 0, total: 1 });
    expect(months[0]).toMatchObject({ registros: 1, total: 1 });
  });

  it("crosses the year boundary", () => {
    const months = buildMonthlyBuckets(source, 12, new Date(2026, 0, 15));
    expect(months[0].month).toBe("2025-02-01");
    expect(months[11].month).toBe("2026-01-01");
  });
});

describe("buildStatusBuckets", () => {
  it("leaves archived work out and puts finalized registros in Concluídos", () => {
    const buckets = Object.fromEntries(buildStatusBuckets(source).map((b) => [b.key, b.value]));
    expect(buckets).toEqual({ COMPLETED: 2, IN_PROGRESS: 0, AWAITING_PAYMENT: 1, HAS_ISSUES: 1 });
  });
});

describe("buildWeekdayBuckets", () => {
  it("counts every action on its weekday within the window, Monday first", () => {
    const days = buildWeekdayBuckets(source, 90, now);
    expect(days.map((d) => d.label)).toEqual(["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]);
    // 17/11 (terça): registro + lançamento; 03/11 (terça): checklist criado
    expect(days[1].value).toBe(3);
    // 05/11 (quinta): checklist salvo em outro dia
    expect(days[3].value).toBe(1);
    // 10/10 (sábado): criado e salvo no mesmo dia conta uma vez
    expect(days[5].value).toBe(1);
  });
});

describe("percentChange", () => {
  it("is null without a previous value to compare", () => {
    expect(percentChange(4, 0)).toBeNull();
    expect(percentChange(3, 2)).toBe(50);
  });
});
