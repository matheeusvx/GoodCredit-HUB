import { BarChart3, CheckSquare, FileClock, Home, Lock, PiggyBank, WalletCards } from "lucide-react";
import { useState } from "react";

export type HubView = "amortization" | "simulation";

const modules = [
  { label: "Início", icon: Home, enabled: false },
  { label: "Planilha de Amortização", icon: BarChart3, enabled: true, view: "amortization" as const },
  { label: "Simulação de Financiamento", icon: WalletCards, enabled: true, view: "simulation" as const },
  { label: "Apuração de Renda", icon: FileClock, enabled: false },
  { label: "Checklist Documental", icon: CheckSquare, enabled: false },
  { label: "Uso de FGTS", icon: PiggyBank, enabled: false }
];

interface SidebarProps {
  activeView: HubView;
  onNavigate: (view: HubView) => void;
}

export function Sidebar({ activeView, onNavigate }: SidebarProps) {
  const [logoFailed, setLogoFailed] = useState(false);

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-slate-200 bg-white px-5 py-6 shadow-sm lg:block">
      <div className="mb-8 flex h-16 items-center">
        {!logoFailed ? (
          <img
            src="/logo-goodcredit.png"
            alt="GoodCredit"
            className="max-h-14 w-auto object-contain"
            onError={() => setLogoFailed(true)}
          />
        ) : (
          <div>
            <p className="text-2xl font-bold text-goodgreen-600">GoodCredit</p>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Hub</p>
          </div>
        )}
      </div>

      <nav className="space-y-2">
        {modules.map((module) => {
          const Icon = module.icon;
          const isActive = module.enabled && module.view === activeView;
          return (
            <button
              key={module.label}
              type="button"
              onClick={() => module.enabled && module.view && onNavigate(module.view)}
              className={`group flex w-full items-center justify-between rounded-lg px-3 py-3 text-left text-sm font-semibold transition ${
                isActive
                  ? "bg-goodgreen-50 text-goodgreen-700 ring-1 ring-goodgreen-100"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
              disabled={!module.enabled}
              title={module.enabled ? module.label : "Em breve"}
            >
              <span className="flex items-center gap-3">
                <Icon className="h-5 w-5" />
                {module.label}
              </span>
              {!module.enabled && <Lock className="h-4 w-4 text-slate-300" />}
            </button>
          );
        })}
      </nav>

      <div className="absolute bottom-6 left-5 right-5 rounded-lg border border-goodblue-100 bg-goodblue-50 p-4">
        <p className="text-sm font-semibold text-goodblue-700">Módulos em evolução</p>
        <p className="mt-1 text-xs leading-5 text-slate-600">
          A base foi preparada para novas jornadas de crédito imobiliário.
        </p>
      </div>
    </aside>
  );
}
