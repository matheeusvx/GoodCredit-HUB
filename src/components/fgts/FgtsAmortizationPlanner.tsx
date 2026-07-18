import { CalendarClock, Plus } from "lucide-react";
import { formatCurrencyBR } from "../../lib/financial";
import { FGTS_RULES } from "../../lib/fgts/fgtsRules";
import type { FgtsAmortizationEvent, FgtsProjectionForm, FgtsProjectionResult } from "../../types/fgts";
import { FgtsCurrencyInput } from "./FgtsCurrencyInput";
import { FgtsEventTable } from "./FgtsEventTable";

interface Props { form: FgtsProjectionForm; result: FgtsProjectionResult; events: FgtsAmortizationEvent[]; onFormChange: (form: FgtsProjectionForm) => void; onEventsChange: (events: FgtsAmortizationEvent[]) => void; }
const cls = "mt-2 h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium outline-none focus:border-goodgreen-500 focus:ring-4 focus:ring-goodgreen-500/10";

export function FgtsAmortizationPlanner({ form, result, events, onFormChange, onEventsChange }: Props) {
  const active = events.filter((event) => event.active && event.amount > 0);
  const fixedPeriodicity = FGTS_RULES.minimumAmortizationIntervalMonths;
  function updateForm(patch: Partial<FgtsProjectionForm>) { onFormChange({ ...form, ...patch, periodicityMonths: fixedPeriodicity }); }
  function addEvent() { const last = events[events.length - 1]; const month = (last?.month || Math.max(0, form.firstContributionMonth - fixedPeriodicity)) + fixedPeriodicity; onEventsChange([...events, { id: `manual-${Date.now()}`, eventNumber: events.length + 1, month, estimatedDate: "", availableBalance: 0, amount: 0, remainingBalance: 0, active: true, note: "Evento adicionado", source: "FGTS" }]); }

  return <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-bold">Planejamento de Amortizações com FGTS</h2><p className="mt-1 text-sm text-slate-500">Projete utilizações futuras em intervalos fixos e revise os valores de cada evento.</p></div><button type="button" className="btn-secondary" onClick={addEvent}><Plus className="h-4 w-4" /> Adicionar evento</button></div>
    <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <label className="text-sm font-semibold">Data do contrato (opcional)<input type="date" className={cls} value={form.contractDate} onChange={(event) => updateForm({ contractDate: event.target.value })} /></label>
      <label className="text-sm font-semibold">Última utilização<input type="date" className={cls} disabled={form.neverUsed} value={form.lastUsageDate} onChange={(event) => updateForm({ lastUsageDate: event.target.value })} /></label>
      <label className="flex items-center gap-3 self-end rounded-lg border border-slate-200 p-3 text-sm font-semibold"><input type="checkbox" checked={form.neverUsed} onChange={(event) => updateForm({ neverUsed: event.target.checked, lastUsageDate: event.target.checked ? "" : form.lastUsageDate })} />Nunca utilizou nesta modalidade</label>
      <label className="text-sm font-semibold">Prazo restante (meses)<input type="text" inputMode="numeric" className={cls} value={form.remainingTermMonths} onChange={(event) => updateForm({ remainingTermMonths: Math.max(1, Number(event.target.value.replace(/\D/g, "")) || 1) })} /></label>
      <label className="text-sm font-semibold">Saldo atual disponível<FgtsCurrencyInput ariaLabel="Saldo atual disponível" className={cls} value={form.currentBalance} onValueChange={(currentBalance) => updateForm({ currentBalance })} /></label>
      <label className="text-sm font-semibold">Depósito mensal médio<FgtsCurrencyInput ariaLabel="Depósito mensal médio" className={cls} value={form.monthlyDeposit} onValueChange={(monthlyDeposit) => updateForm({ monthlyDeposit })} /></label>
      <label className="text-sm font-semibold">Primeiro aporte (mês)<input type="text" inputMode="numeric" className={cls} value={form.firstContributionMonth} onChange={(event) => updateForm({ firstContributionMonth: Math.max(1, Number(event.target.value.replace(/\D/g, "")) || 1) })} /></label>
      <div className="flex min-h-20 items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"><CalendarClock className="h-5 w-5 shrink-0" /><div><p className="font-bold">Periodicidade</p><p>A cada 24 meses</p></div></div>
      <label className="text-sm font-semibold md:col-span-2">Forma de definição<select className={cls} value={form.contributionMode} onChange={(event) => updateForm({ contributionMode: event.target.value as FgtsProjectionForm["contributionMode"] })}><option value="FIXED">Valor fixo informado manualmente</option><option value="CURRENT_BALANCE">Utilizar todo o saldo atual no primeiro aporte</option><option value="MONTHLY_PROJECTION">Projetar saldo com base nos depósitos mensais</option><option value="INDIVIDUAL">Informar valores individualmente por evento</option></select></label>
      {["FIXED", "INDIVIDUAL"].includes(form.contributionMode) && <label className="text-sm font-semibold">Valor por aporte<FgtsCurrencyInput ariaLabel="Valor por aporte de FGTS" className={cls} value={form.fixedAmount} onValueChange={(fixedAmount) => updateForm({ fixedAmount })} /></label>}
      <label className="text-sm font-semibold">Último mês (opcional)<input type="text" inputMode="numeric" className={cls} value={form.lastMonth || ""} onChange={(event) => updateForm({ lastMonth: Number(event.target.value.replace(/\D/g, "")) || undefined })} /></label>
    </div>
    {result.nextEligibleDate && <p className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800"><strong>Próxima utilização indicativa:</strong> {new Date(`${result.nextEligibleDate}T12:00:00`).toLocaleDateString("pt-BR")}. O prazo é analisado por trabalhador e depende da confirmação do agente financeiro.</p>}
    <FgtsEventTable events={events} onChange={onEventsChange} />
    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><div className="rounded-lg bg-slate-50 p-4"><p className="text-xs text-slate-500">Utilizações</p><p className="font-bold">{active.length}</p></div><div className="rounded-lg bg-slate-50 p-4"><p className="text-xs text-slate-500">Total projetado</p><p className="font-bold">{formatCurrencyBR(active.reduce((sum, event) => sum + event.amount, 0))}</p></div><div className="rounded-lg bg-slate-50 p-4"><p className="text-xs text-slate-500">Primeiro aporte</p><p className="font-bold">Mês {active[0]?.month || "—"}</p></div><div className="rounded-lg bg-slate-50 p-4"><p className="text-xs text-slate-500">Último aporte</p><p className="font-bold">Mês {active.at(-1)?.month || "—"}</p></div></div>
    <p className="mt-4 text-xs leading-5 text-slate-500">A projeção considera valores informados pelo usuário e não garante saldo futuro, liberação ou autorização de uso. Não inclui correção monetária, mudanças salariais, saques, bloqueios ou mudanças de vínculo.</p>
  </section>;
}
