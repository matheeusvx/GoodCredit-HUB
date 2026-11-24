import { COMPLIANCE_OVERALL_STATUS_LABELS } from "../../lib/compliance-checklist/complianceChecklistSummary";
import { ComplianceChecklistSummary } from "../../types/complianceChecklist";
import { Roll, useMounted } from "../ui/Roll";

interface Props {
  summary: ComplianceChecklistSummary;
}

export function ComplianceProgressSummary({ summary }: Props) {
  const mounted = useMounted();
  const statusTone =
    summary.overallStatus === "HAS_ISSUES"
      ? "bg-amber-50 text-amber-800 ring-amber-200"
      : summary.overallStatus === "COMPLETED"
        ? "bg-goodgreen-50 text-goodgreen-800 ring-goodgreen-200"
        : "bg-goodblue-50 text-goodblue-800 ring-goodblue-100";

  const segments = [
    { label: "Conformes", value: summary.compliant, bar: "bg-goodgreen-500" },
    { label: "Com pendência", value: summary.hasIssue, bar: "bg-amber-500" },
    { label: "Não se aplica", value: summary.notApplicable, bar: "bg-slate-300" },
    { label: "Pendentes", value: summary.pending, bar: "bg-transparent" }
  ];
  const total = Math.max(1, summary.total);

  return (
    <section className="surface p-5 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow">Progresso geral</p>
          <h2 className="mt-2 text-lg font-bold text-ink">
            {summary.completed} de {summary.total} verificações concluídas
          </h2>
        </div>
        <div className="flex items-center gap-4">
          <p className="text-3xl font-semibold tracking-tight text-ink">
            <Roll value={`${summary.completionPercent}%`} />
          </p>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${statusTone}`}>
            {COMPLIANCE_OVERALL_STATUS_LABELS[summary.overallStatus]}
          </span>
        </div>
      </div>

      <div
        className="mt-5 flex h-2 gap-0.5 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-label="Progresso do checklist"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={summary.completionPercent}
      >
        {segments.slice(0, 3).map((segment) => (
          <div
            key={segment.label}
            className={`h-full transition-[width] duration-700 ease-out ${segment.bar}`}
            style={{ width: mounted ? `${(segment.value / total) * 100}%` : "0%" }}
          />
        ))}
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
        {segments.map((segment) => (
          <div key={segment.label} className="border-l-2 border-slate-100 pl-3">
            <dt className="flex items-center gap-2 text-[13px] font-medium text-ink-muted">
              <span className={`h-2 w-2 rounded-full ${segment.bar === "bg-transparent" ? "ring-1 ring-inset ring-slate-300" : segment.bar}`} aria-hidden="true" />
              {segment.label}
            </dt>
            <dd className="mt-1 text-xl font-semibold text-ink">
              <Roll value={String(segment.value)} />
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
