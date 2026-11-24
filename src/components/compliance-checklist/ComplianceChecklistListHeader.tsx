import { LogOut, Plus, RefreshCw } from "lucide-react";
import { PageHeader } from "../ui/PageHeader";

interface Props {
  userLabel: string;
  refreshing: boolean;
  onNew: () => void;
  onRefresh: () => void;
  onSignOut: () => void;
}

export function ComplianceChecklistListHeader({ userLabel, refreshing, onNew, onRefresh, onSignOut }: Props) {
  return (
    <PageHeader
      title="Checklist de Conformidade"
      description="Acompanhe as conferências internas de cada processo."
      actions={
        <>
          <button type="button" onClick={onRefresh} disabled={refreshing} className="btn-muted">
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Atualizar
          </button>
          <button type="button" onClick={onNew} className="btn-primary">
            <Plus className="h-4 w-4" />
            Novo checklist
          </button>
          <button type="button" onClick={onSignOut} className="btn-muted px-3" aria-label="Sair da conta" title={`Sair (${userLabel})`}>
            <LogOut className="h-4 w-4" />
          </button>
        </>
      }
    />
  );
}
