import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ComplianceChecklistListFilters } from "../../types/complianceChecklist";

interface Props {
  page: number;
  pageSize: ComplianceChecklistListFilters["pageSize"];
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: ComplianceChecklistListFilters["pageSize"]) => void;
}

export function ComplianceChecklistPagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange
}: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
      <p>
        Exibindo <strong>{start}–{end}</strong> de <strong>{total}</strong> checklists
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2">
          <span>Por página</span>
          <select
            value={pageSize}
            onChange={(event) =>
              onPageSizeChange(Number(event.target.value) as 10 | 25 | 50)
            }
            className="h-9 rounded-lg border border-slate-300 bg-white px-2"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </label>
        <button
          type="button"
          aria-label="Página anterior"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="min-w-20 text-center font-semibold">
          {page} de {totalPages}
        </span>
        <button
          type="button"
          aria-label="Próxima página"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
