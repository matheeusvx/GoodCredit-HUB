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

export function formatCpf(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

export function isValidCpf(value: string): boolean {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  const calcDigit = (base: string, factor: number) => {
    const total = base.split("").reduce((sum, digit) => sum + Number(digit) * factor--, 0);
    const rest = (total * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return calcDigit(cpf.slice(0, 9), 10) === Number(cpf[9]) && calcDigit(cpf.slice(0, 10), 11) === Number(cpf[10]);
}

export function formatPhone(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 10) {
    return digits.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  }
  return digits.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
}
