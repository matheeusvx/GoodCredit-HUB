import { useEffect, useRef, useState } from "react";
import { FGTS_RULES } from "../../lib/fgts/fgtsRules";
import type { FgtsEmploymentType, FgtsIncomeForm, FgtsIncomeResult } from "../../types/fgts";
import { FgtsCurrencyInput } from "./FgtsCurrencyInput";
import { FgtsIncomeComparison } from "./FgtsIncomeComparison";

interface Props { form: FgtsIncomeForm; result: FgtsIncomeResult; onChange: (form: FgtsIncomeForm) => void; }
const inputClass = "h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium outline-none focus:border-goodgreen-500 focus:ring-4 focus:ring-goodgreen-500/10";

export function FgtsIncomeEstimator({ form, result, onChange }: Props) {
  const rateFocused = useRef(false);
  const [rateInput, setRateInput] = useState(() => (form.contributionRate * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 }));
  useEffect(() => { if (!rateFocused.current) setRateInput((form.contributionRate * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })); }, [form.contributionRate]);

  function employmentChange(value: FgtsEmploymentType) {
    const contributionRate = value === "REGULAR" ? FGTS_RULES.standardEmployeeRate : value === "APPRENTICE" ? FGTS_RULES.apprenticeRate : value === "UNKNOWN" ? 0 : form.contributionRate;
    onChange({ ...form, employmentType: value, contributionRate, rateConfirmed: value !== "UNKNOWN" && form.rateConfirmed });
  }

  const checks: Array<[keyof FgtsIncomeForm, string]> = [
    ["regularMonthlyDeposit", "O depósito corresponde a uma competência mensal regular?"],
    ["sameCompetence", "O depósito corresponde ao mesmo mês do holerite?"],
    ["notThirteenthSalary", "O lançamento não corresponde ao 13º salário?"],
    ["notVacationPayment", "O lançamento não corresponde a férias?"],
    ["notRetroactiveAdjustment", "O lançamento não corresponde a ajuste retroativo?"],
    ["notAccumulatedPayment", "O lançamento não corresponde a recolhimento acumulado?"],
    ["rateConfirmed", "O contrato está sujeito ao percentual informado?"],
  ];

  return <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <h2 className="text-xl font-bold">Estimativa de Renda pelo Depósito do FGTS</h2>
    <p className="mt-1 text-sm text-slate-500">Compare o valor bruto do holerite com a renda estimada pelo recolhimento da mesma competência.</p>
    <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <label className="flex flex-col text-sm font-semibold">
        <span className="min-h-[42px]">
          <span className="block">Competência do holerite</span>
          <span className="mt-1 block text-xs font-normal text-slate-500">Formato MM/AAAA</span>
        </span>
        <input type="month" className={`${inputClass} mt-2`} value={form.payslipCompetence} onChange={(event) => onChange({ ...form, payslipCompetence: event.target.value })} />
      </label>
      <label className="flex flex-col text-sm font-semibold">
        <span className="min-h-[42px]">
          <span className="block">Valor bruto do holerite</span>
          <span aria-hidden="true" className="invisible mt-1 block text-xs font-normal">Formato MM/AAAA</span>
        </span>
        <FgtsCurrencyInput ariaLabel="Valor bruto do holerite" className={`${inputClass} mt-2`} value={form.payslipGross} onValueChange={(payslipGross) => onChange({ ...form, payslipGross })} placeholder="R$ 4.800,00" />
      </label>
      <label className="flex flex-col text-sm font-semibold">
        <span className="min-h-[42px]">
          <span className="block">Competência do depósito do FGTS</span>
          <span className="mt-1 block text-xs font-normal text-slate-500">Formato MM/AAAA</span>
        </span>
        <input type="month" className={`${inputClass} mt-2`} value={form.depositCompetence} onChange={(event) => onChange({ ...form, depositCompetence: event.target.value })} />
      </label>
      <label className="flex flex-col text-sm font-semibold">
        <span className="min-h-[42px]">
          <span className="block">Depósito mensal do FGTS</span>
          <span aria-hidden="true" className="invisible mt-1 block text-xs font-normal">Formato MM/AAAA</span>
        </span>
        <FgtsCurrencyInput ariaLabel="Depósito mensal do FGTS" className={`${inputClass} mt-2`} value={form.monthlyDeposit} onValueChange={(monthlyDeposit) => onChange({ ...form, monthlyDeposit })} placeholder="R$ 400,00" />
      </label>
      <label className="text-sm font-semibold md:col-span-2">Tipo de vínculo<select className={`${inputClass} mt-2`} value={form.employmentType} onChange={(event) => employmentChange(event.target.value as FgtsEmploymentType)}><option value="REGULAR">Empregado CLT com recolhimento regular de 8%</option><option value="APPRENTICE">Menor aprendiz — 2%</option><option value="OTHER">Outro percentual</option><option value="UNKNOWN">Não sei</option></select></label>
      <label className="text-sm font-semibold">Percentual de recolhimento<input type="text" inputMode="decimal" className={`${inputClass} mt-2 disabled:bg-slate-100 disabled:text-slate-500`} disabled={form.employmentType !== "OTHER"} value={rateInput} onFocus={() => { rateFocused.current = true; }} onChange={(event) => { const next = event.target.value.replace(/[^\d,.]/g, ""); setRateInput(next); const parsed = Number(next.replace(",", ".")); onChange({ ...form, contributionRate: Number.isFinite(parsed) && parsed > 0 && parsed <= 100 ? parsed / 100 : 0 }); }} onBlur={() => { rateFocused.current = false; setRateInput((form.contributionRate * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })); }} /></label>
      <div className="flex min-h-12 items-center rounded-lg border border-blue-200 bg-blue-50 px-4 text-sm text-blue-800"><strong>Regra aplicada:</strong>&nbsp;o maior valor válido será considerado.</div>
    </div>
    {form.employmentType === "UNKNOWN" && <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Confirme o percentual de recolhimento antes de utilizar a estimativa.</p>}
    <div className="mt-5 grid gap-3 md:grid-cols-2">{checks.map(([key, label]) => <label key={key} className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 text-sm text-slate-700"><input type="checkbox" className="mt-0.5 h-4 w-4 accent-goodgreen-600" checked={Boolean(form[key])} onChange={(event) => onChange({ ...form, [key]: event.target.checked })} />{label}</label>)}</div>
    <FgtsIncomeComparison form={form} result={result} />
    <p className="mt-5 text-xs leading-5 text-slate-500">A estimativa pelo depósito de FGTS é válida apenas como apoio à conferência. Depósitos relativos a 13º salário, férias, regularizações, diferenças retroativas, competências acumuladas ou alíquotas diferentes devem ser analisados individualmente.</p>
  </section>;
}
