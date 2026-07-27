import {
  Archive,
  Copy,
  FileDown,
  FolderOpen,
  RotateCcw
} from "lucide-react";
import {
  COMPLIANCE_LIST_STATUS_LABELS,
  formatComplianceDate,
  formatComplianceDateTime
} from "../../lib/compliance-checklist/complianceChecklistPresentation";
import type { ComplianceChecklistRecord } from "../../types/complianceChecklist";

interface Props {
  records: ComplianceChecklistRecord[];
  busyId: string | null;
  onOpen: (record: ComplianceChecklistRecord) => void;
  onPdf: (record: ComplianceChecklistRecord) => void;
  onDuplicate: (record: ComplianceChecklistRecord) => void;
  onArchive: (record: ComplianceChecklistRecord) => void;
  onRestore: (record: ComplianceChecklistRecord) => void;
}

function StatusBadge({ record }: { record: ComplianceChecklistRecord }) {
  const archived = Boolean(record.archivedAt);
  const label = archived
    ? "Arquivado"
    : COMPLIANCE_LIST_STATUS_LABELS[record.overallStatus];
  const style = archived
    ? "bg-slate-100 text-slate-600"
    : record.overallStatus === "COMPLETED"
      ? "bg-goodgreen-50 text-goodgreen-700"
      : record.overallStatus === "HAS_ISSUES"
        ? "bg-amber-50 text-amber-800"
        : "bg-goodblue-50 text-goodblue-700";
  return (
    <span className={`inline-flex rounded-md px-2 py-1 text-xs font-bold ${style}`}>
      {label}
    </span>
  );
}

function ActionButtons({
  record,
  busy,
  onOpen,
  onPdf,
  onDuplicate,
  onArchive,
  onRestore
}: {
  record: ComplianceChecklistRecord;
  busy: boolean;
  onOpen: () => void;
  onPdf: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onRestore: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <button
        type="button"
        onClick={onOpen}
        disabled={busy}
        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 text-xs font-bold text-slate-700"
      >
        <FolderOpen className="h-3.5 w-3.5" /> Abrir
      </button>
      <button
        type="button"
        onClick={onPdf}
        disabled={busy}
        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 text-xs font-bold text-slate-700"
      >
        <FileDown className="h-3.5 w-3.5" /> PDF
      </button>
      <button
        type="button"
        onClick={onDuplicate}
        disabled={busy}
        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 text-xs font-bold text-slate-700"
      >
        <Copy className="h-3.5 w-3.5" /> Duplicar
      </button>
      {record.archivedAt ? (
        <button
          type="button"
          onClick={onRestore}
          disabled={busy}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-goodgreen-200 bg-goodgreen-50 px-2.5 text-xs font-bold text-goodgreen-700"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Restaurar
        </button>
      ) : (
        <button
          type="button"
          onClick={onArchive}
          disabled={busy}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 text-xs font-bold text-slate-600"
        >
          <Archive className="h-3.5 w-3.5" /> Arquivar
        </button>
      )}
    </div>
  );
}

export function ComplianceChecklistRecords({
  records,
  busyId,
  onOpen,
  onPdf,
  onDuplicate,
  onArchive,
  onRestore
}: Props) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm 2xl:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {[
                  "Cliente",
                  "Processo",
                  "Responsável",
                  "Data da conferência",
                  "Progresso",
                  "Status",
                  "Última atualização",
                  "Ações"
                ].map((heading) => (
                  <th key={heading} scope="col" className="px-4 py-3 font-semibold">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.map((record) => (
                <tr key={record.id} className="align-top hover:bg-slate-50/70">
                  <td className="px-4 py-4">
                    <p className="max-w-52 font-bold text-slate-900">{record.clientName}</p>
                  </td>
                  <td className="px-4 py-4 text-slate-600">
                    {record.processReference || "—"}
                  </td>
                  <td className="px-4 py-4 text-slate-600">
                    {record.analystName || "—"}
                  </td>
                  <td className="px-4 py-4 text-slate-600">
                    {formatComplianceDate(record.reviewDate)}
                  </td>
                  <td className="px-4 py-4">
                    <div className="w-28">
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full bg-goodgreen-500"
                          style={{ width: `${record.completionPercent}%` }}
                        />
                      </div>
                      <p className="mt-1 text-xs font-semibold text-slate-600">
                        {record.completionPercent}%
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-4"><StatusBadge record={record} /></td>
                  <td className="px-4 py-4 text-xs leading-5 text-slate-600">
                    {formatComplianceDateTime(record.updatedAt)}
                    <span className="block text-slate-400">{record.updatedByLabel}</span>
                  </td>
                  <td className="px-4 py-4">
                    <ActionButtons
                      record={record}
                      busy={busyId === record.id}
                      onOpen={() => onOpen(record)}
                      onPdf={() => onPdf(record)}
                      onDuplicate={() => onDuplicate(record)}
                      onArchive={() => onArchive(record)}
                      onRestore={() => onRestore(record)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-3 2xl:hidden">
        {records.map((record) => (
          <article key={record.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="break-words font-bold text-slate-950">{record.clientName}</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Processo: {record.processReference || "Não informado"}
                </p>
              </div>
              <StatusBadge record={record} />
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-slate-500">Responsável</dt>
                <dd className="mt-1 font-semibold text-slate-700">{record.analystName || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Progresso</dt>
                <dd className="mt-1 font-semibold text-slate-700">{record.completionPercent}%</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs text-slate-500">Última atualização</dt>
                <dd className="mt-1 text-slate-700">
                  {formatComplianceDateTime(record.updatedAt)} · {record.updatedByLabel}
                </dd>
              </div>
            </dl>
            <div className="mt-4 border-t border-slate-100 pt-3">
              <ActionButtons
                record={record}
                busy={busyId === record.id}
                onOpen={() => onOpen(record)}
                onPdf={() => onPdf(record)}
                onDuplicate={() => onDuplicate(record)}
                onArchive={() => onArchive(record)}
                onRestore={() => onRestore(record)}
              />
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
