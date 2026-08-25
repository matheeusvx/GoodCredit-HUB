import { HubView } from "../Sidebar";
import { FinancingFlow } from "./FinancingFlow";
import { ImportantNotice } from "./ImportantNotice";
import { CrmDashboardPanel } from "./CrmDashboardPanel";
import { QuickAccess } from "./QuickAccess";

interface Props {
  onNavigate: (view: HubView) => void;
}

export function HomePage({ onNavigate }: Props) {
  return (
    <main className="mx-auto flex max-w-[1700px] flex-col gap-7 px-4 py-5 sm:px-6 sm:py-6 xl:px-8">
      <CrmDashboardPanel />
      <QuickAccess onNavigate={onNavigate} />
      <details className="group rounded-xl border border-slate-200/80 bg-white shadow-sm">
        <summary className="cursor-pointer list-none px-5 py-4 text-sm font-bold text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goodgreen-500">Fluxo do financiamento <span className="ml-2 text-xs font-medium text-slate-500 group-open:hidden">Ver etapas</span><span className="ml-2 hidden text-xs font-medium text-slate-500 group-open:inline">Ocultar etapas</span></summary>
        <div className="border-t border-slate-100 p-3"><FinancingFlow /></div>
      </details>
      <ImportantNotice />
    </main>
  );
}
