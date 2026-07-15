export interface ParsedPdfDate {
  date: string | null;
  raw: string;
  endIndex: number;
  warning?: string;
}

function validIso(year: number, month: number, day: number): string | null {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

export function parsePdfDate(text: string, fallbackYear?: number): ParsedPdfDate | null {
  const trimmed = text.trimStart();
  const offset = text.length - trimmed.length;
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})\b/);
  if (iso) return { date: validIso(Number(iso[1]), Number(iso[2]), Number(iso[3])), raw: iso[0], endIndex: offset + iso[0].length };
  const full = trimmed.match(/^(\d{2})[/-](\d{2})[/-](\d{2}|\d{4})\b/);
  if (full) {
    const year = full[3].length === 2 ? 2000 + Number(full[3]) : Number(full[3]);
    return { date: validIso(year, Number(full[2]), Number(full[1])), raw: full[0], endIndex: offset + full[0].length };
  }
  const partial = trimmed.match(/^(\d{2})[/-](\d{2})(?![/-]\d)/);
  if (!partial) return null;
  if (!fallbackYear) return { date: null, raw: partial[0], endIndex: offset + partial[0].length, warning: "Ano não identificado; informe o ano na revisão." };
  return { date: validIso(fallbackYear, Number(partial[2]), Number(partial[1])), raw: partial[0], endIndex: offset + partial[0].length, warning: "Ano inferido a partir do período da análise." };
}

export function findStatementYear(text: string): number | undefined {
  const years = [...text.matchAll(/\b(20\d{2})\b/g)].map((match) => Number(match[1]));
  return years.find((year) => year >= 2000 && year <= new Date().getFullYear() + 1);
}
