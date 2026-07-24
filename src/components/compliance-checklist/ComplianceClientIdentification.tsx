import { CalendarDays, UserRoundCheck } from "lucide-react";
import { ComplianceChecklistState } from "../../types/complianceChecklist";

interface Props {
  state: ComplianceChecklistState;
  onChange: (patch: Partial<ComplianceChecklistState>) => void;
}

export function ComplianceClientIdentification({ state, onChange }: Props) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-panel">
      <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
        <UserRoundCheck className="h-5 w-5 text-goodgreen-700" />
        <div>
          <h2 className="text-lg font-bold text-slate-950">Identificação do Cliente</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Dados mínimos para identificar esta conferência interna.
          </p>
        </div>
      </div>

      <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-4">
        <label className="flex min-w-0 flex-col gap-2 xl:col-span-2">
          <span className="text-sm font-semibold text-slate-700">Nome do cliente *</span>
          <input
            type="text"
            value={state.clientName}
            onChange={(event) => onChange({ clientName: event.target.value })}
            placeholder="Digite o nome completo do cliente"
            className="input-field"
            required
          />
        </label>
        <label className="flex min-w-0 flex-col gap-2">
          <span className="text-sm font-semibold text-slate-700">
            Número ou referência do processo
          </span>
          <input
            type="text"
            value={state.processReference}
            onChange={(event) => onChange({ processReference: event.target.value })}
            placeholder="Opcional"
            className="input-field"
          />
        </label>
        <label className="flex min-w-0 flex-col gap-2">
          <span className="text-sm font-semibold text-slate-700">
            Responsável pela conferência
          </span>
          <input
            type="text"
            value={state.analystName}
            onChange={(event) => onChange({ analystName: event.target.value })}
            placeholder="Opcional"
            className="input-field"
          />
        </label>
        <label className="flex min-w-0 flex-col gap-2 sm:col-span-2 xl:col-span-1">
          <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <CalendarDays className="h-4 w-4 text-slate-400" />
            Data da conferência
          </span>
          <input
            type="date"
            value={state.reviewDate}
            onChange={(event) => onChange({ reviewDate: event.target.value })}
            className="input-field"
          />
        </label>
      </div>
    </section>
  );
}
