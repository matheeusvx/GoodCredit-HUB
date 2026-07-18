export function normalizeCurrencyInput(value: string): string {
  return value.replace(/[^\d.,R$\s]/g, "");
}

export function parseCurrencyBRL(value: string): number {
  const cleaned = value.replace(/\s/g, "").replace(/R\$/gi, "");
  if (!cleaned) return 0;

  let normalized: string;
  if (cleaned.includes(",")) {
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else {
    const dots = cleaned.match(/\./g)?.length || 0;
    const decimalDot = dots === 1 && /\.\d{1,2}$/.test(cleaned);
    normalized = decimalDot ? cleaned : cleaned.replace(/\./g, "");
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export function formatCurrencyBRL(value: number): string {
  return Math.max(0, Number.isFinite(value) ? value : 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
