import type { RegistrationFinancialStatus } from "../../types/registrationFinancial";

/** What the Início dashboard reads from the account: checklists, registros and their lançamentos. */
export interface ProductivityChecklist {
  status: "IN_PROGRESS" | "HAS_ISSUES" | "COMPLETED" | string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface ProductivityRegistro {
  status: RegistrationFinancialStatus;
  openedAt: string;
  createdAt: string;
  finalizedAt: string | null;
  archivedAt: string | null;
}

export interface ProductivityTransaction {
  createdAt: string;
}

export interface ProductivitySource {
  checklists: ProductivityChecklist[];
  registros: ProductivityRegistro[];
  transactions: ProductivityTransaction[];
}

export interface MonthBucket {
  /** First day of the month, "2026-11-01". */
  month: string;
  checklists: number;
  registros: number;
  total: number;
}

export type StatusKey = "COMPLETED" | "IN_PROGRESS" | "AWAITING_PAYMENT" | "HAS_ISSUES";

export interface StatusBucket {
  key: StatusKey;
  label: string;
  value: number;
}

export interface WeekdayBucket {
  /** 0 = segunda … 6 = domingo */
  day: number;
  label: string;
  long: string;
  value: number;
}

const WEEKDAYS = [
  ["Seg", "Segunda-feira"],
  ["Ter", "Terça-feira"],
  ["Qua", "Quarta-feira"],
  ["Qui", "Quinta-feira"],
  ["Sex", "Sexta-feira"],
  ["Sáb", "Sábado"],
  ["Dom", "Domingo"]
] as const;

export const STATUS_LABELS: Record<StatusKey, string> = {
  COMPLETED: "Concluídos",
  IN_PROGRESS: "Em andamento",
  AWAITING_PAYMENT: "Aguardando pagamento",
  HAS_ISSUES: "Com pendências"
};

/** Local calendar parts of an ISO date or timestamp ("2026-11-03" is read as that day, not UTC midnight). */
function localDate(value: string): Date | null {
  if (!value) return null;
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = dateOnly ? new Date(`${value}T12:00:00`) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

/** The last `count` months up to `now`, oldest first, with what was opened in each. */
export function buildMonthlyBuckets(source: ProductivitySource, count: number, now = new Date()): MonthBucket[] {
  const months: MonthBucket[] = [];
  for (let offset = count - 1; offset >= 0; offset--) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    months.push({ month: monthKey(date), checklists: 0, registros: 0, total: 0 });
  }
  const index = new Map(months.map((bucket, i) => [bucket.month, i]));
  const add = (value: string, field: "checklists" | "registros") => {
    const date = localDate(value);
    if (!date) return;
    const i = index.get(monthKey(date));
    if (i === undefined) return;
    months[i][field] += 1;
    months[i].total += 1;
  };
  source.checklists.forEach((item) => add(item.createdAt, "checklists"));
  source.registros.forEach((item) => add(item.openedAt || item.createdAt, "registros"));
  return months;
}

const REGISTRO_BUCKET: Record<RegistrationFinancialStatus, StatusKey> = {
  AWAITING_PAYMENT: "AWAITING_PAYMENT",
  PARTIAL_PAYMENT: "AWAITING_PAYMENT",
  ADVISORY_PENDING: "AWAITING_PAYMENT",
  ADVISORY_PARTIAL: "AWAITING_PAYMENT",
  WAITING_DIRECT_PAYMENTS: "AWAITING_PAYMENT",
  FUNDS_AVAILABLE: "IN_PROGRESS",
  COSTS_IN_PROGRESS: "IN_PROGRESS",
  COMPLEMENT_REQUIRED: "HAS_ISSUES",
  VALUE_TO_REFUND: "HAS_ISSUES",
  CONCILIATED: "COMPLETED",
  ADVISORY_RECEIVED: "COMPLETED",
  DIRECT_COSTS_REGISTERED: "COMPLETED"
} as Record<RegistrationFinancialStatus, StatusKey>;

/** Every process not archived, by where it stands. Order is the ring's: the result first. */
export function buildStatusBuckets(source: ProductivitySource): StatusBucket[] {
  const counts: Record<StatusKey, number> = { COMPLETED: 0, IN_PROGRESS: 0, AWAITING_PAYMENT: 0, HAS_ISSUES: 0 };
  for (const item of source.checklists) {
    if (item.archivedAt) continue;
    const key: StatusKey = item.status === "COMPLETED" ? "COMPLETED" : item.status === "HAS_ISSUES" ? "HAS_ISSUES" : "IN_PROGRESS";
    counts[key] += 1;
  }
  for (const item of source.registros) {
    if (item.archivedAt) continue;
    counts[item.finalizedAt ? "COMPLETED" : REGISTRO_BUCKET[item.status] ?? "IN_PROGRESS"] += 1;
  }
  return (Object.keys(STATUS_LABELS) as StatusKey[]).map((key) => ({ key, label: STATUS_LABELS[key], value: counts[key] }));
}

/**
 * Activity by weekday over the last `days` days: each checklist created or saved, each registro opened
 * and each lançamento recorded counts once on its day.
 */
export function buildWeekdayBuckets(source: ProductivitySource, days = 90, now = new Date()): WeekdayBucket[] {
  const buckets: WeekdayBucket[] = WEEKDAYS.map(([label, long], day) => ({ day, label, long, value: 0 }));
  const since = new Date(now);
  since.setDate(since.getDate() - days);
  const add = (value: string | null | undefined) => {
    const date = value ? localDate(value) : null;
    if (!date || date < since || date > now) return;
    buckets[(date.getDay() + 6) % 7].value += 1;
  };
  for (const item of source.checklists) {
    add(item.createdAt);
    if (item.updatedAt && item.updatedAt.slice(0, 10) !== item.createdAt.slice(0, 10)) add(item.updatedAt);
  }
  source.registros.forEach((item) => add(item.createdAt));
  source.transactions.forEach((item) => add(item.createdAt));
  return buckets;
}

export function percentChange(current: number, previous: number | undefined): number | null {
  if (previous === undefined || previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}
