import { BankCode, YesNo } from "../../types/simulation";

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function parseNumberBR(value: string): number {
  if (!value) return 0;
  const normalized = value
    .replace(/\s/g, "")
    .replace(/R\$/gi, "")
    .replace(/%/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function normalizeMoneyValue(value: string, label: string): { value: number; log?: string } {
  const parsed = Math.max(0, parseNumberBR(value));
  if (parsed > 0 && parsed < 1000) {
    const normalized = parsed * 1000;
    return {
      value: normalized,
      log: `${label}: ${formatCurrencyBRL(parsed)} foi interpretado como ${formatCurrencyBRL(normalized)}.`
    };
  }
  return { value: parsed };
}

export function formatCurrencyBRL(value: number): string {
  return (Number.isFinite(value) ? value : 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function formatPercentBR(value: number): string {
  return (Number.isFinite(value) ? value : 0).toLocaleString("pt-BR", {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function monthlyRateFromAnnual(taxaAno: number): number {
  return Math.pow(1 + Math.max(0, taxaAno), 1 / 12) - 1;
}

export function normalizeChoice(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

export function normalizeYesNo(value: string): YesNo {
  return normalizeChoice(value).startsWith("S") ? "SIM" : "NAO";
}

export function normalizeBancoCode(value: string): BankCode {
  const normalized = normalizeChoice(value);
  if (normalized.includes("CAIXA")) return "CAIXA";
  if (normalized.includes("INTER")) return "INTER";
  if (normalized.includes("BRADESCO")) return "BRADESCO";
  if (normalized.includes("ITAU")) return "ITAU";
  if (normalized.includes("SANTANDER")) return "SANTANDER";
  return "DESCONHECIDO";
}
