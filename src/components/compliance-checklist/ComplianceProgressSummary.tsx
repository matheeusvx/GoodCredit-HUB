import { AlertTriangle, CheckCircle2, CircleDashed, MinusCircle, ShieldCheck } from "lucide-react";
import { COMPLIANCE_OVERALL_STATUS_LABELS } from "../../lib/compliance-checklist/complianceChecklistSummary";
import { ComplianceChecklistSummary } from "../../types/complianceChecklist";

interface Props {
  summary: ComplianceChecklistSummary;
}

export function ComplianceProgressSummary({ summary }: Props) {
  const statusTone =
    summary.overallStatus === "HAS_ISSUES"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : summary.overallStatus === "COMPLETED"
        ? "border-goodgreen-200 bg-goodgreen-50 text-goodgreen-800"
        : "border-goodblue-100 bg-goodblue-50 text-goodblue-800";

  const metrics = [
    { label: "Total", value: summary.total, icon: ShieldCheck, tone: "text-slate-600" },
    { label: "Conformes", value: summary.compliant, icon: CheckCircle2, tone: "text-goodgreen-700" },
    { label: "Com pendência", value: summary.hasIssue, icon: AlertTriangle, tone: "text-amber-700" },
    { label: "Pendentes", value: summary.pending, icon: CircleDashed, tone: "text-goodblue-700" },
    { label: "Não se aplica", value: summary.notApplicable, icon: MinusCircle, tone: "text-slate-500" }
  ];

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-goodgreen-600">
            Progresso geral
          </p>
          <h2 className="mt-2 text-lg font-bold text-slate-950">
            {summary.completed} de {summary.total} verificações concluídas
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Conforme, com pendência e não se aplica contam como itens concluídos.
          </p>
        </div>
        <div className={`rounded-lg border px-4 py-3 text-sm font-bold ${statusTone}`}>
          {COMPLIANCE_OVERALL_STATUS_LABELS[summary.overallStatus]}
        </div>
      </div>

      <div
        className="mt-5 h-2.5 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-label="Progresso do checklist"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={summary.completionPercent}
      >
        <div
          className="h-full rounded-full bg-goodgreen-600 transition-[width] duration-300"
          style={{ width: `${summary.completionPercent}%` }}
        />
      </div>
      <p className="mt-2 text-right text-sm font-bold text-goodgreen-700">
        {summary.completionPercent}% concluído
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {metrics.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
            <div className="flex items-center gap-2">
              <Icon className={`h-4 w-4 ${tone}`} />
              <span className="text-xs font-semibold text-slate-500">{label}</span>
            </div>
            <p className="mt-2 text-xl font-bold text-slate-950">{value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
