import type { MonthlyStatementAnalysis, NormalizedBankTransaction, ReconciliationStatus, StatementFileRecord } from "../../types/statementAnalysis";

export function buildMonthlyAnalysis(transactions: NormalizedBankTransaction[], files: StatementFileRecord[]): MonthlyStatementAnalysis[] {
  const competences = [...new Set(transactions.map((item) => item.competence).filter((value): value is string => Boolean(value)))].sort();
  return competences.map((competence) => {
    const items = transactions.filter((item) => item.competence === competence && item.classification !== "EXCLUDED_DUPLICATE"); const credits = items.filter((item) => item.direction === "CREDIT"); const debits = items.filter((item) => item.direction === "DEBIT");
    const included = credits.filter((item) => item.classification === "INCLUDED_INCOME"); const pending = credits.filter((item) => item.classification === "PENDING_REVIEW"); const excluded = credits.filter((item) => !["INCLUDED_INCOME", "PENDING_REVIEW"].includes(item.classification));
    const payerMap = new Map<string, number>(); included.forEach((item) => payerMap.set(item.counterparty || "Não identificado", (payerMap.get(item.counterparty || "Não identificado") || 0) + item.amount));
    const relatedFiles = files.filter((file) => file.transactions.some((item) => item.competence === competence));
    const statuses = relatedFiles.map((file) => file.reconciliation.status); const reconciliationStatus: ReconciliationStatus = statuses.includes("DIVERGENCE") ? "DIVERGENCE" : statuses.includes("SMALL_DIFFERENCE") ? "SMALL_DIFFERENCE" : statuses.length && statuses.every((status) => status === "RECONCILED") ? "RECONCILED" : "NO_SUMMARY";
    const monthEnd = new Date(Date.UTC(Number(competence.slice(0, 4)), Number(competence.slice(5, 7)), 0)).getUTCDate();
    const complete = relatedFiles.some((file) => Boolean(
      file.periodStart && file.periodEnd
      && file.periodStart <= `${competence}-01`
      && file.periodEnd >= `${competence}-${monthEnd}`
    ));
    const sum = (values: NormalizedBankTransaction[]) => values.reduce((total, item) => total + Math.round(item.amount * 100), 0) / 100;
    const confirmedIncome = sum(included); const pendingAmount = sum(pending);
    const financialYield = sum(credits.filter((item) => /rendimento|rend pago aplic|remuneracao aplicacao|rentabilidade/i.test(item.description.normalize("NFD").replace(/[\u0300-\u036f]/g, ""))));
    const details = { creditCount: credits.length, depositTransferCredits: Math.round((sum(credits) - financialYield) * 100) / 100, financialYield, sameOwnerCredits: sum(credits.filter((item) => item.classification === "EXCLUDED_SAME_OWNER")), exceptionalCredits: sum(credits.filter((item) => item.warnings.some((warning) => warning.includes("Crédito excepcional")))) };
    return { ...details, competence, totalCredits: sum(credits), totalDebits: sum(debits), confirmedIncome, potentialIncome: Math.round((confirmedIncome + pendingAmount) * 100) / 100, excludedAmount: sum(excluded), pendingAmount, transactionCount: items.length, payerCount: payerMap.size, topPayers: [...payerMap.entries()].map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total).slice(0, 3), complete, reconciliationStatus };
  });
}
