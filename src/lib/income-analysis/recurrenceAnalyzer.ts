import { BankTransaction, PayerRecurrence } from "../../types/incomeAnalysis";

export function analyzePayerRecurrence(transactions: BankTransaction[]): PayerRecurrence[] {
  const grouped = new Map<string, { total: number; occurrences: number; months: Set<string> }>();
  transactions.filter((item) => item.type === "CREDIT" && item.classification === "INCLUDE" && item.reason).forEach((item) => {
    const payer = item.payer.trim() || item.description.trim() || "Origem não identificada";
    const current = grouped.get(payer) || { total: 0, occurrences: 0, months: new Set<string>() };
    current.total += item.amount; current.occurrences += 1; current.months.add(item.competence); grouped.set(payer, current);
  });
  return Array.from(grouped, ([payer, value]) => ({ payer, months: value.months.size, total: value.total, average: value.total / Math.max(1, value.months.size), occurrences: value.occurrences })).sort((a, b) => b.total - a.total);
}
