import { Archive, CheckCircle2, CircleDashed, ListChecks, TriangleAlert } from "lucide-react";
import type { ComplianceChecklistMetrics as Metrics } from "../../types/complianceChecklist";

export function ComplianceChecklistMetrics({ metrics }: { metrics: Metrics }) {
  const cards = [
    { label: "Ativos", value: metrics.active, icon: ListChecks, tone: "text-goodblue-700" },
    { label: "Em andamento", value: metrics.inProgress, icon: CircleDashed, tone: "text-goodblue-700" },
    { label: "Com pendências", value: metrics.hasIssues, icon: TriangleAlert, tone: "text-amber-700" },
    { label: "Concluídos", value: metrics.completed, icon: CheckCircle2, tone: "text-goodgreen-700" },
    { label: "Arquivados", value: metrics.archived, icon: Archive, tone: "text-slate-500" }
  ];
  return (
    <section aria-label="Resumo dos checklists" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map(({ label, value, icon: Icon, tone }) => (
        <article key={label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
            <Icon className={`h-4 w-4 ${tone}`} />
          </div>
          <p className={`mt-3 text-2xl font-bold ${tone}`}>{value}</p>
        </article>
      ))}
    </section>
  );
}
