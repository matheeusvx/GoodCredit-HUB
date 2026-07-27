import { LogOut, Plus, RefreshCw, ShieldCheck } from "lucide-react";

interface Props {
  userLabel: string;
  refreshing: boolean;
  onNew: () => void;
  onRefresh: () => void;
  onSignOut: () => void;
}

export function ComplianceChecklistListHeader({
  userLabel,
  refreshing,
  onNew,
  onRefresh,
  onSignOut
}: Props) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-[1700px] flex-col gap-5 px-4 py-6 sm:px-6 lg:flex-row lg:items-end lg:justify-between xl:px-8">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-goodgreen-700">
            <ShieldCheck className="h-4 w-4" />
            Uso interno GoodCredit
          </div>
          <h1 className="mt-3 text-2xl font-bold text-slate-950 sm:text-3xl">
            Checklists de Conformidade
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Consulte, continue e organize as conferências internas dos processos.
          </p>
          <p className="mt-2 text-xs text-slate-500">Sessão: {userLabel}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goodblue-300 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Atualizar lista
          </button>
          <button
            type="button"
            onClick={onNew}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-goodgreen-600 px-4 text-sm font-bold text-white transition hover:bg-goodgreen-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goodgreen-400 focus-visible:ring-offset-2"
          >
            <Plus className="h-4 w-4" />
            Novo Checklist
          </button>
          <button
            type="button"
            onClick={onSignOut}
            aria-label="Sair da conta"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </div>
    </header>
  );
}
