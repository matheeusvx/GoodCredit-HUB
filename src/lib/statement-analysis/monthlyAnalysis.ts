import type { MonthlyStatementAnalysis, NormalizedBankTransaction, ReconciliationStatus, StatementFileRecord } from "../../types/statementAnalysis";

export function buildMonthlyAnalysis(transactions: NormalizedBankTransaction[], files: StatementFileRecord[]): MonthlyStatementAnalysis[] {
  const competences = [...new Set(transactions.map((item) => item.competence).filter((value): value is string => Boolean(value)))].sort();
  return competences.map((competence, index) => {
    const items = transactions.filter((item) => item.competence === competence); const credits = items.filter((item) => item.direction === "CREDIT"); const debits = items.filter((item) => item.direction === "DEBIT");
    const included = credits.filter((item) => item.classification === "INCLUDED_INCOME"); const pending = credits.filter((item) => item.classification === "PENDING_REVIEW"); const excluded = credits.filter((item) => !["INCLUDED_INCOME", "PENDING_REVIEW"].includes(item.classification));
    const payerMap = new Map<string, number>(); included.forEach((item) => payerMap.set(item.counterparty || "Não identificado", (payerMap.get(item.counterparty || "Não identificado") || 0) + item.amount));
    const relatedFiles = files.filter((file) => file.transactions.some((item) => item.competence === competence));
    const statuses = relatedFiles.map((file) => file.reconciliation.status); const reconciliationStatus: ReconciliationStatus = statuses.includes("DIVERGENCE") ? "DIVERGENCE" : statuses.includes("SMALL_DIFFERENCE") ? "SMALL_DIFFERENCE" : statuses.length && statuses.every((status) => status === "RECONCILED") ? "RECONCILED" : "NO_SUMMARY";
    const complete = competences.length > 2 ? index > 0 && index < competences.length - 1 : true;
    const confirmedIncome = included.reduce((sum, item) => sum + item.amount, 0); const pendingAmount = pending.reduce((sum, item) => sum + item.amount, 0);
    return { competence, totalCredits: credits.reduce((sum, item) => sum + item.amount, 0), totalDebits: debits.reduce((sum, item) => sum + item.amount, 0), confirmedIncome, potentialIncome: confirmedIncome + pendingAmount, excludedAmount: excluded.reduce((sum, item) => sum + item.amount, 0), pendingAmount, transactionCount: items.length, payerCount: payerMap.size, topPayers: [...payerMap.entries()].map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total).slice(0, 3), complete, reconciliationStatus };
  });
}
