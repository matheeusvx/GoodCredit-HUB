import type { CrmAnalyticsPeriod, CrmAnalyticsPeriodKey } from "../../types/crmDashboard.js";

export const CRM_TIME_ZONE = "America/Sao_Paulo";

interface DateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const zonedFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: CRM_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function partsInSaoPaulo(date: Date): DateParts {
  const values = Object.fromEntries(
    zonedFormatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)])
  );
  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  };
}

export interface CrmAnalyticsPeriodRequest {
  key: CrmAnalyticsPeriodKey;
  from?: string;
  to?: string;
}

export interface ResolvedCrmAnalyticsPeriod {
  metadata: CrmAnalyticsPeriod;
  requestedStart: Date;
  requestedEnd: Date;
  effectiveStart: Date;
  effectiveEnd: Date;
  previousRequestedStart: Date;
  previousRequestedEnd: Date;
  previousEffectiveStart: Date;
  previousEffectiveEnd: Date;
  dayCount: number;
}

function queryValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) throw new Error("Parâmetro de período inválido.");
  return value;
}

function validDateKey(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.getUTCFullYear() === Number(match[1])
    && date.getUTCMonth() === Number(match[2]) - 1
    && date.getUTCDate() === Number(match[3]);
}

export function addLocalDays(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

export function getSaoPauloDateKey(date: Date): string {
  const parts = partsInSaoPaulo(date);
  return [
    parts.year,
    String(parts.month).padStart(2, "0"),
    String(parts.day).padStart(2, "0"),
  ].join("-");
}

export function getSaoPauloDateRange(dateKey: string): { start: Date; end: Date } {
  if (!validDateKey(dateKey)) throw new Error("Data local inválida.");
  const [year, month, day] = dateKey.split("-").map(Number);
  const nextKey = addLocalDays(dateKey, 1);
  const [nextYear, nextMonth, nextDay] = nextKey.split("-").map(Number);
  return {
    start: localPartsToUtc({ year, month, day, hour: 0, minute: 0, second: 0 }),
    end: localPartsToUtc({
      year: nextYear,
      month: nextMonth,
      day: nextDay,
      hour: 0,
      minute: 0,
      second: 0,
    }),
  };
}

export function parseCrmAnalyticsPeriodQuery(
  query: Record<string, string | string[] | undefined> = {}
): CrmAnalyticsPeriodRequest {
  const key = queryValue(query.period) || "today";
  if (!["today", "7d", "30d", "month", "custom"].includes(key)) {
    throw new Error("Período inválido.");
  }
  const from = queryValue(query.from);
  const to = queryValue(query.to);
  if (key !== "custom") return { key: key as CrmAnalyticsPeriodKey };
  if (!from || !to || !validDateKey(from) || !validDateKey(to)) {
    throw new Error("O período custom exige from e to no formato YYYY-MM-DD.");
  }
  if (from > to) throw new Error("A data inicial não pode ser posterior à final.");
  const days = Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000
  ) + 1;
  if (days > 366) throw new Error("O período custom não pode exceder 366 dias.");
  return { key: "custom", from, to };
}

export function resolveCrmAnalyticsPeriod(
  request: CrmAnalyticsPeriodRequest,
  metricsStartAt: string,
  now = new Date()
): ResolvedCrmAnalyticsPeriod {
  const todayKey = getSaoPauloDateKey(now);
  let startKey = todayKey;
  let endKey = todayKey;
  if (request.key === "7d") startKey = addLocalDays(todayKey, -6);
  if (request.key === "30d") startKey = addLocalDays(todayKey, -29);
  if (request.key === "month") startKey = `${todayKey.slice(0, 8)}01`;
  if (request.key === "custom") {
    startKey = request.from!;
    endKey = request.to!;
  }
  const requestedStart = getSaoPauloDateRange(startKey).start;
  const requestedEnd = getSaoPauloDateRange(endKey).end;
  const metricsStart = new Date(metricsStartAt);
  if (!Number.isFinite(metricsStart.getTime())) throw new Error("CRM_METRICS_START_AT inválido.");
  const effectiveStart = new Date(Math.min(
    requestedEnd.getTime(),
    Math.max(requestedStart.getTime(), metricsStart.getTime())
  ));
  const dayCount = Math.round(
    (Date.parse(`${endKey}T00:00:00Z`) - Date.parse(`${startKey}T00:00:00Z`)) / 86_400_000
  ) + 1;
  const previousEndKey = addLocalDays(startKey, -1);
  const previousStartKey = addLocalDays(previousEndKey, -(dayCount - 1));
  const previousRequestedStart = getSaoPauloDateRange(previousStartKey).start;
  const previousRequestedEnd = getSaoPauloDateRange(previousEndKey).end;
  const previousEffectiveStart = new Date(Math.min(
    previousRequestedEnd.getTime(),
    Math.max(previousRequestedStart.getTime(), metricsStart.getTime())
  ));
  return {
    metadata: {
      key: request.key,
      timezone: CRM_TIME_ZONE,
      requestedStartAt: requestedStart.toISOString(),
      requestedEndAt: requestedEnd.toISOString(),
      effectiveStartAt: effectiveStart.toISOString(),
      effectiveEndAt: requestedEnd.toISOString(),
      limitedByMetricsStartAt: effectiveStart.getTime() !== requestedStart.getTime(),
    },
    requestedStart,
    requestedEnd,
    effectiveStart,
    effectiveEnd: requestedEnd,
    previousRequestedStart,
    previousRequestedEnd,
    previousEffectiveStart,
    previousEffectiveEnd: previousRequestedEnd,
    dayCount,
  };
}

function localPartsToUtc(parts: DateParts): Date {
  const targetAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );
  let candidate = targetAsUtc;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const actual = partsInSaoPaulo(new Date(candidate));
    const actualAsUtc = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
      actual.second
    );
    candidate += targetAsUtc - actualAsUtc;
  }
  return new Date(candidate);
}

export function getSaoPauloDayRange(now = new Date()): {
  start: Date;
  end: Date;
} {
  return getSaoPauloDateRange(getSaoPauloDateKey(now));
}

export function isInsideRange(
  value: string | Date,
  start: Date,
  end: Date
): boolean {
  const timestamp = new Date(value).getTime();
  return timestamp >= start.getTime() && timestamp < end.getTime();
}
