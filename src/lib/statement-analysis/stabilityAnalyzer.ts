import type { AutomatedIncomeResult, MonthlyStatementAnalysis, PayerConcentrationResult } from "../../types/statementAnalysis";

export function median(values: number[]) { if (!values.length) return 0; const sorted = [...values].sort((a, b) => a - b); const middle = Math.floor(sorted.length / 2); return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2; }
export function analyzeStability(months: MonthlyStatementAnalysis[], concentration: PayerConcentrationResult[]): Pick<AutomatedIncomeResult, "stability" | "stabilityLabel"> {
  const complete = months.filter((month) => month.complete); if (complete.length < 2) return { stability: "INSUFFICIENT", stabilityLabel: "Dados insuficientes" };
  const values = complete.map((month) => month.confirmedIncome); const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const deviation = Math.sqrt(values.reduce((sum, value) => sum + Math.pow(value - average, 2), 0) / values.length); const coefficient = average ? deviation / average : 1; const topShare = concentration[0]?.share || 0;
  if (coefficient <= 0.2 && topShare <= 0.7) return { stability: "HIGH", stabilityLabel: "Alta estabilidade" };
  if (coefficient <= 0.45) return { stability: "MODERATE", stabilityLabel: "Estabilidade moderada" };
  return { stability: "ELEVATED", stabilityLabel: "Alta oscilação" };
}
