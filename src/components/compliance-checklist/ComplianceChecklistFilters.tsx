import { Eye } from "lucide-react";
import {
  COMPLIANCE_FILTER_LABELS
} from "../../data/complianceChecklistItems";
import {
  ComplianceChecklistFilter,
  ComplianceChecklistSummary
} from "../../types/complianceChecklist";

interface Props {
  selected: ComplianceChecklistFilter;
  observationsOnly: boolean;
  summary: ComplianceChecklistSummary;
  onSelectedChange: (filter: ComplianceChecklistFilter) => void;
  onObservationsOnlyChange: (value: boolean) => void;
}

const FILTERS: ComplianceChecklistFilter[] = [
  "ALL",
  "PENDING",
  "COMPLIANT",
  "HAS_ISSUE",
  "NOT_APPLICABLE"
];

export function ComplianceChecklistFilters({
  selected,
  observationsOnly,
  summary,
  onSelectedChange,
  onObservationsOnlyChange
}: Props) {
  const counts: Record<ComplianceChecklistFilter, number> = {
    ALL: summary.total,
    PENDING: summary.pending,
    COMPLIANT: summary.compliant,
    HAS_ISSUE: summary.hasIssue,
    NOT_APPLICABLE: summary.notApplicable
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Filtros do checklist">
          {FILTERS.map((filter) => {
            const active = selected === filter;
            return (
              <button
                key={filter}
                type="button"
                aria-pressed={active}
                onClick={() => onSelectedChange(filter)}
                className={`min-h-10 shrink-0 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goodgreen-300 ${
                  active
                    ? "border-goodgreen-200 bg-goodgreen-50 text-goodgreen-800"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {COMPLIANCE_FILTER_LABELS[filter]} ({counts[filter]})
              </button>
            );
          })}
        </div>

        <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm font-semibold text-slate-600">
          <input
            type="checkbox"
            checked={observationsOnly}
            onChange={(event) => onObservationsOnlyChange(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-goodgreen-600 focus:ring-goodgreen-500"
          />
          <Eye className="h-4 w-4" />
          Mostrar somente itens com observação
        </label>
      </div>
    </section>
  );
}
