import type { AutomatedIncomeResult, IncomeAnalysisParties, NormalizedBankTransaction, NormalizedTransactionClassification, StatementFileRecord } from "../../types/statementAnalysis";
import type { PlatformIncomeResult } from "../../types/platformIncome";
import { formatCompetence, formatCurrencyBR } from "../income-analysis/formatters";
import { buildMonthlyAnalysis } from "./monthlyAnalysis";
import { analyzePayerConcentration } from "./payerConcentration";
import { buildClassificationExplanation } from "./presentationLabels";
import { analyzeStability, median } from "./stabilityAnalyzer";
import { calculateRelatedPartyExclusions } from "./relatedPartyClassifier";

const EMPTY_PARTIES: IncomeAnalysisParties = { accountHolder: null, spouses: [] };

function cents(value: number): number {
  return Math.round(value * 100);
}

function calculateShopeePayAutomatedIncome(
  clientName: string,
  files: StatementFileRecord[],
  transactions: NormalizedBankTransaction[]
): AutomatedIncomeResult {
  const shopeeTransactions = transactions.filter(
    (transaction) => transaction.parserId === "shopee-pay"
  );
  const includedCredits = shopeeTransactions.filter(
    (transaction) =>
      transaction.direction === "CREDIT"
      && transaction.classification === "INCLUDED_INCOME"
      && transaction.competence
  );
  const competenceTotals = new Map<string, number>();
  includedCredits.forEach((transaction) => {
    const competence = transaction.competence!;
    competenceTotals.set(
      competence,
      (competenceTotals.get(competence) || 0) + cents(transaction.amount)
    );
  });
  const selectedCompetences = [...competenceTotals.keys()]
    .sort((left, right) => right.localeCompare(left))
    .slice(0, 3)
    .sort();
  const months = selectedCompetences.map((competence) => {
    const items = shopeeTransactions.filter(
      (transaction) => transaction.competence === competence
    );
    const credits = items.filter((transaction) => transaction.direction === "CREDIT");
    const debits = items.filter((transaction) => transaction.direction === "DEBIT");
    const confirmedIncome = (competenceTotals.get(competence) || 0) / 100;
    const pendingAmount = credits
      .filter((transaction) => transaction.classification === "PENDING_REVIEW")
      .reduce((sum, transaction) => sum + cents(transaction.amount), 0) / 100;
    const excludedAmount = credits
      .filter((transaction) =>
        !["INCLUDED_INCOME", "PENDING_REVIEW"].includes(transaction.classification)
      )
      .reduce((sum, transaction) => sum + cents(transaction.amount), 0) / 100;
    return {
      competence,
      totalCredits: credits.reduce((sum, transaction) => sum + cents(transaction.amount), 0) / 100,
      totalDebits: debits.reduce((sum, transaction) => sum + cents(transaction.amount), 0) / 100,
      confirmedIncome,
      potentialIncome: confirmedIncome + pendingAmount,
      excludedAmount,
      pendingAmount,
      transactionCount: items.length,
      payerCount: confirmedIncome > 0 ? 1 : 0,
      topPayers: confirmedIncome > 0
        ? [{ name: "ShopeePay", total: confirmedIncome }]
        : [],
      complete: true,
      reconciliationStatus: "NO_SUMMARY" as const,
    };
  });
  const confirmedIncomeCents = months.reduce(
    (sum, month) => sum + cents(month.confirmedIncome),
    0
  );
  const potentialIncomeCents = months.reduce(
    (sum, month) => sum + cents(month.potentialIncome),
    0
  );
  const totalPending = shopeeTransactions
    .filter((transaction) =>
      transaction.direction === "CREDIT"
      && transaction.classification === "PENDING_REVIEW"
    )
    .reduce((sum, transaction) => sum + cents(transaction.amount), 0) / 100;
  const metadataComplete = files
    .filter((file) => file.parserId === "shopee-pay")
    .every((file) =>
      file.status === "COMPLETED"
      && Boolean(file.holderIdentity)
      && Boolean(file.periodStart)
      && Boolean(file.periodEnd)
    );
  const canSendToSimulation = metadataComplete
    && months.length === 3
    && confirmedIncomeCents > 0
    && totalPending === 0;
  const confirmedMonthlyIncome = canSendToSimulation
    ? Math.round(confirmedIncomeCents / months.length) / 100
    : 0;
  const potentialMonthlyIncome = canSendToSimulation
    ? Math.round(potentialIncomeCents / months.length) / 100
    : 0;
  const concentration = analyzePayerConcentration(shopeeTransactions);
  const stability = analyzeStability(months, concentration);
  const explanation = [
    "O documento foi identificado como extrato ShopeePay.",
    "Foram considerados exclusivamente os valores classificados como \"Saldo creditado\".",
    ...months.map((month) =>
      `${formatCompetence(month.competence)}: ${formatCurrencyBR(month.confirmedIncome)}.`
    ),
    `Total analisado: ${formatCurrencyBR(confirmedIncomeCents / 100)}.`,
    canSendToSimulation
      ? `Renda mensal considerada: ${formatCurrencyBR(confirmedMonthlyIncome)}.`
      : "A renda mensal ainda não pôde ser definida: são necessárias três competências válidas e os metadados completos do extrato.",
    "A renda considerada corresponde à média dos créditos mensais provenientes da Shopee no período analisado.",
    "Transferências Pix enviadas não foram consideradas como renda nem subtraídas dos créditos recebidos.",
  ];
  const confidence = shopeeTransactions.length
    ? shopeeTransactions.reduce(
      (sum, transaction) => sum + transaction.extractionConfidence,
      0
    ) / shopeeTransactions.length
    : 0;

  return {
    clientName,
    transactions: shopeeTransactions,
    files,
    months,
    confirmedIncomeTotal: confirmedIncomeCents / 100,
    potentialIncomeTotal: potentialIncomeCents / 100,
    confirmedMonthlyIncome,
    potentialMonthlyIncome,
    medianIncome: median(months.map((month) => month.confirmedIncome)),
    totalCredits: shopeeTransactions
      .filter((transaction) => transaction.direction === "CREDIT")
      .reduce((sum, transaction) => sum + cents(transaction.amount), 0) / 100,
    totalDebits: shopeeTransactions
      .filter((transaction) => transaction.direction === "DEBIT")
      .reduce((sum, transaction) => sum + cents(transaction.amount), 0) / 100,
    totalExcluded: shopeeTransactions
      .filter((transaction) =>
        transaction.direction === "CREDIT"
        && !["INCLUDED_INCOME", "PENDING_REVIEW"].includes(transaction.classification)
      )
      .reduce((sum, transaction) => sum + cents(transaction.amount), 0) / 100,
    totalPending,
    completeMonths: canSendToSimulation ? 3 : months.length,
    incompleteMonths: canSendToSimulation ? 0 : Math.max(0, 3 - months.length),
    ...stability,
    payerConcentration: concentration,
    topPayerShare: concentration[0]?.share || 0,
    topThreePayerShare: concentration.slice(0, 3).reduce(
      (sum, payer) => sum + payer.share,
      0
    ),
    extractionConfidence: confidence,
    classificationConfidence: shopeeTransactions.length
      ? shopeeTransactions.reduce(
        (sum, transaction) => sum + transaction.classificationConfidence,
        0
      ) / shopeeTransactions.length
      : 0,
    reconciliationStatus: "NO_SUMMARY",
    explanation,
    generatedAt: new Date().toISOString(),
    analysisType: "SHOPEE_PAY",
    platformIncomeResult: null,
    canSendToSimulation,
    relatedPartySummary: {
      sameHolderAmount: 0,
      spouseAmount: 0,
      homonymousCompanyAmount: 0,
      reviewAmount: totalPending,
      spouseValidationApplied: false,
    },
  };
}

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
  const consideredIncome = platformResult.consideredGrossIncome ?? 0;
  const totalGrossIncome = grossValues.reduce(
    (sum, value) => sum + Math.round(value * 100),
    0
  ) / 100;
  const incomeRuleExplanation = platformResult.calculationMethod === "FOUR_MONTH_AVERAGE"
    ? platformResult.status === "COMPLETE"
      ? [
        `Total das rendas brutas: ${formatCurrencyBR(totalGrossIncome)}.`,
        `Renda considerada: ${formatCurrencyBR(consideredIncome)}.`,
        "Conforme a regra aplicável, a renda considerada corresponde à média aritmética das quatro rendas brutas.",
      ]
      : ["A renda considerada ainda não pôde ser definida."]
    : [
      platformResult.determiningCompetence && consideredIncome > 0
        ? `${formatCompetence(platformResult.determiningCompetence)} determinou a renda considerada de ${formatCurrencyBR(consideredIncome)}.`
        : "A renda considerada ainda não pôde ser definida.",
      `Conforme a regra aplicável, a renda considerada corresponde ao menor valor bruto entre as competências apresentadas. ${platformResult.method}`,
    ];
  const explanation = [
    `Foram analisados os ${platformResult.selectedDocuments.length} comprovantes mensais mais recentes da ${platformResult.platform}.`,
    ...months.map(
      (month) =>
        `${formatCompetence(month.competence)}: renda bruta de ${formatCurrencyBR(month.confirmedIncome)}.`
    ),
    ...incomeRuleExplanation,
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
    stabilityLabel: platformResult.calculationMethod === "FOUR_MONTH_AVERAGE"
      ? "Média de 4 meses"
      : "Regra do menor valor bruto",
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
    relatedPartySummary: { sameHolderAmount: 0, spouseAmount: 0, homonymousCompanyAmount: 0, reviewAmount: 0, spouseValidationApplied: false },
  };
}

export function calculateAutomatedIncome(
  clientName: string,
  files: StatementFileRecord[],
  transactions: NormalizedBankTransaction[],
  platformResult: PlatformIncomeResult | null = null,
  parties: IncomeAnalysisParties = EMPTY_PARTIES
): AutomatedIncomeResult {
  if (platformResult) {
    return calculatePlatformAutomatedIncome(clientName, files, platformResult);
  }
  if (
    files.some((file) => file.parserId === "shopee-pay")
    && files.every((file) => file.parserId === "shopee-pay")
  ) {
    return calculateShopeePayAutomatedIncome(clientName, files, transactions);
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
  const relatedPartySummary = calculateRelatedPartyExclusions(transactions, parties);
  const explanation = [
    ...(!transactions.length ? ["Análise incompleta: nenhuma movimentação foi extraída."] : []),
    credits.length === 1 ? "Foi identificada 1 entrada bancária." : `Foram identificadas ${credits.length} entradas bancárias.`,
    buildClassificationExplanation("INCLUDED_INCOME", included.length),
    ...[...excludedGroups.entries()].map(([classification, count]) => buildClassificationExplanation(classification, count)),
    buildClassificationExplanation("PENDING_REVIEW", pending.length),
    ...(relatedPartySummary.sameHolderAmount > 0 ? ["Transferências entre contas da mesma titularidade não foram consideradas como renda.", `Mesma titularidade excluída: ${formatCurrencyBR(relatedPartySummary.sameHolderAmount)}.`] : []),
    ...(parties.spouses.length > 0 ? ["Transferências recebidas do cônjuge informado também foram desconsideradas.", `Transferências de cônjuge excluídas: ${formatCurrencyBR(relatedPartySummary.spouseAmount)}.`] : ["Não houve validação de transferências conjugais porque nenhum cônjuge foi informado."]),
    ...(relatedPartySummary.homonymousCompanyAmount > 0 ? ["Créditos originados de pessoa jurídica não foram excluídos apenas pela semelhança entre o nome empresarial e o nome do titular ou do cônjuge.", `Empresas homônimas encaminhadas ao classificador: ${formatCurrencyBR(relatedPartySummary.homonymousCompanyAmount)}.`] : []),
    ...(relatedPartySummary.reviewAmount > 0 ? [`Partes relacionadas com revisão pendente: ${formatCurrencyBR(relatedPartySummary.reviewAmount)}.`] : []),
    `A média utiliza ${analyzedMonths} ${analyzedMonths === 1 ? "competência" : "competências"} ${complete.length ? (analyzedMonths === 1 ? "completa" : "completas") : (analyzedMonths === 1 ? "disponível" : "disponíveis")}.`,
  ];
  return { clientName, transactions, files, months, confirmedIncomeTotal, potentialIncomeTotal, confirmedMonthlyIncome: confirmedIncomeTotal / divisor, potentialMonthlyIncome: potentialIncomeTotal / divisor, medianIncome: median(complete.map((item) => item.confirmedIncome)), totalCredits: credits.reduce((sum, item) => sum + item.amount, 0), totalDebits: transactions.filter((item) => item.direction === "DEBIT").reduce((sum, item) => sum + item.amount, 0), totalExcluded: credits.filter((item) => !["INCLUDED_INCOME", "PENDING_REVIEW"].includes(item.classification)).reduce((sum, item) => sum + item.amount, 0), totalPending: pending.reduce((sum, item) => sum + item.amount, 0), completeMonths: complete.length, incompleteMonths: months.length - complete.length, ...stability, payerConcentration: concentration, topPayerShare: concentration[0]?.share || 0, topThreePayerShare: concentration.slice(0, 3).reduce((sum, item) => sum + item.share, 0), extractionConfidence, classificationConfidence, reconciliationStatus, explanation, generatedAt: new Date().toISOString(), analysisType: "BANK_STATEMENT", platformIncomeResult: null, canSendToSimulation: confirmedIncomeTotal > 0, relatedPartySummary };
}
