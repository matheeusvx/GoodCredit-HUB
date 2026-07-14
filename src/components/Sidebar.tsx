import { BarChart3, CheckSquare, FileClock, Home, Lock, PiggyBank, WalletCards } from "lucide-react";
import { type KeyboardEvent, useState } from "react";

export type HubView = "home" | "amortization" | "simulation" | "checklist" | "fgts" | "income-analysis";

const modules = [
  { label: "Início", icon: Home, enabled: true, view: "home" as const },
  { label: "Planilha de Amortização", icon: BarChart3, enabled: true, view: "amortization" as const },
  { label: "Simulação de Financiamento", icon: WalletCards, enabled: true, view: "simulation" as const },
  { label: "Apuração de Renda", icon: FileClock, enabled: true, view: "income-analysis" as const },
  { label: "Checklist Documental", icon: CheckSquare, enabled: true, view: "checklist" as const },
  { label: "Uso de FGTS", icon: PiggyBank, enabled: true, view: "fgts" as const }
];

interface SidebarProps {
  activeView: HubView;
  onNavigate: (view: HubView) => void;
}

export function Sidebar({ activeView, onNavigate }: SidebarProps) {
  const [logoFailed, setLogoFailed] = useState(false);

  function handleScrollKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const container = event.currentTarget;
    const pageStep = Math.max(120, container.clientHeight * 0.8);
    const positions: Partial<Record<string, number>> = {
      ArrowDown: container.scrollTop + 48,
      ArrowUp: container.scrollTop - 48,
      PageDown: container.scrollTop + pageStep,
      PageUp: container.scrollTop - pageStep,
      Home: 0,
      End: container.scrollHeight
    };
    const top = positions[event.key];
    if (top === undefined) return;
    event.preventDefault();
    container.scrollTo({ top, behavior: "auto" });
  }

  return (
    <aside className="goodcredit-sidebar fixed left-0 top-0 z-30 hidden min-h-0 w-72 flex-col overflow-hidden border-r border-slate-200 bg-white shadow-sm lg:flex">
      <div className="shrink-0 px-5 pt-6">
        <div className="flex min-h-24 items-center justify-center border-b border-slate-100 pb-6">
          {!logoFailed ? (
            <img
              src="/logo-goodcredit-hub.png"
              alt="GoodCredit Hub"
              className="h-auto w-52 max-w-full object-contain"
              onError={() => setLogoFailed(true)}
            />
          ) : (
            <div className="text-center">
              <p className="text-2xl font-bold text-goodgreen-600">GoodCredit</p>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Hub</p>
            </div>
          )}
        </div>
      </div>

      <div
        className="sidebar-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-5 pb-6 pt-8 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-goodblue-300"
        tabIndex={0}
        aria-label="Navegação dos módulos"
        onKeyDown={handleScrollKeyDown}
      >
        <div className="flex min-h-full flex-col">
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

          <div className="mt-auto pt-6">
            <div className="rounded-lg border border-goodblue-100 bg-goodblue-50 p-4">
              <p className="text-sm font-semibold text-goodblue-700">Módulos em evolução</p>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                A base foi preparada para novas jornadas de crédito imobiliário.
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
