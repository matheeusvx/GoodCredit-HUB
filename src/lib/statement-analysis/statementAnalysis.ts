import type { AutomatedIncomeResult, NormalizedBankTransaction, NormalizedTransactionClassification, StatementFileRecord } from "../../types/statementAnalysis";
import type { PlatformIncomeResult } from "../../types/platformIncome";
import { formatCompetence, formatCurrencyBR } from "../income-analysis/formatters";
import { buildMonthlyAnalysis } from "./monthlyAnalysis";
import { analyzePayerConcentration } from "./payerConcentration";
import { buildClassificationExplanation } from "./presentationLabels";
import { analyzeStability, median } from "./stabilityAnalyzer";

function calculatePlatformAutomatedIncome(
  clientName: string,
  files: StatementFileRecord[],
  platformResult: PlatformIncomeResult
): AutomatedIncomeResult {
  const months = platformResult.selectedDocuments
    .filter((document) => document.competence && document.grossIncome !== null)
    .map((document) => ({
      competence: document.competence!,
      totalCredits: document.grossIncome!,
      totalDebits: 0,
      confirmedIncome: document.grossIncome!,
      potentialIncome: document.grossIncome!,
      excludedAmount: 0,
      pendingAmount: 0,
      transactionCount: 0,
      payerCount: 0,
      topPayers: [],
      complete: true,
      reconciliationStatus: "NO_SUMMARY" as const,
    }))
    .sort((left, right) => left.competence.localeCompare(right.competence));
  const grossValues = months.map((month) => month.confirmedIncome);
  const consideredIncome = platformResult.consideredGrossIncome || 0;
  const explanation = [
    `Foram analisados os ${platformResult.selectedDocuments.length} comprovantes mensais mais recentes da ${platformResult.platform}.`,
    ...months.map(
      (month) =>
        `${formatCompetence(month.competence)}: renda bruta de ${formatCurrencyBR(month.confirmedIncome)}.`
    ),
    platformResult.determiningCompetence && consideredIncome > 0
      ? `${formatCompetence(platformResult.determiningCompetence)} determinou a renda considerada de ${formatCurrencyBR(consideredIncome)}.`
      : "A renda considerada ainda não pôde ser definida.",
    `Conforme a regra aplicável, a renda considerada corresponde ao menor valor bruto entre as competências apresentadas. ${platformResult.method}`,
    ...platformResult.ignoredDocuments
      .filter((document) => document.documentPeriod === "ANNUAL")
      .map(() => "O resumo anual foi reconhecido, mas não substitui os comprovantes mensais e não foi dividido por 12."),
    ...platformResult.warnings,
  ];

  return {
    clientName,
    transactions: [],
    files,
    months,
    confirmedIncomeTotal: consideredIncome,
    potentialIncomeTotal: consideredIncome,
    confirmedMonthlyIncome: consideredIncome,
    potentialMonthlyIncome: consideredIncome,
    medianIncome: median(grossValues),
    totalCredits: 0,
    totalDebits: 0,
    totalExcluded: 0,
    totalPending: 0,
    completeMonths: months.length,
    incompleteMonths: 0,
    stability: "INSUFFICIENT",
    stabilityLabel: "Regra do menor valor bruto",
    payerConcentration: [],
    topPayerShare: 0,
    topThreePayerShare: 0,
    extractionConfidence: platformResult.selectedDocuments.length
      ? platformResult.selectedDocuments.reduce(
        (sum, document) => sum + document.documentConfidence,
        0
      ) / platformResult.selectedDocuments.length
      : 0,
    classificationConfidence: platformResult.status === "COMPLETE" ? 1 : 0,
    reconciliationStatus: "NO_SUMMARY",
    explanation,
    generatedAt: new Date().toISOString(),
    analysisType: "PLATFORM_INCOME",
    platformIncomeResult: platformResult,
    canSendToSimulation: platformResult.canSendToSimulation,
  };
}

export function calculateAutomatedIncome(
  clientName: string,
  files: StatementFileRecord[],
  transactions: NormalizedBankTransaction[],
  platformResult: PlatformIncomeResult | null = null
): AutomatedIncomeResult {
  if (platformResult) {
    return calculatePlatformAutomatedIncome(clientName, files, platformResult);
  }
  const months = buildMonthlyAnalysis(transactions, files);
  const complete = months.filter((month) => month.complete);
  const divisor = Math.max(1, complete.length || months.length);
  const confirmedIncomeTotal = complete.reduce((sum, item) => sum + item.confirmedIncome, 0);
  const potentialIncomeTotal = complete.reduce((sum, item) => sum + item.potentialIncome, 0);
  const concentration = analyzePayerConcentration(transactions);
  const stability = analyzeStability(months, concentration);
  const extractionConfidence = transactions.length ? transactions.reduce((sum, item) => sum + item.extractionConfidence, 0) / transactions.length : 0;
  const classificationConfidence = transactions.length ? transactions.reduce((sum, item) => sum + item.classificationConfidence, 0) / transactions.length : 0;
  const reconciliationStatus = !transactions.length ? "NO_SUMMARY" : files.some((file) => file.reconciliation.status === "DIVERGENCE") ? "DIVERGENCE" : files.some((file) => file.reconciliation.status === "SMALL_DIFFERENCE") ? "SMALL_DIFFERENCE" : files.length && files.every((file) => file.reconciliation.status === "RECONCILED") ? "RECONCILED" : "NO_SUMMARY";
  const credits = transactions.filter((item) => item.direction === "CREDIT");
  const included = credits.filter((item) => item.classification === "INCLUDED_INCOME");
  const pending = credits.filter((item) => item.classification === "PENDING_REVIEW");
  const excludedGroups = new Map<NormalizedTransactionClassification, number>();
  credits.filter((item) => !["INCLUDED_INCOME", "PENDING_REVIEW"].includes(item.classification)).forEach((item) => excludedGroups.set(item.classification, (excludedGroups.get(item.classification) || 0) + 1));
  const analyzedMonths = complete.length || months.length;
  const explanation = [
    ...(!transactions.length ? ["Análise incompleta: nenhuma movimentação foi extraída."] : []),
    credits.length === 1 ? "Foi identificada 1 entrada bancária." : `Foram identificadas ${credits.length} entradas bancárias.`,
    buildClassificationExplanation("INCLUDED_INCOME", included.length),
    ...[...excludedGroups.entries()].map(([classification, count]) => buildClassificationExplanation(classification, count)),
    buildClassificationExplanation("PENDING_REVIEW", pending.length),
    `A média utiliza ${analyzedMonths} ${analyzedMonths === 1 ? "competência" : "competências"} ${complete.length ? (analyzedMonths === 1 ? "completa" : "completas") : (analyzedMonths === 1 ? "disponível" : "disponíveis")}.`,
  ];
  return { clientName, transactions, files, months, confirmedIncomeTotal, potentialIncomeTotal, confirmedMonthlyIncome: confirmedIncomeTotal / divisor, potentialMonthlyIncome: potentialIncomeTotal / divisor, medianIncome: median(complete.map((item) => item.confirmedIncome)), totalCredits: credits.reduce((sum, item) => sum + item.amount, 0), totalDebits: transactions.filter((item) => item.direction === "DEBIT").reduce((sum, item) => sum + item.amount, 0), totalExcluded: credits.filter((item) => !["INCLUDED_INCOME", "PENDING_REVIEW"].includes(item.classification)).reduce((sum, item) => sum + item.amount, 0), totalPending: pending.reduce((sum, item) => sum + item.amount, 0), completeMonths: complete.length, incompleteMonths: months.length - complete.length, ...stability, payerConcentration: concentration, topPayerShare: concentration[0]?.share || 0, topThreePayerShare: concentration.slice(0, 3).reduce((sum, item) => sum + item.share, 0), extractionConfidence, classificationConfidence, reconciliationStatus, explanation, generatedAt: new Date().toISOString(), analysisType: "BANK_STATEMENT", platformIncomeResult: null, canSendToSimulation: confirmedIncomeTotal > 0 };
}
