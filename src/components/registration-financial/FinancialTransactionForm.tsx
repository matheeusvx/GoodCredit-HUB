import { useEffect, useMemo, useState } from "react";
import { Save, X } from "lucide-react";
import { REGISTRATION_TRANSACTION_LABELS } from "../../lib/registration/financial/constants";
import { formatCentsBRL } from "../../lib/registration/financial/money";
import { validateRegistrationTransaction } from "../../lib/registration/financial/validation";
import type { RegistrationFinancialOperationMode, RegistrationFinancialTransaction, RegistrationFinancialTransactionInput } from "../../types/registrationFinancial";
import { FinancialMoneyInput } from "./FinancialMoneyInput";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "../../lib/registration/financial/operationalConstants";

function today() { return new Date().toISOString().slice(0, 10); }
function blank(): RegistrationFinancialTransactionInput {
  return { transactionType: "INCOME", category: "", transactionDate: today(), amountCents: 0, advisoryAllocationCents: 0, costAllocationCents: 0, customerInterestCents: 0, customerTotalPaidCents: 0, adjustmentDirection: null, paymentMethod: "", installments: null, installmentAmountCents: null, cardBrand: "", beneficiary: "", referenceNumber: "", description: "", notes: "" };
}
function fromRecord(item: RegistrationFinancialTransaction): RegistrationFinancialTransactionInput {
  const { id: _id, caseId: _caseId, ownerId: _ownerId, createdAt: _createdAt, updatedAt: _updatedAt, ...input } = item;
  return input;
}

export function FinancialTransactionForm({ operationMode, editing, disabled, initialType = "INCOME", onCancelEdit, onSubmit }: {
  operationMode: RegistrationFinancialOperationMode; editing: RegistrationFinancialTransaction | null; disabled: boolean;
  initialType?: RegistrationFinancialTransactionInput["transactionType"];
  onCancelEdit: () => void; onSubmit: (input: RegistrationFinancialTransactionInput) => Promise<void>;
}) {
  const [input, setInput] = useState<RegistrationFinancialTransactionInput>(blank);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  useEffect(() => { setInput(editing ? fromRecord(editing) : { ...blank(), transactionType: initialType, adjustmentDirection: initialType === "ADJUSTMENT" ? "POSITIVE" : null }); setErrors([]); }, [editing, initialType]);
  const distributionRemaining = useMemo(() => input.amountCents - input.advisoryAllocationCents - input.costAllocationCents, [input]);

  function set<K extends keyof RegistrationFinancialTransactionInput>(key: K, value: RegistrationFinancialTransactionInput[K]) { setInput((current) => ({ ...current, [key]: value })); }
  async function submit() {
    const validation = validateRegistrationTransaction(operationMode, input);
    setErrors(validation);
    if (validation.length) return;
    setSaving(true);
    try { await onSubmit(input); setInput(blank()); } finally { setSaving(false); }
  }
  const inputClass = "h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-goodgreen-500 focus:ring-4 focus:ring-goodgreen-500/10";
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="transaction-form-title">
      <div className="flex items-center justify-between gap-3"><div><h2 id="transaction-form-title" className="text-lg font-bold text-slate-950">{editing ? "Editar lançamento" : "Novo lançamento"}</h2><p className="mt-1 text-sm text-slate-500">Registre apenas movimentações confirmadas no processo.</p></div>{editing && <button type="button" onClick={onCancelEdit} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Cancelar edição"><X className="h-5 w-5" /></button>}</div>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="text-sm font-semibold text-slate-700">Tipo<select className={`${inputClass} mt-2`} value={input.transactionType} disabled={disabled} onChange={(e) => { const type = e.target.value as RegistrationFinancialTransactionInput["transactionType"]; setInput((current) => ({ ...current, transactionType: type, advisoryAllocationCents: type === "INCOME" ? current.advisoryAllocationCents : 0, costAllocationCents: type === "INCOME" ? current.costAllocationCents : 0, adjustmentDirection: type === "ADJUSTMENT" ? "POSITIVE" : null })); }}>{Object.entries(REGISTRATION_TRANSACTION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="text-sm font-semibold text-slate-700">Data<input type="date" className={`${inputClass} mt-2`} value={input.transactionDate} disabled={disabled} onChange={(e) => set("transactionDate", e.target.value)} /></label>
        <label className="text-sm font-semibold text-slate-700">Valor líquido<div className="mt-2"><FinancialMoneyInput valueCents={input.amountCents} disabled={disabled} onChange={(value) => { setInput((current) => ({ ...current, amountCents: value, customerTotalPaidCents: Math.max(current.customerTotalPaidCents, value) })); }} /></div></label>
        <label className="text-sm font-semibold text-slate-700">Categoria<input list="registration-transaction-categories" className={`${inputClass} mt-2`} value={input.category} disabled={disabled} onChange={(e) => set("category", e.target.value)} placeholder="Selecione ou digite" /><datalist id="registration-transaction-categories">{(input.transactionType === "INCOME" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(category=><option key={category} value={category}/>)}</datalist></label>
        {input.transactionType === "INCOME" && <>
          <label className="text-sm font-semibold text-slate-700">Alocado à assessoria<div className="mt-2"><FinancialMoneyInput valueCents={input.advisoryAllocationCents} disabled={disabled} onChange={(value) => set("advisoryAllocationCents", value)} /></div></label>
          <label className="text-sm font-semibold text-slate-700">Alocado às custas<div className="mt-2"><FinancialMoneyInput valueCents={input.costAllocationCents} disabled={disabled || operationMode === "ADVISORY_ONLY"} onChange={(value) => set("costAllocationCents", value)} /></div></label>
          <label className="text-sm font-semibold text-slate-700">Juros do cliente<div className="mt-2"><FinancialMoneyInput valueCents={input.customerInterestCents} disabled={disabled} onChange={(value) => { set("customerInterestCents", value); set("customerTotalPaidCents", input.amountCents + value); }} /></div></label>
          <label className="text-sm font-semibold text-slate-700">Total pago pelo cliente<div className="mt-2"><FinancialMoneyInput valueCents={input.customerTotalPaidCents} disabled={disabled} onChange={(value) => set("customerTotalPaidCents", value)} /></div></label>
          <p className={`md:col-span-2 xl:col-span-4 rounded-lg px-3 py-2 text-sm font-semibold ${distributionRemaining === 0 ? "bg-goodgreen-50 text-goodgreen-800" : "bg-amber-50 text-amber-800"}`}>Diferença da distribuição: {formatCentsBRL(distributionRemaining)}. Os juros são informativos e não entram no saldo de custas.</p>
        </>}
        {input.transactionType === "ADJUSTMENT" && <label className="text-sm font-semibold text-slate-700">Direção<select className={`${inputClass} mt-2`} value={input.adjustmentDirection ?? "POSITIVE"} onChange={(e) => set("adjustmentDirection", e.target.value as "POSITIVE" | "NEGATIVE")}><option value="POSITIVE">Positivo</option><option value="NEGATIVE">Negativo</option></select></label>}
        <label className="text-sm font-semibold text-slate-700">Forma de pagamento<input className={`${inputClass} mt-2`} value={input.paymentMethod} disabled={disabled} onChange={(e) => set("paymentMethod", e.target.value)} /></label>
        <label className="text-sm font-semibold text-slate-700">Parcelas<input type="number" min="1" className={`${inputClass} mt-2`} value={input.installments ?? ""} disabled={disabled} onChange={(e) => set("installments", e.target.value ? Math.max(1, Number(e.target.value)) : null)} /></label>
        <label className="text-sm font-semibold text-slate-700">Valor da parcela<div className="mt-2"><FinancialMoneyInput valueCents={input.installmentAmountCents ?? 0} disabled={disabled} onChange={(value) => set("installmentAmountCents", value || null)} /></div></label>
        <label className="text-sm font-semibold text-slate-700">Bandeira do cartão<input className={`${inputClass} mt-2`} value={input.cardBrand} disabled={disabled} onChange={(e) => set("cardBrand", e.target.value)} /></label>
        <label className="text-sm font-semibold text-slate-700">Beneficiário<input className={`${inputClass} mt-2`} value={input.beneficiary} disabled={disabled} onChange={(e) => set("beneficiary", e.target.value)} /></label>
        <label className="text-sm font-semibold text-slate-700">Referência<input className={`${inputClass} mt-2`} value={input.referenceNumber} disabled={disabled} onChange={(e) => set("referenceNumber", e.target.value)} /></label>
        <label className="text-sm font-semibold text-slate-700 md:col-span-2 xl:col-span-4">Descrição<textarea className="mt-2 min-h-20 w-full rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-goodgreen-500 focus:ring-4 focus:ring-goodgreen-500/10" value={input.description} disabled={disabled} onChange={(e) => set("description", e.target.value)} /></label>
      </div>
      {errors.length > 0 && <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800" role="alert">{errors.map((error) => <p key={error}>{error}</p>)}</div>}
      <button type="button" disabled={disabled || saving} onClick={() => void submit()} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg bg-goodgreen-600 px-4 text-sm font-bold text-white transition hover:bg-goodgreen-700 disabled:opacity-50"><Save className="h-4 w-4" />{saving ? "Salvando..." : editing ? "Salvar alteração" : "Adicionar lançamento"}</button>
    </section>
  );
}
