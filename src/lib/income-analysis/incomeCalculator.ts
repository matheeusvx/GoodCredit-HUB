import { BankTransaction, IncomeAnalysisForm, IncomeAnalysisResult, MonthlyIncomeSummary } from "../../types/incomeAnalysis";
import { INCOME_ANALYSIS_RULES } from "./incomeRules";
import { analyzePayerRecurrence } from "./recurrenceAnalyzer";

export function listCompetences(start: string, end: string): string[] {
  if (!/^\d{4}-\d{2}$/.test(start) || !/^\d{4}-\d{2}$/.test(end) || end < start) return [];
  const [sy, sm] = start.split("-").map(Number); const [ey, em] = end.split("-").map(Number); const result: string[] = [];
  let year = sy; let month = sm;
  while (year < ey || (year === ey && month <= em)) { result.push(`${year}-${String(month).padStart(2, "0")}`); month += 1; if (month > 12) { month = 1; year += 1; } }
  return result;
}

export function median(values: number[]): number { if (!values.length) return 0; const sorted = [...values].sort((a, b) => a - b); const middle = Math.floor(sorted.length / 2); return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2; }

export function calculateIncomeAnalysis(form: IncomeAnalysisForm, transactions: BankTransaction[]): IncomeAnalysisResult {
  const competences = listCompetences(form.periodStart, form.periodEnd); const credits = transactions.filter((item) => item.type === "CREDIT");
  const months: MonthlyIncomeSummary[] = competences.map((competence) => {
    const entries = credits.filter((item) => item.competence === competence); const excluded = Boolean(form.excludedCompetences[competence]);
    const includedEntries = entries.filter((i) => i.classification === "INCLUDE" && i.reason); const excludedEntries = entries.filter((i) => i.classification === "EXCLUDE" && i.reason); const reviewEntries = entries.filter((i) => i.classification === "REVIEW" || !i.reason);
    const totalEntries = entries.reduce((s, i) => s + i.amount, 0); const totalIncluded = includedEntries.reduce((s, i) => s + i.amount, 0); const totalExcluded = excludedEntries.reduce((s, i) => s + i.amount, 0); const totalReview = reviewEntries.reduce((s, i) => s + i.amount, 0);
    return { competence, label: new Date(`${competence}-01T12:00:00`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" }), totalEntries, totalIncluded: excluded ? 0 : totalIncluded, totalExcluded, totalReview, includedCount: includedEntries.length, excludedCount: excludedEntries.length, status: excluded ? "EXCLUDED" : !entries.length ? "EMPTY" : totalReview > 0 ? "PENDING" : "COMPLETED", exclusionJustification: form.excludedCompetences[competence] };
  });
  const activeMonths = months.filter((month) => month.status !== "EXCLUDED"); const includedValues = activeMonths.map((month) => month.totalIncluded); const totalIncluded = activeMonths.reduce((s, m) => s + m.totalIncluded, 0); const highestMonth = activeMonths.length ? activeMonths.reduce((a, b) => a.totalIncluded >= b.totalIncluded ? a : b) : undefined; const lowestMonth = activeMonths.length ? activeMonths.reduce((a, b) => a.totalIncluded <= b.totalIncluded ? a : b) : undefined; const averageIncome = totalIncluded / Math.max(1, activeMonths.length); const variationPercent = highestMonth && averageIncome > 0 ? (highestMonth.totalIncluded - (lowestMonth?.totalIncluded || 0)) / averageIncome : 0;
  const stability = activeMonths.length < 2 ? "INSUFFICIENT" : variationPercent >= INCOME_ANALYSIS_RULES.highVariationPercent ? "ELEVATED" : variationPercent >= INCOME_ANALYSIS_RULES.moderateVariationPercent ? "MODERATE" : "HIGH";
  const exclusionMap = new Map<string, number>(); credits.filter((i) => i.classification === "EXCLUDE").forEach((i) => exclusionMap.set(i.reason || "OTHER", (exclusionMap.get(i.reason || "OTHER") || 0) + i.amount));
  const totalEntries = activeMonths.reduce((s, m) => s + m.totalEntries, 0); const totalExcluded = activeMonths.reduce((s, m) => s + m.totalExcluded, 0); const totalReview = activeMonths.reduce((s, m) => s + m.totalReview, 0);
  return { months, monthCount: activeMonths.length, totalEntries, totalIncluded, totalExcluded, totalReview, averageIncome, medianIncome: median(includedValues), highestMonth, lowestMonth, variationPercent, stability, stabilityLabel: stability === "HIGH" ? "Estabilidade alta" : stability === "MODERATE" ? "Oscilação moderada" : stability === "ELEVATED" ? "Oscilação elevada" : "Dados insuficientes", includedCount: credits.filter((i) => i.classification === "INCLUDE" && i.reason).length, excludedCount: credits.filter((i) => i.classification === "EXCLUDE" && i.reason).length, pendingCount: credits.filter((i) => i.classification === "REVIEW" || !i.reason).length, consideredPercent: totalEntries > 0 ? totalIncluded / totalEntries : 0, recurrence: analyzePayerRecurrence(credits), exclusionTotals: Array.from(exclusionMap, ([reason, total]) => ({ reason, total })).sort((a, b) => b.total - a.total) };
}
