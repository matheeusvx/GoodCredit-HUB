import { FgtsIncomeForm, FgtsIncomeResult } from "../../types/fgts";

const CRITERIA = { PAYSLIP: "Valor do holerite", FGTS_ESTIMATE: "Renda estimada pelo FGTS", HIGHEST: "Maior valor (critério interno GoodCredit)", MANUAL: "Valor informado manualmente" } as const;

export function estimateIncomeFromFgts(form: FgtsIncomeForm): FgtsIncomeResult {
  const rate = Math.max(0, form.contributionRate);
  const estimatedIncome = rate > 0 ? Math.max(0, form.monthlyDeposit) / rate : 0;
  const payslip = Math.max(0, form.payslipGross);
  const highestIncome = Math.max(payslip, estimatedIncome);
  const consideredIncome = form.criterion === "PAYSLIP" ? payslip : form.criterion === "FGTS_ESTIMATE" ? estimatedIncome : form.criterion === "MANUAL" ? Math.max(0, form.manualIncome) : highestIncome;
  const differenceAmount = estimatedIncome - payslip;
  const differencePercent = payslip > 0 ? differenceAmount / payslip : 0;
  const checks = [form.regularMonthlyDeposit, form.sameCompetence, form.notThirteenthSalary, form.notAtypicalPayment, form.rateConfirmed];
  const alerts: string[] = [];
  if (checks.some((value) => !value)) alerts.push("O depósito informado pode não representar uma competência mensal regular. O resultado deverá ser revisado manualmente.");
  if (form.criterion === "HIGHEST") alerts.push("Critério interno GoodCredit — sujeito à conferência documental e à análise bancária.");
  const status = checks.some((value) => !value) ? "REVIEW_REQUIRED" : differenceAmount === 0 ? "COHERENT" : "DIVERGENT";
  return { estimatedIncome, consideredIncome, differenceAmount, differencePercent, highestIncome, status, statusLabel: status === "REVIEW_REQUIRED" ? "Estimativa sujeita à revisão" : status === "COHERENT" ? "Coerente" : "Divergente", criterionLabel: CRITERIA[form.criterion], alerts };
}
