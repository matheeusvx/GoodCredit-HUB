import type { NormalizedBankTransaction, PayerConcentrationResult } from "../../types/statementAnalysis";

export function analyzePayerConcentration(transactions: NormalizedBankTransaction[]): PayerConcentrationResult[] {
  const included = transactions.filter((item) => item.classification === "INCLUDED_INCOME"); const total = included.reduce((sum, item) => sum + item.amount, 0);
  const groups = new Map<string, NormalizedBankTransaction[]>();
  included.forEach((item) => { const key = item.counterparty || "Origem não identificada"; groups.set(key, [...(groups.get(key) || []), item]); });
  return [...groups.entries()].map(([payer, items]) => {
    const sum = items.reduce((value, item) => value + item.amount, 0); const average = sum / items.length;
    const variance = items.reduce((value, item) => value + Math.pow(item.amount - average, 2), 0) / items.length;
    return { payer, total: sum, share: total ? sum / total : 0, months: new Set(items.map((item) => item.competence).filter(Boolean)).size, occurrences: items.length, averageTicket: average, variation: average ? Math.sqrt(variance) / average : 0 };
  }).sort((a, b) => b.total - a.total);
}
