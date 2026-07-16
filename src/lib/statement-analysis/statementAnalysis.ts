import type { AutomatedIncomeResult, NormalizedBankTransaction, NormalizedTransactionClassification, StatementFileRecord } from "../../types/statementAnalysis";
import { buildMonthlyAnalysis } from "./monthlyAnalysis";
import { analyzePayerConcentration } from "./payerConcentration";
import { buildClassificationExplanation } from "./presentationLabels";
import { analyzeStability, median } from "./stabilityAnalyzer";

export function calculateAutomatedIncome(clientName: string, files: StatementFileRecord[], transactions: NormalizedBankTransaction[]): AutomatedIncomeResult {
  const months = buildMonthlyAnalysis(transactions, files);
  const complete = months.filter((month) => month.complete);
  const divisor = Math.max(1, complete.length || months.length);
  const confirmedIncomeTotal = complete.reduce((sum, item) => sum + item.confirmedIncome, 0);
  const potentialIncomeTotal = complete.reduce((sum, item) => sum + item.potentialIncome, 0);
  const concentration = analyzePayerConcentration(transactions);
  const stability = analyzeStability(months, concentration);
  const extractionConfidence = transactions.length ? transactions.reduce((sum, item) => sum + item.extractionConfidence, 0) / transactions.length : 0;
  const classificationConfidence = transactions.length ? transactions.reduce((sum, item) => sum + item.classificationConfidence, 0) / transactions.length : 0;
  const reconciliationStatus = files.some((file) => file.reconciliation.status === "DIVERGENCE") ? "DIVERGENCE" : files.some((file) => file.reconciliation.status === "SMALL_DIFFERENCE") ? "SMALL_DIFFERENCE" : files.length && files.every((file) => file.reconciliation.status === "RECONCILED") ? "RECONCILED" : "NO_SUMMARY";
  const credits = transactions.filter((item) => item.direction === "CREDIT");
  const included = credits.filter((item) => item.classification === "INCLUDED_INCOME");
  const pending = credits.filter((item) => item.classification === "PENDING_REVIEW");
  const excludedGroups = new Map<NormalizedTransactionClassification, number>();
  credits.filter((item) => !["INCLUDED_INCOME", "PENDING_REVIEW"].includes(item.classification)).forEach((item) => excludedGroups.set(item.classification, (excludedGroups.get(item.classification) || 0) + 1));
  const analyzedMonths = complete.length || months.length;
  const explanation = [
    credits.length === 1 ? "Foi identificada 1 entrada bancária." : `Foram identificadas ${credits.length} entradas bancárias.`,
    buildClassificationExplanation("INCLUDED_INCOME", included.length),
    ...[...excludedGroups.entries()].map(([classification, count]) => buildClassificationExplanation(classification, count)),
    buildClassificationExplanation("PENDING_REVIEW", pending.length),
    `A média utiliza ${analyzedMonths} ${analyzedMonths === 1 ? "competência" : "competências"} ${complete.length ? (analyzedMonths === 1 ? "completa" : "completas") : (analyzedMonths === 1 ? "disponível" : "disponíveis")}.`,
  ];
  return { clientName, transactions, files, months, confirmedIncomeTotal, potentialIncomeTotal, confirmedMonthlyIncome: confirmedIncomeTotal / divisor, potentialMonthlyIncome: potentialIncomeTotal / divisor, medianIncome: median(complete.map((item) => item.confirmedIncome)), totalCredits: credits.reduce((sum, item) => sum + item.amount, 0), totalDebits: transactions.filter((item) => item.direction === "DEBIT").reduce((sum, item) => sum + item.amount, 0), totalExcluded: credits.filter((item) => !["INCLUDED_INCOME", "PENDING_REVIEW"].includes(item.classification)).reduce((sum, item) => sum + item.amount, 0), totalPending: pending.reduce((sum, item) => sum + item.amount, 0), completeMonths: complete.length, incompleteMonths: months.length - complete.length, ...stability, payerConcentration: concentration, topPayerShare: concentration[0]?.share || 0, topThreePayerShare: concentration.slice(0, 3).reduce((sum, item) => sum + item.share, 0), extractionConfidence, classificationConfidence, reconciliationStatus, explanation, generatedAt: new Date().toISOString() };
}
