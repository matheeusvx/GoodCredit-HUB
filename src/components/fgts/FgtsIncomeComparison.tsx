import { formatCurrencyBR, formatPercentBR } from "../../lib/financial";
import type { FgtsIncomeForm, FgtsIncomeResult } from "../../types/fgts";

function formatCompetence(value: string): string {
  if (!/^\d{4}-\d{2}$/.test(value)) return "Não informada";
  const [year, month] = value.split("-");
  return `${month}/${year}`;
}

export function FgtsIncomeComparison({ form, result }: { form: FgtsIncomeForm; result: FgtsIncomeResult }) {
  const facts = [
    ["Valor bruto do holerite", formatCurrencyBR(form.payslipGross)],
    ["Depósito mensal do FGTS", formatCurrencyBR(form.monthlyDeposit)],
    ["Percentual utilizado", form.contributionRate > 0 ? formatPercentBR(form.contributionRate) : "Não confirmado"],
    ["Renda estimada pelo FGTS", formatCurrencyBR(result.estimatedIncome)],
    ["Diferença em reais", formatCurrencyBR(Math.abs(result.differenceAmount))],
    ["Diferença percentual", result.differencePercent === null ? "Não calculada" : formatPercentBR(Math.abs(result.differencePercent))],
    ["Maior valor identificado", formatCurrencyBR(result.highestIncome)],
    ["Valor considerado", formatCurrencyBR(result.consideredIncome)],
    ["Competência do holerite", formatCompetence(form.payslipCompetence)],
    ["Competência do depósito do FGTS", formatCompetence(form.depositCompetence)],
  ];
  const statusTone = result.status === "COMPETENCES_CONFIRMED" ? "bg-emerald-100 text-emerald-800" : result.status === "COMPETENCES_DIVERGENT" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800";
  const optionTone = result.status === "COMPETENCES_CONFIRMED" ? "border-emerald-300 bg-emerald-50 text-emerald-950" : "border-amber-300 bg-amber-50 text-amber-950";
  const instruction = result.status === "COMPETENCES_DIVERGENT" ? "Não selecione a opção com base nesta comparação até corrigir as competências." : result.status === "REVIEW_REQUIRED" ? "Revise o depósito antes de utilizar esta recomendação." : result.status !== "COMPETENCES_CONFIRMED" ? "Conclua as validações antes de selecionar uma opção." : result.recommendedOption === "FGTS" ? "Selecione FGTS no Caixa Aqui." : result.recommendedOption === "PAYSLIP" ? "Selecione Contracheque/Holerite no Caixa Aqui." : "Os valores são equivalentes. Realize a escolha conforme a orientação operacional do processo.";

  return <section className="mt-6 border-t border-slate-200 pt-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-bold text-slate-950">Resultado da Comparação de Renda</h3><p className="mt-1 text-sm text-slate-500">Conferência operacional para definição da opção no Caixa Aqui.</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${statusTone}`}>{result.statusLabel}</span></div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{facts.map(([label, value]) => <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-1 font-bold text-slate-950">{value}</p></div>)}</div>
    <div className={`mt-4 rounded-lg border p-5 ${optionTone}`}><p className="text-xs font-bold uppercase text-current">Opção a selecionar no Caixa Aqui</p><p className="mt-2 text-xl font-bold">{result.recommendedOptionLabel}</p><p className="mt-2 text-sm font-medium">{instruction}</p></div>
    <p className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900">Para o cadastro no Caixa Aqui, selecione a opção correspondente ao maior valor identificado entre a renda estimada pelo FGTS e o valor bruto do contracheque/holerite.</p>
    {result.warnings.map((warning) => <p key={warning} className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{warning}</p>)}
  </section>;
}
