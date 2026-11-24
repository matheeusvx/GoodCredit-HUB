import { ArrowUpRight, BadgeDollarSign, BarChart3, CheckSquare, FileClock, PiggyBank, WalletCards, type LucideIcon } from "lucide-react";
import type { HubView } from "../Sidebar";

export const QUICK_ACCESS_TOOLS: Array<{ label: string; description: string; target: HubView; icon: LucideIcon }> = [
  { label: "Simulação", description: "Financiamento", target: "simulation", icon: WalletCards },
  { label: "Amortização", description: "SAC e PRICE", target: "amortization", icon: BarChart3 },
  { label: "Pró-Soluto", description: "Saldo do vendedor", target: "pro-soluto", icon: BadgeDollarSign },
  { label: "Checklist", description: "Documentação", target: "checklist", icon: CheckSquare },
  { label: "Análise de Perfil", description: "Renda e documentos", target: "income-analysis", icon: FileClock },
  { label: "FGTS", description: "Elegibilidade", target: "fgts", icon: PiggyBank },
];

export function QuickAccess({ onNavigate }: { onNavigate: (view: HubView) => void }) {
  return (
    <section aria-labelledby="quick-access-title">
      <div className="mb-4 flex items-end justify-between"><h2 id="quick-access-title" className="text-lg font-bold text-ink">Acesso rápido</h2></div>
      <div className="stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">{QUICK_ACCESS_TOOLS.map(({ label, description, target, icon: Icon }) => <button key={target} type="button" onClick={() => onNavigate(target)} className="group relative flex min-h-[104px] flex-col justify-between overflow-hidden rounded-xl border border-slate-200/80 bg-white p-4 text-left shadow-sm transition duration-200 ease-out hover:border-goodgreen-200 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goodgreen-500"><span className="flex items-start justify-between"><Icon className="h-[18px] w-[18px] text-goodblue-500 transition-colors duration-200 group-hover:text-goodgreen-600" strokeWidth={1.75} aria-hidden="true" /><ArrowUpRight className="h-4 w-4 -translate-x-1 translate-y-1 text-goodgreen-600 opacity-0 transition duration-200 ease-out group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100" aria-hidden="true" /></span><span className="mt-4 min-w-0"><strong className="block truncate text-[15px] font-semibold text-ink">{label}</strong><span className="block truncate text-[13px] text-ink-muted">{description}</span></span></button>)}</div>
    </section>
  );
}
