import { Copy, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { BankTransaction, TransactionClassification } from "../../types/incomeAnalysis";
import { formatCompetence, formatCurrencyBR } from "../../lib/income-analysis/formatters";
import { ClassificationReasonSelect } from "./ClassificationReasonSelect";
import { ClassificationSelect } from "./ClassificationSelect";

export function TransactionTable({ transactions, onChange }: { transactions: BankTransaction[]; onChange: (transactions: BankTransaction[]) => void }) {
  const [month, setMonth] = useState("");
  const [account, setAccount] = useState("");
  const [classification, setClassification] = useState("");
  const [search, setSearch] = useState("");
  const [hideDebits, setHideDebits] = useState(true);
  const accounts = Array.from(new Set(transactions.map((item) => item.account).filter(Boolean)));
  const filtered = useMemo(
    () => transactions
      .filter((item) => (!month || item.competence === month) && (!account || item.account === account) && (!classification || item.classification === classification) && (!hideDebits || item.type === "CREDIT") && (!search || `${item.description} ${item.payer}`.toLowerCase().includes(search.toLowerCase())))
      .sort((a, b) => a.date.localeCompare(b.date)),
    [transactions, month, account, classification, search, hideDebits]
  );
  const selected = transactions.filter((item) => item.selected);
  function update(id: string, patch: Partial<BankTransaction>) { onChange(transactions.map((item) => item.id === id ? { ...item, ...patch, classificationSource: "MANUAL" } : item)); }
  function bulkClassify(value: TransactionClassification) { onChange(transactions.map((item) => item.selected ? { ...item, classification: value, reason: "", classificationSource: "MANUAL" } : item)); }
  function bulkDelete() { if (selected.length && window.confirm(`Excluir ${selected.length} movimentações selecionadas?`)) onChange(transactions.filter((item) => !item.selected)); }

  return <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
    <div className="p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-xl font-bold">Movimentações</h2><p className="mt-1 text-sm text-slate-500">{transactions.length} lançamentos normalizados</p></div>
        {selected.length > 0 && <div className="flex flex-wrap gap-2"><select className="h-11 rounded-lg border px-3 text-sm font-semibold" defaultValue="" onChange={(e) => e.target.value && bulkClassify(e.target.value as TransactionClassification)}><option value="">Classificar {selected.length} selecionados</option><option value="INCLUDE">Considerar</option><option value="EXCLUDE">Desconsiderar</option><option value="REVIEW">Revisar</option></select><button type="button" className="btn-muted text-rose-700" onClick={bulkDelete}><Trash2 className="h-4 w-4" /> Excluir</button></div>}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <input className="h-11 rounded-lg border border-slate-300 px-3 text-sm" placeholder="Pesquisar descrição ou pagador" value={search} onChange={(e) => setSearch(e.target.value)} />
        <input type="month" className="h-11 rounded-lg border border-slate-300 px-3 text-sm" value={month} onChange={(e) => setMonth(e.target.value)} />
        <select className="h-11 rounded-lg border border-slate-300 px-3 text-sm" value={account} onChange={(e) => setAccount(e.target.value)}><option value="">Todas as contas</option>{accounts.map((value) => <option key={value}>{value}</option>)}</select>
        <select className="h-11 rounded-lg border border-slate-300 px-3 text-sm" value={classification} onChange={(e) => setClassification(e.target.value)}><option value="">Todas as classificações</option><option value="INCLUDE">Considerar</option><option value="EXCLUDE">Desconsiderar</option><option value="REVIEW">Revisar</option></select>
        <label className="flex h-11 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm"><input type="checkbox" checked={hideDebits} onChange={(e) => setHideDebits(e.target.checked)} />Ocultar débitos</label>
      </div>
    </div>
    <div className="max-h-[620px] overflow-auto border-t">
      <table className="min-w-[1600px] w-full text-sm"><thead className="sticky top-0 z-10 bg-slate-100 text-left text-xs font-bold text-slate-600"><tr>{["", "Data", "Competência", "Descrição", "Pagador/origem", "Conta", "Valor", "Classificação", "Motivo", "Observação", "Ações"].map((head) => <th key={head} className="px-3 py-3">{head}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100">{filtered.map((item) => <tr key={item.id} className={item.classification === "INCLUDE" ? "bg-emerald-50/40" : item.classification === "EXCLUDE" ? "bg-rose-50/40" : "bg-amber-50/40"}>
          <td className="px-3 py-3"><input type="checkbox" checked={item.selected} onChange={(e) => update(item.id, { selected: e.target.checked })} /></td>
          <td className="px-3 py-3"><input type="date" className="h-10 rounded-lg border px-2" value={item.date} onChange={(e) => update(item.id, { date: e.target.value })} /></td>
          <td className="px-3 py-3">{formatCompetence(item.competence)}</td>
          <td className="max-w-72 px-3 py-3"><input className="h-10 w-64 rounded-lg border px-3 font-semibold" value={item.description} onChange={(e) => update(item.id, { description: e.target.value })} />{item.suggestion && <button type="button" className="mt-1 block rounded-full bg-blue-100 px-2 py-1 text-[10px] font-bold text-blue-700" onClick={() => update(item.id, { classification: item.suggestion!.classification, reason: item.suggestion!.reason })}>Confirmar sugestão: {item.suggestion.label}</button>}</td>
          <td className="px-3 py-3"><input className="h-10 w-44 rounded-lg border px-3" value={item.payer} onChange={(e) => update(item.id, { payer: e.target.value })} /></td>
          <td className="px-3 py-3">{item.account || "—"}</td><td className="px-3 py-3 font-bold">{formatCurrencyBR(item.amount)}</td>
          <td className="px-3 py-3"><ClassificationSelect value={item.classification} onChange={(value) => update(item.id, { classification: value, reason: "" })} /></td>
          <td className="px-3 py-3"><ClassificationReasonSelect classification={item.classification} value={item.reason} onChange={(reason) => update(item.id, { reason })} /></td>
          <td className="px-3 py-3"><input className="h-10 w-48 rounded-lg border px-3" value={item.note} onChange={(e) => update(item.id, { note: e.target.value })} /></td>
          <td className="px-3 py-3"><div className="flex gap-1"><button type="button" title="Duplicar" className="rounded-lg p-2 text-blue-700 hover:bg-blue-50" onClick={() => onChange([...transactions, { ...item, id: `copy-${Date.now()}`, selected: false }])}><Copy className="h-4 w-4" /></button><button type="button" title="Excluir" className="rounded-lg p-2 text-rose-700 hover:bg-rose-50" onClick={() => window.confirm("Excluir esta movimentação?") && onChange(transactions.filter((value) => value.id !== item.id))}><Trash2 className="h-4 w-4" /></button></div></td>
        </tr>)}</tbody>
      </table>{!filtered.length && <p className="p-8 text-center text-sm text-slate-500">Nenhuma movimentação encontrada.</p>}
    </div>
  </section>;
}
