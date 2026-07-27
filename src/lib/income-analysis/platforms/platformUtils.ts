import { normalizeText } from "../formatters";

export const PLATFORM_MONTHS: Record<string, number> = {
  janeiro: 1,
  jan: 1,
  fevereiro: 2,
  fev: 2,
  marco: 3,
  mar: 3,
  abril: 4,
  abr: 4,
  maio: 5,
  mai: 5,
  junho: 6,
  jun: 6,
  julho: 7,
  jul: 7,
  agosto: 8,
  ago: 8,
  setembro: 9,
  set: 9,
  outubro: 10,
  out: 10,
  novembro: 11,
  nov: 11,
  dezembro: 12,
  dez: 12,
};

export function normalizePlatformText(value: string): string {
  return normalizeText(value).replace(/\s+/g, " ").trim();
}

export function normalizeCpf(value: string | null): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  return digits.length === 11 ? digits : null;
}

export function maskCpf(value: string | null): string {
  return value ? "***.***.***-**" : "Não identificado";
}

export function maskHolderName(value: string | null): string {
  if (!value) return "Não identificado";
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => `${part[0]}${"*".repeat(Math.min(6, Math.max(2, part.length - 1)))}`)
    .join(" ");
}

export function holderIdentityKey(
  holderCpf: string | null,
  holderName: string | null
): string {
  const cpf = normalizeCpf(holderCpf);
  if (cpf) return `cpf:${cpf}`;
  return `name:${normalizePlatformText(holderName || "")}`;
}

export function competenceIndex(competence: string): number {
  const match = competence.match(/^(\d{4})-(\d{2})$/);
  return match ? Number(match[1]) * 12 + Number(match[2]) - 1 : 0;
}

export function parsePlatformMoney(value: string): number | null {
  const normalized = value
    .replace(/R\$/gi, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}
