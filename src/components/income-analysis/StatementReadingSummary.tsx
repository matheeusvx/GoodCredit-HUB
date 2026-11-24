import type { StatementFileRecord } from "../../types/statementAnalysis";
import { getInstitution } from "../../lib/statement-analysis/institutionCatalog";
import { fileInstitutionLabel, fileReadingLabel } from "../../lib/statement-analysis/institutionSelection";
import { getParserLabel } from "../../lib/statement-analysis/presentationLabels";

export function StatementReadingSummary({ files }: { files: StatementFileRecord[] }) {
  return <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold">Instituições e leitura dos arquivos</h2><div className="mt-4 divide-y divide-slate-100">{files.map((file) => <div key={file.id} className="grid gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"><div><p className="break-words text-sm font-bold">{file.name}</p><p className="mt-1 text-sm text-goodblue-700">{fileInstitutionLabel(file)}</p><p className="mt-1 text-xs text-slate-500">{file.institutionSelectionMethod === "MANUAL" ? `Seleção manual: ${getInstitution(file.selectedInstitution)?.label || "Outra instituição"}` : "Detecção automática"}</p></div><div><p className="text-sm font-semibold text-slate-700">{fileReadingLabel(file)}</p><p className="mt-1 text-xs text-slate-500">Leitor utilizado: {file.parserId ? getParserLabel(file.parserId) : "Não executado"}</p>{[...new Set([...(file.incompatibilityWarnings || []), ...(file.warnings || [])])].map((warning) => <p key={warning} className="mt-1 text-xs leading-5 text-amber-700">{warning}</p>)}</div></div>)}</div></section>;
}
