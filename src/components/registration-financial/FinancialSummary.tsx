import { AlertTriangle, BadgeDollarSign, CircleDollarSign, ReceiptText, Wallet } from "lucide-react";
import { REGISTRATION_FINANCIAL_STATUS_LABELS } from "../../lib/registration/financial/constants";
import { formatCentsBRL } from "../../lib/registration/financial/money";
import type { RegistrationFinancialMetrics } from "../../types/registrationFinancial";

export function FinancialSummary({ metrics }: { metrics: RegistrationFinancialMetrics }) {
  const items = [
    { label: "Assessoria recebida", value: metrics.advisoryReceivedCents, icon: BadgeDollarSign, tone: "text-goodgreen-700" },
    { label: "Assessoria pendente", value: metrics.advisoryPendingCents, icon: ReceiptText, tone: "text-amber-700" },
    { label: "Recursos para custas", value: metrics.costFundsReceivedCents, icon: Wallet, tone: "text-sky-700" },
    { label: "Despesas GoodCredit", value: metrics.goodCreditExpensesCents, icon: CircleDollarSign, tone: "text-slate-700" },
    { label: "Saldo disponível", value: metrics.availableBalanceCents, icon: Wallet, tone: "text-goodgreen-700" },
    { label: "Complemento necessário", value: metrics.complementRequiredCents, icon: AlertTriangle, tone: "text-rose-700" }
  ];
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="financial-summary-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 id="financial-summary-title" className="text-lg font-bold text-slate-950">Resumo financeiro</h2><p className="mt-1 text-sm text-slate-500">Valores calculados a partir dos lançamentos registrados.</p></div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700">{REGISTRATION_FINANCIAL_STATUS_LABELS[metrics.status]}</span>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.map(({ label, value, icon: Icon, tone }) => <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-4"><div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><Icon className={`h-4 w-4 ${tone}`} />{label}</div><p className={`mt-2 text-lg font-bold ${tone}`}>{formatCentsBRL(value)}</p></div>)}
      </div>
      <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-3">
        <p>Pagamentos diretos: <strong className="text-slate-900">{formatCentsBRL(metrics.directCustomerPaymentsCents)}</strong></p>
        <p>Juros pagos pelo cliente: <strong className="text-slate-900">{formatCentsBRL(metrics.customerInterestCents)}</strong></p>
        <p>Saldo líquido de custas: <strong className="text-slate-900">{formatCentsBRL(metrics.costBalanceCents)}</strong></p>
      </div>
    </section>
  );
}
