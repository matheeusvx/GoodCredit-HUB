export function formatCentsBRL(valueCents: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valueCents / 100);
}

export function parseBRLToCents(value: string): number {
  const normalized = value.replace(/R\$/gi, "").replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

export function normalizeCents(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}
