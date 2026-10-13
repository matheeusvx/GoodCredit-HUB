import type { CtpsConfidence, CtpsContractType, CtpsEmploymentStatus } from "../../../types/ctpsAnalysis";

export function formatCtpsCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatCtpsDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("pt-BR");
}

export function employmentDuration(
  admissionDate: string | null,
  terminationDate: string | null,
  referenceDate: string | Date = new Date(),
): { years: number; months: number } | null {
  if (!admissionDate) return null;
  const start = new Date(`${admissionDate}T12:00:00`);
  const end = terminationDate
    ? new Date(`${terminationDate}T12:00:00`)
    : referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return null;
  let months = (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth();
  if (end.getDate() < start.getDate()) months -= 1;
  return { years: Math.floor(Math.max(0, months) / 12), months: Math.max(0, months) % 12 };
}

export function formatEmploymentDuration(value: ReturnType<typeof employmentDuration>): string {
  if (!value) return "—";
  const parts: string[] = [];
  if (value.years) parts.push(`${value.years} ${value.years === 1 ? "ano" : "anos"}`);
  if (value.months || !parts.length) parts.push(`${value.months} ${value.months === 1 ? "mês" : "meses"}`);
  return parts.join(" e ");
}

export const CTPS_CONFIDENCE_LABEL: Record<CtpsConfidence, string> = {
  HIGH: "Alta",
  MEDIUM: "Média",
  LOW: "Baixa",
};

export const CTPS_STATUS_LABEL: Record<CtpsEmploymentStatus, string> = {
  ACTIVE: "Ativo",
  TERMINATED: "Encerrado",
};

export const CTPS_CONTRACT_LABEL: Record<CtpsContractType, string> = {
  FIXED_TERM: "Prazo determinado",
  INDEFINITE: "Prazo indeterminado",
  UNKNOWN: "Não identificado",
};

export function maskCtpsCpf(value: string | null): string {
  if (!value) return "—";
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 11) return "CPF protegido";
  return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`;
}
