import { formatCurrencyBR, parseNumberBR } from "../financial";
export { formatCurrencyBR, parseNumberBR };

export function normalizeText(value: string): string { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim(); }
export function maskAccount(value: string): string { const digits = value.replace(/\D/g, ""); return digits ? `****${digits.slice(-4)}` : value.slice(0, 12); }
export function normalizeDate(value: string): string {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/^(\d{2})[\/-](\d{2})[\/-](\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : "";
}
export function competenceFromDate(date: string): string { return /^\d{4}-\d{2}/.test(date) ? date.slice(0, 7) : ""; }
export function formatCompetence(value: string): string { if (!/^\d{4}-\d{2}$/.test(value)) return value || "—"; const [year, month] = value.split("-"); return `${month}/${year}`; }
