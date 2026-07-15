import { useMemo, useState } from "react";
import { Eye, Trash2 } from "lucide-react";
import { ParsedPdfTransaction, TransactionDirection } from "../../../types/pdfImport";
import { formatCurrencyBR, parseNumberBR } from "../../../lib/income-analysis/formatters";
import { suggestTransactionClassification } from "../../../lib/income-analysis/transactionClassifier";

type ConfidenceFilter = "ALL" | "HIGH" | "MEDIUM" | "LOW";

function confidenceLevel(confidence: number): Exclude<ConfidenceFilter, "ALL"> {
  if (confidence >= 0.85) return "HIGH";
  if (confidence >= 0.6) return "MEDIUM";
  return "LOW";
}

function confidenceLabel(confidence: number): string {
  return confidenceLevel(confidence) === "HIGH" ? "Alta" : confidenceLevel(confidence) === "MEDIUM" ? "Média" : "Baixa";
}

function parseEditableAmount(value: string): number | null {
  const clean = value.replace(/R\$|\s/g, "");
  if (!clean) return null;
  if (clean.includes(",")) return Math.abs(parseNumberBR(clean));
  const parsed = Number(clean);
  return Number.isFinite(parsed) ? Math.abs(parsed) : null;
}

function suggestionLabel(item: ParsedPdfTransaction): string {
  if (item.classificationHint === "SAME_OWNERSHIP") return "Possível mesma titularidade — revisar";
  const type = item.direction === "DEBIT" ? "DEBIT" : "CREDIT";
  return suggestTransactionClassification({ description: item.description, payer: item.payer, type })?.label
    || (type === "DEBIT" ? "Débito não compõe renda" : "Revisar manualmente");
}

export function PdfTransactionReviewTable({ transactions, onChange }: { transactions: ParsedPdfTransaction[]; onChange: (transactions: ParsedPdfTransaction[]) => void }) {
  const [confidence, setConfidence] = useState<ConfidenceFilter>("ALL");
  const [page, setPage] = useState("ALL");
  const [hideDebits, setHideDebits] = useState(false);
  const pages = useMemo(() => [...new Set(transactions.map((item) => item.pageNumber))].sort((a, b) => a - b), [transactions]);
  const visible = transactions.filter((item) => (page === "ALL" || item.pageNumber === Number(page)) && (confidence === "ALL" || confidenceLevel(item.confidence) === confidence) && (!hideDebits || item.direction !== "DEBIT"));
  const update = (id: string, patch: Partial<ParsedPdfTransaction>) => onChange(transactions.map((item) => item.id === id ? { ...item, ...patch } : item));
  return <div>
    <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <label className="text-xs font-semibold text-slate-600">Confiança<select className="mt-1 h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm" value={confidence} onChange={(event) => setConfidence(event.target.value as ConfidenceFilter)}><option value="ALL">Todas</option><option value="HIGH">Alta</option><option value="MEDIUM">Média</option><option value="LOW">Baixa</option></select></label>
      <label className="text-xs font-semibold text-slate-600">Página<select className="mt-1 h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm" value={page} onChange={(event) => setPage(event.target.value)}><option value="ALL">Todas</option>{pages.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      <label className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold"><input type="checkbox" checked={hideDebits} onChange={(event) => setHideDebits(event.target.checked)} /> Ocultar débitos</label>
      <button type="button" className="btn-secondary h-10" onClick={() => onChange(transactions.map((item) => ({ ...item, selected: item.direction === "CREDIT" && !item.duplicateOf && Boolean(item.date && item.amount) })))}>Selecionar somente créditos</button>
    </div>
    <div className="max-h-[46vh] overflow-auto rounded-xl border border-slate-200">
      <table className="min-w-[1480px] w-full text-left text-sm">
        <thead className="sticky top-0 z-10 bg-slate-100 text-xs text-slate-600"><tr><th className="p-3">Importar</th><th className="p-3">Data</th><th className="p-3">Competência</th><th className="min-w-64 p-3">Descrição</th><th className="min-w-44 p-3">Pagador/origem</th><th className="p-3">Valor</th><th className="p-3">Natureza</th><th className="p-3">Pág.</th><th className="p-3">Confiança</th><th className="min-w-52 p-3">Classificação sugerida</th><th className="min-w-56 p-3">Alertas</th><th className="p-3">Ações</th></tr></thead>
        <tbody className="divide-y divide-slate-100 bg-white">{visible.map((item) => <tr key={item.id} className={item.duplicateOf ? "bg-amber-50" : ""}>
          <td className="p-3 text-center"><input type="checkbox" aria-label="Importar movimentação" checked={item.selected} onChange={(event) => update(item.id, { selected: event.target.checked })} /></td>
          <td className="p-2"><input type="date" className="h-10 rounded-lg border border-slate-300 px-2" value={item.date || ""} onChange={(event) => update(item.id, { date: event.target.value || null, competence: event.target.value ? event.target.value.slice(0, 7) : null })} /></td>
          <td className="p-2"><input type="month" className="h-10 rounded-lg border border-slate-300 px-2" value={item.competence || ""} onChange={(event) => update(item.id, { competence: event.target.value || null })} /></td>
          <td className="p-2"><input className="h-10 w-full rounded-lg border border-slate-300 px-3" value={item.description} onChange={(event) => update(item.id, { description: event.target.value })} /></td>
          <td className="p-2"><input className="h-10 w-full rounded-lg border border-slate-300 px-3" value={item.payer} onChange={(event) => update(item.id, { payer: event.target.value })} placeholder="Opcional" /></td>
          <td className="p-2"><input className="h-10 w-32 rounded-lg border border-slate-300 px-3 text-right" value={item.amount ?? ""} onChange={(event) => update(item.id, { amount: parseEditableAmount(event.target.value) })} aria-label={`Valor, atual ${item.amount ? formatCurrencyBR(item.amount) : "vazio"}`} /></td>
          <td className="p-2"><select className="h-10 rounded-lg border border-slate-300 bg-white px-2" value={item.direction} onChange={(event) => update(item.id, { direction: event.target.value as TransactionDirection })}><option value="CREDIT">Crédito</option><option value="DEBIT">Débito</option><option value="UNKNOWN">Revisar</option></select></td>
          <td className="p-3 text-center">{item.pageNumber}</td>
          <td className="p-3"><span className={`rounded-full px-2 py-1 text-xs font-bold ${confidenceLevel(item.confidence) === "HIGH" ? "bg-emerald-100 text-emerald-800" : confidenceLevel(item.confidence) === "MEDIUM" ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800"}`}>{confidenceLabel(item.confidence)} {Math.round(item.confidence * 100)}%</span></td>
          <td className="p-3 text-xs font-semibold text-goodblue-800">{suggestionLabel(item)}</td>
          <td className="p-3 text-xs text-amber-800">{item.warnings.length ? item.warnings.join(" ") : "Sem alertas"}{item.duplicateOf && <details className="mt-1"><summary className="cursor-pointer font-semibold">Comparar duplicidade</summary><p className="mt-1">Coincide com o lançamento {item.duplicateOf}. Você ainda pode marcar a importação manualmente.</p></details>}</td>
          <td className="p-2"><div className="flex gap-1"><button type="button" className="rounded-lg p-2 text-goodblue-700 hover:bg-goodblue-50" title={item.rawText} aria-label="Ver texto original"><Eye className="h-4 w-4" /></button><button type="button" className="rounded-lg p-2 text-rose-700 hover:bg-rose-50" aria-label="Excluir linha" onClick={() => onChange(transactions.filter((candidate) => candidate.id !== item.id))}><Trash2 className="h-4 w-4" /></button></div></td>
        </tr>)}</tbody>
      </table>
      {!visible.length && <p className="p-8 text-center text-sm text-slate-500">Nenhuma movimentação corresponde aos filtros.</p>}
    </div>
  </div>;
}
