import { ArrowUpRight, BadgeDollarSign, BarChart3, CheckSquare, FileClock, PiggyBank, WalletCards, type LucideIcon } from "lucide-react";
import type { HubView } from "../Sidebar";

const tools: Array<{ label: string; description: string; target: HubView; icon: LucideIcon }> = [
  { label: "Simulação", description: "Financiamento", target: "simulation", icon: WalletCards },
  { label: "Amortização", description: "SAC e PRICE", target: "amortization", icon: BarChart3 },
  { label: "Pró-Soluto", description: "Saldo do vendedor", target: "pro-soluto", icon: BadgeDollarSign },
  { label: "Checklist", description: "Documentação", target: "checklist", icon: CheckSquare },
  { label: "Renda", description: "Apuração", target: "income-analysis", icon: FileClock },
  { label: "FGTS", description: "Elegibilidade", target: "fgts", icon: PiggyBank },
];

export function QuickAccess({ onNavigate }: { onNavigate: (view: HubView) => void }) {
  return (
    <section aria-labelledby="quick-access-title">
      <div className="mb-4"><p className="text-xs font-bold uppercase tracking-[0.16em] text-goodgreen-700">Ferramentas do Hub</p><h2 id="quick-access-title" className="mt-1 text-lg font-bold text-slate-950">Acesso rápido</h2></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">{tools.map(({ label, description, target, icon: Icon }) => <button key={target} type="button" onClick={() => onNavigate(target)} className="group flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-goodgreen-200 hover:shadow-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goodgreen-500"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-goodgreen-50 text-goodgreen-700"><Icon className="h-5 w-5" aria-hidden="true" /></span><span className="min-w-0"><strong className="block truncate text-sm text-slate-900">{label}</strong><span className="block truncate text-xs text-slate-500">{description}</span></span><ArrowUpRight className="ml-auto h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-goodgreen-600" aria-hidden="true" /></button>)}</div>
    </section>
  );
}
