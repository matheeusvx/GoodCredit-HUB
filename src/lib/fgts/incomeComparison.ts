import type { CaixaAquiIncomeOption, FgtsIncomeForm, FgtsIncomeResult } from "../../types/fgts";

const COMPETENCE_WARNING = "O holerite e o depósito do FGTS precisam corresponder ao mesmo mês e ano. Verifique as competências antes de utilizar o resultado.";
const ATYPICAL_WARNING = "O depósito informado pode não representar uma competência mensal regular. Revise o lançamento antes de utilizar o resultado no Caixa Aqui.";

export function calculateFgtsEstimatedIncome(deposit: number, contributionRate: number): number {
  if (!Number.isFinite(deposit) || deposit < 0 || !Number.isFinite(contributionRate) || contributionRate <= 0 || contributionRate > 1) return 0;
  return deposit / contributionRate;
}

export function validateCompetenceMatch(payslipCompetence: string, depositCompetence: string): boolean {
  return Boolean(payslipCompetence && depositCompetence && payslipCompetence === depositCompetence);
}

export function getCaixaAquiRecommendedOption(payslipIncome: number, estimatedFgtsIncome: number): Exclude<CaixaAquiIncomeOption, "PENDING_VALIDATION"> {
  if (estimatedFgtsIncome > payslipIncome) return "FGTS";
  if (payslipIncome > estimatedFgtsIncome) return "PAYSLIP";
  return "EQUIVALENT";
}

export function getCaixaAquiOptionLabel(option: CaixaAquiIncomeOption): string {
  if (option === "FGTS") return "FGTS";
  if (option === "PAYSLIP") return "Contracheque/Holerite";
  if (option === "EQUIVALENT") return "Valores equivalentes — revisão operacional";
  return "Aguardando validação";
}

export function getFgtsIncomeAnalysisStatus(params: { competenceMatches: boolean; competencesFilled: boolean; validRate: boolean; requiresReview: boolean }): FgtsIncomeResult["status"] {
  if (params.competencesFilled && !params.competenceMatches) return "COMPETENCES_DIVERGENT";
  if (!params.competencesFilled || !params.validRate) return "PENDING_VALIDATION";
  if (params.requiresReview) return "REVIEW_REQUIRED";
  return "COMPETENCES_CONFIRMED";
}

export function compareIncomeSources(form: FgtsIncomeForm): FgtsIncomeResult {
  const payslipIncome = Math.max(0, form.payslipGross || 0);
  const fgtsDeposit = Math.max(0, form.monthlyDeposit || 0);
  const validRate = form.employmentType !== "UNKNOWN" && form.contributionRate > 0 && form.contributionRate <= 1;
  const estimatedIncome = calculateFgtsEstimatedIncome(fgtsDeposit, validRate ? form.contributionRate : 0);
  const highestIncome = Math.max(payslipIncome, estimatedIncome);
  const differenceAmount = estimatedIncome - payslipIncome;
  const differencePercent = payslipIncome > 0 ? differenceAmount / payslipIncome : null;
  const competenceMatches = validateCompetenceMatch(form.payslipCompetence, form.depositCompetence);
  const competencesFilled = Boolean(form.payslipCompetence && form.depositCompetence);
  const regularDeposit = form.regularMonthlyDeposit && form.sameCompetence && form.notThirteenthSalary && form.notVacationPayment && form.notRetroactiveAdjustment && form.notAccumulatedPayment && form.rateConfirmed;
  const requiresReview = !regularDeposit || !validRate || !competenceMatches;
  const provisionalOption = getCaixaAquiRecommendedOption(payslipIncome, estimatedIncome);
  const status = getFgtsIncomeAnalysisStatus({ competenceMatches, competencesFilled, validRate, requiresReview: !regularDeposit });
  const recommendedOption: CaixaAquiIncomeOption = status === "COMPETENCES_CONFIRMED" ? provisionalOption : "PENDING_VALIDATION";
  const warnings: string[] = [];

  if (competencesFilled && !competenceMatches) warnings.push(COMPETENCE_WARNING, "Não selecione a opção com base nesta comparação até corrigir as competências.");
  if (!competencesFilled) warnings.push("Informe as competências do holerite e do depósito do FGTS para concluir a conferência.");
  if (!validRate) warnings.push("Confirme um percentual de recolhimento maior que 0% e menor ou igual a 100% para concluir a estimativa.");
  if (!regularDeposit) warnings.push(ATYPICAL_WARNING, "Revise o depósito antes de utilizar esta recomendação.");

  const statusLabel = status === "COMPETENCES_CONFIRMED" ? "Competências conferidas" : status === "COMPETENCES_DIVERGENT" ? "Competências divergentes" : status === "REVIEW_REQUIRED" ? "Estimativa sujeita à revisão" : "Aguardando validação";
  const recommendedOptionLabel = status === "COMPETENCES_DIVERGENT" ? "Aguardando correção das competências" : status === "REVIEW_REQUIRED" ? "Aguardando revisão do depósito" : getCaixaAquiOptionLabel(recommendedOption);

  return {
    estimatedIncome,
    consideredIncome: highestIncome,
    differenceAmount,
    differencePercent,
    highestIncome,
    recommendedOption,
    provisionalOption,
    recommendedOptionLabel,
    higherValueLabel: getCaixaAquiOptionLabel(provisionalOption),
    competenceMatches,
    requiresReview,
    status,
    statusLabel,
    warnings,
  };
}
