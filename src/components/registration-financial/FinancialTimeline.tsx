import { Pencil } from "lucide-react";
import { REGISTRATION_TRANSACTION_LABELS } from "../../lib/registration/financial/constants";
import { formatCentsBRL } from "../../lib/registration/financial/money";
import type { RegistrationFinancialTransaction } from "../../types/registrationFinancial";

export function FinancialTimeline({ transactions, disabled, onEdit }: { transactions: RegistrationFinancialTransaction[]; disabled: boolean; onEdit: (item: RegistrationFinancialTransaction) => void }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="financial-history-title">
      <div><h2 id="financial-history-title" className="text-lg font-bold text-slate-950">Histórico financeiro</h2><p className="mt-1 text-sm text-slate-500">Lançamentos em ordem cronológica, sem exclusão física.</p></div>
      {transactions.length === 0 ? <div className="mt-5 rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">Nenhum lançamento registrado.</div> : <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="border-y border-slate-200 bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-3 py-3">Data</th><th className="px-3 py-3">Tipo</th><th className="px-3 py-3">Descrição</th><th className="px-3 py-3">Beneficiário</th><th className="px-3 py-3 text-right">Valor</th><th className="px-3 py-3 text-right">Ações</th></tr></thead><tbody className="divide-y divide-slate-100">{transactions.map((item) => <tr key={item.id}><td className="px-3 py-3 whitespace-nowrap">{new Date(`${item.transactionDate}T12:00:00`).toLocaleDateString("pt-BR")}</td><td className="px-3 py-3 font-semibold">{REGISTRATION_TRANSACTION_LABELS[item.transactionType]}</td><td className="max-w-sm px-3 py-3 text-slate-600">{item.description || item.category || "Sem descrição"}</td><td className="px-3 py-3 text-slate-600">{item.beneficiary || "—"}</td><td className="px-3 py-3 text-right font-bold">{formatCentsBRL(item.amountCents)}</td><td className="px-3 py-3 text-right"><button type="button" disabled={disabled} onClick={() => onEdit(item)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-40" aria-label={`Editar lançamento de ${formatCentsBRL(item.amountCents)}`}><Pencil className="h-4 w-4" /></button></td></tr>)}</tbody></table></div>}
    </section>
  );
}
