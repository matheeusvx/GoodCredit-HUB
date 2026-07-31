import { useEffect, useMemo, useState } from "react";
import { Archive, ArrowLeft, FileDown, LockKeyhole, RotateCcw, Save } from "lucide-react";
import { FinancialMoneyInput } from "../components/registration-financial/FinancialMoneyInput";
import { FinancialSummary } from "../components/registration-financial/FinancialSummary";
import { FinancialTimeline } from "../components/registration-financial/FinancialTimeline";
import { FinancialTransactionForm } from "../components/registration-financial/FinancialTransactionForm";
import { calculateRegistrationFinancialMetrics } from "../lib/registration/financial/calculations";
import { DEFAULT_REGISTRATION_ADVISORY_FEE_CENTS, REGISTRATION_FINANCIAL_MODE_LABELS } from "../lib/registration/financial/constants";
import { formatCentsBRL } from "../lib/registration/financial/money";
import { navigateRegistration, registrationFinancialEditorPath } from "../lib/registration/financial/navigation";
import { generateRegistrationFinancialPdf } from "../lib/registration/financial/pdf";
import { validateRegistrationFinancialCase } from "../lib/registration/financial/validation";
import { archiveFinancialCase, createFinancialCase, createFinancialTransaction, finalizeFinancialCase, getMyFinancialCaseById, reopenFinancialCase, restoreFinancialCase, updateFinancialCase, updateFinancialTransaction } from "../services/registrationFinancialService";
import type { RegistrationFinancialCase, RegistrationFinancialCaseInput, RegistrationFinancialTransaction, RegistrationFinancialTransactionInput } from "../types/registrationFinancial";

function today() { return new Date().toISOString().slice(0, 10); }
const BLANK_CASE: RegistrationFinancialCaseInput = { clientName: "", processReference: "", registryOffice: "", city: "", operationMode: "FULL_PAYMENT_TO_GOODCREDIT", advisoryFeeExpectedCents: DEFAULT_REGISTRATION_ADVISORY_FEE_CENTS, estimatedItbiCents: 0, estimatedRegistryCents: 0, estimatedOtherCostsCents: 0, notes: "", openedAt: today() };
function toInput(item: RegistrationFinancialCase): RegistrationFinancialCaseInput { return { clientName: item.clientName, processReference: item.processReference, registryOffice: item.registryOffice, city: item.city, operationMode: item.operationMode, advisoryFeeExpectedCents: item.advisoryFeeExpectedCents, estimatedItbiCents: item.estimatedItbiCents, estimatedRegistryCents: item.estimatedRegistryCents, estimatedOtherCostsCents: item.estimatedOtherCostsCents, notes: item.notes, openedAt: item.openedAt }; }

export function RegistrationFinancialEditorPage({ caseId }: { caseId: string | null }) {
  const [input, setInput] = useState<RegistrationFinancialCaseInput>(BLANK_CASE);
  const [record, setRecord] = useState<RegistrationFinancialCase | null>(null);
  const [transactions, setTransactions] = useState<RegistrationFinancialTransaction[]>([]);
  const [editingTransaction, setEditingTransaction] = useState<RegistrationFinancialTransaction | null>(null);
  const [feeUnlocked, setFeeUnlocked] = useState(false);
  const [loading, setLoading] = useState(Boolean(caseId));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const metrics = useMemo(() => calculateRegistrationFinancialMetrics(record ?? ({ ...input, id: "new", ownerId: "", financialFinalizedAt: null, archivedAt: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } satisfies RegistrationFinancialCase), transactions), [input, record, transactions]);
  const locked = Boolean(record?.archivedAt || record?.financialFinalizedAt);

  async function load(id = caseId) {
    if (!id) return;
    setLoading(true); setMessage("");
    try { const detail = await getMyFinancialCaseById(id); setRecord(detail.financialCase); setInput(toInput(detail.financialCase)); setTransactions(detail.transactions); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível carregar o balancete."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, [caseId]);
  function set<K extends keyof RegistrationFinancialCaseInput>(key: K, value: RegistrationFinancialCaseInput[K]) { setInput((current) => ({ ...current, [key]: value })); }
  async function save() {
    const errors = validateRegistrationFinancialCase(input);
    if (errors.length) { setMessage(errors.join(" ")); return; }
    setSaving(true); setMessage("");
    try {
      if (!caseId) { const id = await createFinancialCase(input); navigateRegistration(registrationFinancialEditorPath(id), true); }
      else { await updateFinancialCase(caseId, input); await load(caseId); setMessage("Balancete salvo com segurança."); }
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível salvar o balancete."); }
    finally { setSaving(false); }
  }
  async function submitTransaction(transaction: RegistrationFinancialTransactionInput) {
    if (!caseId) { setMessage("Salve o balancete antes de registrar lançamentos."); return; }
    if (editingTransaction) await updateFinancialTransaction(editingTransaction.id, transaction); else await createFinancialTransaction(caseId, transaction);
    setEditingTransaction(null); await load(caseId); setMessage("Lançamento registrado.");
  }
  async function toggleFinalized() {
    if (!caseId || !record) return;
    const reopening = Boolean(record.financialFinalizedAt);
    if (!window.confirm(reopening ? "Deseja reabrir este balancete para novos lançamentos?" : "Deseja finalizar a conciliação financeira deste balancete?")) return;
    try { if (reopening) await reopenFinancialCase(caseId); else await finalizeFinancialCase(caseId); await load(caseId); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível alterar a finalização."); }
  }
  async function toggleArchived() {
    if (!caseId || !record) return;
    const restoring = Boolean(record.archivedAt);
    if (!restoring && !window.confirm("Deseja arquivar este balancete?")) return;
    try { if (restoring) await restoreFinancialCase(caseId); else await archiveFinancialCase(caseId); await load(caseId); }
    catch { setMessage("Não foi possível alterar o arquivamento."); }
  }
  function pdf() { if (!record) return; void generateRegistrationFinancialPdf({ financialCase: record, transactions, metrics }); }
  const inputClass = "h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-goodgreen-500 focus:ring-4 focus:ring-goodgreen-500/10 disabled:bg-slate-100";
  if (loading) return <div className="rounded-lg border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Carregando balancete...</div>;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><button type="button" onClick={() => navigateRegistration("/registro?ferramenta=balancete")} className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-950"><ArrowLeft className="h-4 w-4" />Voltar aos balancetes</button><h2 className="text-2xl font-bold text-slate-950">{caseId ? "Balancete Cartorial" : "Novo Balancete Cartorial"}</h2><p className="mt-1 text-sm text-slate-600">Controle financeiro interno vinculado à conta autenticada.</p></div><div className="flex flex-wrap gap-2">{record && <><button type="button" onClick={pdf} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 text-sm font-bold text-sky-800"><FileDown className="h-4 w-4" />Gerar PDF</button><button type="button" onClick={() => void toggleFinalized()} disabled={Boolean(record.archivedAt)} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 disabled:opacity-40">{record.financialFinalizedAt ? <RotateCcw className="h-4 w-4" /> : <LockKeyhole className="h-4 w-4" />}{record.financialFinalizedAt ? "Reabrir" : "Finalizar"}</button><button type="button" onClick={() => void toggleArchived()} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700">{record.archivedAt ? <RotateCcw className="h-4 w-4" /> : <Archive className="h-4 w-4" />}{record.archivedAt ? "Restaurar" : "Arquivar"}</button></>}</div></div>
      {message && <div aria-live="polite" className={`rounded-lg border px-4 py-3 text-sm ${message.includes("salvo") || message.includes("registrado") ? "border-goodgreen-200 bg-goodgreen-50 text-goodgreen-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}>{message}</div>}
      {locked && <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">Este balancete está {record?.archivedAt ? "arquivado" : "finalizado"}. Reabra ou restaure para editar dados e lançamentos.</div>}
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><div><h3 className="text-lg font-bold text-slate-950">Identificação do processo</h3><p className="mt-1 text-sm text-slate-500">Dados operacionais sem documentos pessoais ou bancários.</p></div><div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <label className="text-sm font-semibold text-slate-700">Nome do cliente *<input className={`${inputClass} mt-2`} value={input.clientName} disabled={locked} onChange={(e) => set("clientName", e.target.value)} /></label>
        <label className="text-sm font-semibold text-slate-700">Referência do processo<input className={`${inputClass} mt-2`} value={input.processReference} disabled={locked} onChange={(e) => set("processReference", e.target.value)} /></label>
        <label className="text-sm font-semibold text-slate-700">Data de abertura<input type="date" className={`${inputClass} mt-2`} value={input.openedAt} disabled={locked} onChange={(e) => set("openedAt", e.target.value)} /></label>
        <label className="text-sm font-semibold text-slate-700">Cartório<input className={`${inputClass} mt-2`} value={input.registryOffice} disabled={locked} onChange={(e) => set("registryOffice", e.target.value)} /></label>
        <label className="text-sm font-semibold text-slate-700">Cidade<input className={`${inputClass} mt-2`} value={input.city} disabled={locked} onChange={(e) => set("city", e.target.value)} /></label>
        <label className="text-sm font-semibold text-slate-700">Modalidade<select className={`${inputClass} mt-2`} value={input.operationMode} disabled={locked || transactions.length > 0} onChange={(e) => set("operationMode", e.target.value as RegistrationFinancialCaseInput["operationMode"])}>{Object.entries(REGISTRATION_FINANCIAL_MODE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      </div></section>
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-bold text-slate-950">Valores previstos</h3><p className="mt-1 text-sm text-slate-500">Estimativas para acompanhamento; os lançamentos confirmados formam o saldo real.</p></div>{!feeUnlocked && !locked && <button type="button" className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700" onClick={() => { if (window.confirm("Deseja alterar o valor padrão da assessoria deste processo?")) setFeeUnlocked(true); }}>Alterar valor da assessoria</button>}</div><div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MoneyField label="Assessoria prevista" value={input.advisoryFeeExpectedCents} disabled={locked || !feeUnlocked} onChange={(value) => set("advisoryFeeExpectedCents", value)} /><MoneyField label="ITBI estimado" value={input.estimatedItbiCents} disabled={locked} onChange={(value) => set("estimatedItbiCents", value)} /><MoneyField label="Registro estimado" value={input.estimatedRegistryCents} disabled={locked} onChange={(value) => set("estimatedRegistryCents", value)} /><MoneyField label="Outras custas estimadas" value={input.estimatedOtherCostsCents} disabled={locked} onChange={(value) => set("estimatedOtherCostsCents", value)} /></div><label className="mt-4 block text-sm font-semibold text-slate-700">Observações gerais<textarea className="mt-2 min-h-24 w-full rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-goodgreen-500 focus:ring-4 focus:ring-goodgreen-500/10 disabled:bg-slate-100" value={input.notes} disabled={locked} onChange={(e) => set("notes", e.target.value)} /></label><button type="button" onClick={() => void save()} disabled={locked || saving} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg bg-goodgreen-600 px-4 text-sm font-bold text-white disabled:opacity-50"><Save className="h-4 w-4" />{saving ? "Salvando..." : caseId ? "Salvar alterações" : "Criar balancete"}</button></section>
      <FinancialSummary metrics={metrics} />
      {caseId && <FinancialTransactionForm operationMode={input.operationMode} editing={editingTransaction} disabled={locked} onCancelEdit={() => setEditingTransaction(null)} onSubmit={submitTransaction} />}
      {caseId && <FinancialTimeline transactions={transactions} disabled={locked} onEdit={setEditingTransaction} />}
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">Pagamentos realizados diretamente pelo cliente são informativos. Juros de cartão não integram recursos da GoodCredit, não compõem o saldo de custas e não aumentam valores de devolução.</div>
    </div>
  );
}

function MoneyField({ label, value, disabled, onChange }: { label: string; value: number; disabled: boolean; onChange: (value: number) => void }) { return <label className="text-sm font-semibold text-slate-700">{label}<div className="mt-2"><FinancialMoneyInput valueCents={value} disabled={disabled} onChange={onChange} /></div>{disabled && label === "Assessoria prevista" && <span className="mt-1 block text-xs font-normal text-slate-500">Padrão: {formatCentsBRL(DEFAULT_REGISTRATION_ADVISORY_FEE_CENTS)}</span>}</label>; }
