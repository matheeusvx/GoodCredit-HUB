import { AlertTriangle, MessageSquarePlus, MessageSquareText } from "lucide-react";
import {
  COMPLIANCE_STATUS_LABELS
} from "../../data/complianceChecklistItems";
import {
  ComplianceChecklistItemDefinition,
  ComplianceChecklistItemState,
  ComplianceChecklistStatus
} from "../../types/complianceChecklist";
import { ComplianceObservationEditor } from "./ComplianceObservationEditor";
import { COMPLIANCE_CHECKLIST_ICONS } from "./complianceChecklistIcons";

interface Props {
  definition: ComplianceChecklistItemDefinition;
  item: ComplianceChecklistItemState;
  observationOpen: boolean;
  onStatusChange: (status: ComplianceChecklistStatus) => void;
  onObservationChange: (observation: string) => void;
  onObservationToggle: () => void;
  onObservationRemove: () => void;
}

const statusTone: Record<ComplianceChecklistStatus, string> = {
  PENDING: "border-goodblue-100 bg-goodblue-50 text-goodblue-800",
  COMPLIANT: "border-goodgreen-200 bg-goodgreen-50 text-goodgreen-800",
  HAS_ISSUE: "border-amber-200 bg-amber-50 text-amber-900",
  NOT_APPLICABLE: "border-slate-200 bg-slate-100 text-slate-600"
};

export function ComplianceChecklistItem({
  definition,
  item,
  observationOpen,
  onStatusChange,
  onObservationChange,
  onObservationToggle,
  onObservationRemove
}: Props) {
  const Icon = COMPLIANCE_CHECKLIST_ICONS[definition.icon];
  const hasObservation = Boolean(item.observation.trim());

  return (
    <article
      className={`overflow-hidden rounded-lg border bg-white shadow-sm ${
        item.status === "HAS_ISSUE" ? "border-amber-200" : "border-slate-200"
      }`}
    >
      <div className="grid min-h-20 items-center gap-4 px-4 py-4 sm:px-5 lg:grid-cols-[auto_minmax(0,1fr)_190px_auto]">
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={item.status === "COMPLIANT"}
            onChange={() =>
              onStatusChange(item.status === "COMPLIANT" ? "PENDING" : "COMPLIANT")
            }
            aria-label={`Marcar ${definition.label} como conforme`}
            className="h-5 w-5 rounded border-slate-300 text-goodgreen-600 focus:ring-goodgreen-500"
          />
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            <Icon className="h-5 w-5" />
          </span>
        </label>

        <div className="min-w-0">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 text-xs font-bold text-slate-400">
              {String(definition.order).padStart(2, "0")}
            </span>
            <h3 className="text-sm font-bold leading-5 text-slate-900">
              {definition.label}
            </h3>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={`rounded-md border px-2 py-1 text-xs font-bold ${statusTone[item.status]}`}>
              {COMPLIANCE_STATUS_LABELS[item.status]}
            </span>
            {hasObservation && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-goodblue-700">
                <MessageSquareText className="h-3.5 w-3.5" />
                Observação registrada
              </span>
            )}
          </div>
        </div>

        <label className="flex min-w-0 flex-col gap-1.5">
          <span className="text-xs font-semibold text-slate-500">Status da verificação</span>
          <select
            value={item.status}
            onChange={(event) =>
              onStatusChange(event.target.value as ComplianceChecklistStatus)
            }
            aria-label={`Status de ${definition.label}`}
            className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-goodgreen-500 focus:ring-4 focus:ring-goodgreen-500/10"
          >
            {(Object.keys(COMPLIANCE_STATUS_LABELS) as ComplianceChecklistStatus[]).map(
              (status) => (
                <option key={status} value={status}>
                  {COMPLIANCE_STATUS_LABELS[status]}
                </option>
              )
            )}
          </select>
        </label>

        <button
          type="button"
          onClick={onObservationToggle}
          aria-expanded={observationOpen}
          aria-label={`${hasObservation ? "Editar" : "Adicionar"} observação em ${definition.label}`}
          className="btn-muted min-h-11 justify-center whitespace-nowrap"
        >
          {hasObservation ? (
            <MessageSquareText className="h-4 w-4" />
          ) : (
            <MessageSquarePlus className="h-4 w-4" />
          )}
          {hasObservation ? "Editar observação" : "Adicionar observação"}
        </button>
      </div>

      {item.status === "HAS_ISSUE" && !hasObservation && (
        <div className="flex items-start gap-2 border-t border-amber-100 bg-amber-50 px-4 py-3 text-xs font-semibold leading-5 text-amber-800 sm:px-5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          Registre uma observação explicando a pendência.
        </div>
      )}

      {observationOpen && (
        <ComplianceObservationEditor
          itemLabel={definition.label}
          value={item.observation}
          onChange={onObservationChange}
          onSave={onObservationToggle}
          onRemove={onObservationRemove}
        />
      )}
    </article>
  );
}
