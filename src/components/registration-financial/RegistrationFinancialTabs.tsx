import { ArrowDownUp, BarChart3, Rows3 } from "lucide-react";

export type RegistrationFinancialTab = "PROCESSES" | "CASH_FLOW" | "REPORT";

const tabs = [
  { id: "PROCESSES" as const, label: "Controle de Processos", icon: Rows3 },
  { id: "CASH_FLOW" as const, label: "Entradas e Saídas", icon: ArrowDownUp },
  { id: "REPORT" as const, label: "Relatório Financeiro", icon: BarChart3 }
];

export function RegistrationFinancialTabs({ value, onChange }: { value: RegistrationFinancialTab; onChange: (value: RegistrationFinancialTab) => void }) {
  return <div className="overflow-x-auto"><div className="inline-flex min-w-full gap-1 border-b border-slate-200 sm:min-w-0" role="tablist" aria-label="Áreas do Balancete Cartorial">{tabs.map(({ id, label, icon: Icon }) => <button key={id} type="button" role="tab" aria-selected={value === id} onClick={() => onChange(id)} className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 whitespace-nowrap border-b-2 px-4 text-sm font-bold transition sm:flex-none ${value === id ? "border-goodgreen-600 text-goodgreen-700" : "border-transparent text-slate-500 hover:text-slate-900"}`}><Icon className="h-4 w-4" />{label}</button>)}</div></div>;
}
