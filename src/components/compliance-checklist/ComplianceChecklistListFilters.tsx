import { RotateCcw, Search } from "lucide-react";
import type { ComplianceChecklistListFilters as Filters } from "../../types/complianceChecklist";

interface Props {
  filters: Filters;
  analysts: string[];
  onChange: (patch: Partial<Filters>) => void;
  onClear: () => void;
}

const fieldClass =
  "h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-goodgreen-500 focus:ring-4 focus:ring-goodgreen-500/10";

export function ComplianceChecklistListFilters({
  filters,
  analysts,
  onChange,
  onClear
}: Props) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
        <label className="xl:col-span-4">
          <span className="text-xs font-semibold text-slate-600">
            Pesquisar
          </span>
          <span className="relative mt-2 block">
            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
            <input
              type="search"
              value={filters.search}
              onChange={(event) => onChange({ search: event.target.value, page: 1 })}
              placeholder="Pesquisar por cliente ou processo..."
              className={`${fieldClass} pl-10`}
            />
          </span>
        </label>
        <label className="xl:col-span-2">
          <span className="text-xs font-semibold text-slate-600">Status</span>
          <select
            value={filters.status}
            onChange={(event) =>
              onChange({
                status: event.target.value as Filters["status"],
                page: 1
              })
            }
            className={`${fieldClass} mt-2`}
          >
            <option value="ALL">Todos</option>
            <option value="IN_PROGRESS">Em andamento</option>
            <option value="HAS_ISSUES">Com pendências</option>
            <option value="COMPLETED">Concluídos</option>
          </select>
        </label>
        <label className="xl:col-span-2">
          <span className="text-xs font-semibold text-slate-600">Responsável</span>
          <select
            value={filters.analystName}
            onChange={(event) =>
              onChange({ analystName: event.target.value, page: 1 })
            }
            className={`${fieldClass} mt-2`}
          >
            <option value="">Todos</option>
            {analysts.map((analyst) => (
              <option key={analyst} value={analyst}>
                {analyst}
              </option>
            ))}
          </select>
        </label>
        <label className="xl:col-span-2">
          <span className="text-xs font-semibold text-slate-600">Situação</span>
          <select
            value={filters.archive}
            onChange={(event) =>
              onChange({
                archive: event.target.value as Filters["archive"],
                page: 1
              })
            }
            className={`${fieldClass} mt-2`}
          >
            <option value="ACTIVE">Ativos</option>
            <option value="ARCHIVED">Arquivados</option>
            <option value="ALL">Todos</option>
          </select>
        </label>
        <label className="xl:col-span-2">
          <span className="text-xs font-semibold text-slate-600">Ordenar por</span>
          <select
            value={filters.sort}
            onChange={(event) =>
              onChange({ sort: event.target.value as Filters["sort"], page: 1 })
            }
            className={`${fieldClass} mt-2`}
          >
            <option value="UPDATED_DESC">Atualização mais recente</option>
            <option value="UPDATED_ASC">Atualização mais antiga</option>
            <option value="CLIENT_ASC">Nome do cliente</option>
            <option value="REVIEW_DATE_DESC">Data da conferência</option>
            <option value="PROGRESS_DESC">Maior progresso</option>
            <option value="PROGRESS_ASC">Menor progresso</option>
          </select>
        </label>
        <label className="xl:col-span-2">
          <span className="text-xs font-semibold text-slate-600">Data inicial</span>
          <input
            type="date"
            value={filters.startDate}
            onChange={(event) => onChange({ startDate: event.target.value, page: 1 })}
            className={`${fieldClass} mt-2`}
          />
        </label>
        <label className="xl:col-span-2">
          <span className="text-xs font-semibold text-slate-600">Data final</span>
          <input
            type="date"
            value={filters.endDate}
            onChange={(event) => onChange({ endDate: event.target.value, page: 1 })}
            className={`${fieldClass} mt-2`}
          />
        </label>
        <div className="flex items-end xl:col-span-2">
          <button
            type="button"
            onClick={onClear}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
          >
            <RotateCcw className="h-4 w-4" />
            Limpar filtros
          </button>
        </div>
      </div>
    </section>
  );
}
