import type { ComplianceChecklistMetrics as Metrics } from "../../types/complianceChecklist";
import { StatTile } from "../ui/StatTile";

export function ComplianceChecklistMetrics({ metrics }: { metrics: Metrics }) {
  const total = metrics.active + metrics.archived;
  const cards = [
    { label: "Ativos", value: metrics.active, tone: "blue" as const },
    { label: "Em andamento", value: metrics.inProgress, tone: "blue" as const },
    { label: "Com pendências", value: metrics.hasIssues, tone: "amber" as const },
    { label: "Concluídos", value: metrics.completed, tone: "green" as const },
    { label: "Arquivados", value: metrics.archived, tone: "slate" as const }
  ];
  return (
    <section aria-label="Resumo dos checklists" className="stagger grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map(({ label, value, tone }) => (
        <StatTile key={label} label={label} value={String(value)} tone={tone} share={total > 0 ? value / total : 0} />
      ))}
    </section>
  );
}
