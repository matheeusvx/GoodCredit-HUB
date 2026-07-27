import { BadgeDollarSign, BarChart3, BookOpen, CheckSquare, CircleHelp, FileClock, Home, Landmark, Lock, LogOut, PiggyBank, ShieldCheck, WalletCards } from "lucide-react";
import { Fragment, type KeyboardEvent, useState } from "react";
import { replaceAppPath } from "../auth/authNavigation";
import { useAuth } from "../contexts/AuthContext";

export type HubView = "home" | "amortization" | "simulation" | "pro-soluto" | "registration" | "checklist" | "compliance-checklist" | "fgts" | "income-analysis" | "usage-guide" | "faq";

const modules = [
  { label: "Início", icon: Home, enabled: true, view: "home" as const },
  { label: "Planilha de Amortização", icon: BarChart3, enabled: true, view: "amortization" as const },
  { label: "Simulação de Financiamento", icon: WalletCards, enabled: true, view: "simulation" as const },
  { label: "Cálculo de Pró-Soluto", icon: BadgeDollarSign, enabled: true, view: "pro-soluto" as const },
  { label: "Registro", icon: Landmark, enabled: true, view: "registration" as const },
  { label: "Apuração de Renda", icon: FileClock, enabled: true, view: "income-analysis" as const },
  { label: "Checklist Documental", icon: CheckSquare, enabled: true, view: "checklist" as const },
  { label: "Checklist de Conformidade", icon: ShieldCheck, enabled: true, view: "compliance-checklist" as const },
  { label: "Uso de FGTS", icon: PiggyBank, enabled: true, view: "fgts" as const },
  { label: "Guia de Uso", icon: BookOpen, enabled: true, view: "usage-guide" as const },
  { label: "FAQ de Atendimento", icon: CircleHelp, enabled: true, view: "faq" as const }
];

interface SidebarProps {
  activeView: HubView | null;
  onNavigate: (view: HubView) => void;
}

function SidebarSectionLabel({ label }: { label: string }) {
  return (
    <div className="mt-4 border-t border-slate-200 px-2.5 pt-4" aria-label={label}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">{label}</p>
    </div>
  );
}

export function Sidebar({ activeView, onNavigate }: SidebarProps) {
  const { signOut, user } = useAuth();
  const [logoFailed, setLogoFailed] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    await signOut();
    replaceAppPath("/login");
  }

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
        className="sidebar-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-5 pb-6 pt-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-goodblue-300"
        tabIndex={0}
        aria-label="Navegação dos módulos"
        onKeyDown={handleScrollKeyDown}
      >
        <div className="flex min-h-full flex-col">
          <nav className="space-y-1.5">
            {modules.map((module) => {
              const Icon = module.icon;
              const isActive = module.enabled && module.view === activeView;
              return (
                <Fragment key={module.label}>
                  {module.view === "usage-guide" && <SidebarSectionLabel label="Central de Apoio" />}
                  <button
                    type="button"
                    aria-label={module.label}
                    aria-current={isActive ? "page" : undefined}
                    onClick={() => module.enabled && module.view && onNavigate(module.view)}
                    className={`group flex min-h-10 w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[13px] font-semibold leading-4 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goodgreen-300 focus-visible:ring-offset-1 ${
                      isActive
                        ? "bg-goodgreen-50 text-goodgreen-700 ring-1 ring-goodgreen-100"
                        : "text-slate-500 hover:bg-slate-50"
                    }`}
                    disabled={!module.enabled}
                    title={module.enabled ? module.label : "Em breve"}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <Icon className="h-[17px] w-[17px] shrink-0" />
                      {module.label}
                    </span>
                    {!module.enabled && <Lock className="h-4 w-4 text-slate-300" />}
                  </button>
                </Fragment>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="shrink-0 border-t border-slate-200 px-5 py-4">
        <p className="truncate text-xs font-semibold text-slate-600" title={user?.email}>
          {user?.email || "Usuário autenticado"}
        </p>
        <button
          type="button"
          onClick={() => void handleSignOut()}
          disabled={signingOut}
          className="mt-2 flex min-h-10 w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-semibold text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goodgreen-300 disabled:opacity-60"
        >
          <LogOut className="h-[17px] w-[17px] shrink-0" />
          {signingOut ? "Saindo..." : "Sair da conta"}
        </button>
      </div>
    </aside>
  );
}
