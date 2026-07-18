import { RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { evaluateFgtsEligibility } from "../../lib/fgts/eligibilityEngine";
import { buildFgtsWhatsAppMessage } from "../../lib/fgts/fgtsMessageBuilder";
import { generateFgtsPdf } from "../../lib/fgts/fgtsPdfGenerator";
import { FGTS_INSTITUTIONAL_NOTICE, FGTS_RULES } from "../../lib/fgts/fgtsRules";
import { estimateIncomeFromFgts } from "../../lib/fgts/incomeEstimator";
import { projectFgtsContributions } from "../../lib/fgts/projectionEngine";
import type { FgtsAmortizationEvent, FgtsAmortizationPrefill, FgtsModuleState } from "../../types/fgts";
import { FgtsAmortizationPlanner } from "./FgtsAmortizationPlanner";
import { FgtsDocumentChecklist } from "./FgtsDocumentChecklist";
import { FgtsEligibilityCard } from "./FgtsEligibilityCard";
import { FgtsIncomeEstimator } from "./FgtsIncomeEstimator";
import { FgtsInstallmentPaymentInfo } from "./FgtsInstallmentPaymentInfo";
import { FgtsOverview } from "./FgtsOverview";
import { FgtsResultPanel } from "./FgtsResultPanel";

const STATE_KEY = "goodcredit_fgts_state";
const DOC_KEY = "goodcredit_fgts_document_checklist";
const PREFILL_KEY = "goodcredit_fgts_amortization_prefill";
const STATE_VERSION = 2;
const PERIODICITY_MONTHS = FGTS_RULES.minimumAmortizationIntervalMonths;

const initialState: FgtsModuleState = {
  clientName: "",
  eligibility: { employmentThreeYears: "UNKNOWN", activeSfhFinancing: "UNKNOWN", ownsHomeResidenceCity: "UNKNOWN", ownsHomeWorkCity: "UNKNOWN", ownsHomeNearbyCity: "UNKNOWN", ownsHomeOtherState: "UNKNOWN", otherStateHomePaid: "UNKNOWN", ownHousingPurpose: "UNKNOWN", contractEligible: "UNKNOWN", usageMode: "", installmentsCurrent: "NOT_APPLICABLE" },
  income: { payslipCompetence: "", payslipGross: 0, depositCompetence: "", monthlyDeposit: 0, employmentType: "REGULAR", contributionRate: FGTS_RULES.standardEmployeeRate, criterion: "HIGHEST", manualIncome: 0, regularMonthlyDeposit: true, sameCompetence: true, notThirteenthSalary: true, notVacationPayment: true, notRetroactiveAdjustment: true, notAccumulatedPayment: true, rateConfirmed: true },
  projection: { contractDate: "", lastUsageDate: "", neverUsed: true, currentBalance: 0, monthlyDeposit: 0, remainingTermMonths: 360, firstContributionMonth: 24, periodicityMonths: PERIODICITY_MONTHS, contributionMode: "FIXED", fixedAmount: 0 },
  customEvents: [],
};

function normalizeEvents(events: FgtsAmortizationEvent[], firstMonth: number): FgtsAmortizationEvent[] {
  return events.map((event, index) => ({ ...event, eventNumber: index + 1, month: firstMonth + index * PERIODICITY_MONTHS }));
}

function loadState(): FgtsModuleState {
  try {
    const parsed = JSON.parse(localStorage.getItem(STATE_KEY) || "{}");
    const legacy = (parsed.data || parsed) as Partial<FgtsModuleState> & { income?: Partial<FgtsModuleState["income"]> & { notAtypicalPayment?: boolean }; projection?: Partial<FgtsModuleState["projection"]> & { advancedPeriodicity?: boolean } };
    const oldAtypicalCheck = legacy.income?.notAtypicalPayment ?? true;
    const { advancedPeriodicity: _advancedPeriodicity, ...legacyProjection } = legacy.projection || {};
    const { notAtypicalPayment: _notAtypicalPayment, ...legacyIncome } = legacy.income || {};
    const projection = { ...initialState.projection, ...legacyProjection, periodicityMonths: PERIODICITY_MONTHS };
    const customEvents = normalizeEvents(Array.isArray(legacy.customEvents) ? legacy.customEvents : [], projection.firstContributionMonth);
    return {
      clientName: typeof legacy.clientName === "string" ? legacy.clientName : "",
      eligibility: { ...initialState.eligibility, ...legacy.eligibility },
      income: { ...initialState.income, ...legacyIncome, notVacationPayment: legacy.income?.notVacationPayment ?? oldAtypicalCheck, notRetroactiveAdjustment: legacy.income?.notRetroactiveAdjustment ?? oldAtypicalCheck, notAccumulatedPayment: legacy.income?.notAccumulatedPayment ?? oldAtypicalCheck, criterion: "HIGHEST", manualIncome: 0 },
      projection,
      customEvents,
    };
  } catch {
    return initialState;
  }
}

function loadDocs(): Record<string, boolean> { try { return JSON.parse(localStorage.getItem(DOC_KEY) || "{}"); } catch { return {}; } }

export function FgtsPage({ onSendToAmortization }: { onSendToAmortization: () => void }) {
  const [state, setState] = useState(loadState);
  const [checked, setChecked] = useState(loadDocs);
  const [notice, setNotice] = useState("");
  const eligibility = useMemo(() => evaluateFgtsEligibility(state.eligibility), [state.eligibility]);
  const incomeResult = useMemo(() => estimateIncomeFromFgts(state.income), [state.income]);
  const generatedProjection = useMemo(() => projectFgtsContributions(state.projection), [state.projection]);
  const events = state.customEvents.length ? state.customEvents : generatedProjection.events;
  const projection = { ...generatedProjection, events, totalProjected: events.filter((event) => event.active).reduce((sum, event) => sum + event.amount, 0) };

  useEffect(() => { localStorage.setItem(STATE_KEY, JSON.stringify({ version: STATE_VERSION, data: state })); }, [state]);
  useEffect(() => { localStorage.setItem(DOC_KEY, JSON.stringify(checked)); }, [checked]);

  function updateProjection(next: FgtsModuleState["projection"]) {
    const normalized = { ...next, periodicityMonths: PERIODICITY_MONTHS };
    const generated = projectFgtsContributions(normalized);
    setState((current) => ({ ...current, projection: normalized, customEvents: generated.events }));
  }
  async function copySummary() { await navigator.clipboard.writeText(buildFgtsWhatsAppMessage({ clientName: state.clientName, usageMode: state.eligibility.usageMode, eligibility, eligibilityForm: state.eligibility, incomeForm: state.income, incomeResult, projection, checkedDocuments: checked })); setNotice("Resumo copiado para a área de transferência."); }
  function send() { const prefill: FgtsAmortizationPrefill = { clientName: state.clientName, periodicityMonths: PERIODICITY_MONTHS, nextEligibleDate: projection.nextEligibleDate, events: projection.events.filter((event) => event.active && event.amount > 0).map((event) => ({ month: event.month, amount: event.amount, source: "FGTS" })) }; localStorage.setItem(PREFILL_KEY, JSON.stringify(prefill)); onSendToAmortization(); }
  function clear() { if (!window.confirm("Deseja apagar a análise de FGTS salva neste navegador?")) return; localStorage.removeItem(STATE_KEY); localStorage.removeItem(DOC_KEY); setState(initialState); setChecked({}); setNotice("Análise limpa."); }
  const pdfData = { clientName: state.clientName, usageMode: state.eligibility.usageMode, eligibility, eligibilityForm: state.eligibility, incomeForm: state.income, incomeResult, projection, checkedDocuments: checked };

  return <main className="mx-auto flex max-w-[1700px] flex-col gap-6 px-4 py-6 sm:px-6 xl:px-8"><header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-bold text-goodgreen-700">GoodCredit Hub</p><h1 className="mt-1 text-3xl font-bold text-slate-950">Uso de FGTS</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Consulte regras, estime renda e simule a utilização do FGTS no financiamento imobiliário.</p></div><button type="button" className="btn-muted" onClick={clear}><RotateCcw className="h-4 w-4" /> Limpar Análise</button></header>{notice && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}<label className="rounded-lg border border-slate-200 bg-white p-5 text-sm font-semibold shadow-sm">Nome do cliente ou processo (opcional)<input className="mt-2 h-12 w-full rounded-lg border border-slate-300 px-3 font-normal outline-none focus:border-goodgreen-500 focus:ring-4 focus:ring-goodgreen-500/10" value={state.clientName} onChange={(event) => setState({ ...state, clientName: event.target.value })} placeholder="Identificação interna, sem dados sensíveis" /></label><FgtsOverview /><FgtsEligibilityCard form={state.eligibility} result={eligibility} onChange={(value) => setState({ ...state, eligibility: value })} /><FgtsIncomeEstimator form={state.income} result={incomeResult} onChange={(value) => setState({ ...state, income: value })} /><FgtsAmortizationPlanner form={state.projection} result={projection} events={events} onFormChange={updateProjection} onEventsChange={(customEvents) => setState({ ...state, customEvents: normalizeEvents(customEvents, state.projection.firstContributionMonth) })} /><FgtsInstallmentPaymentInfo /><FgtsDocumentChecklist checked={checked} onChange={setChecked} /><FgtsResultPanel usageMode={state.eligibility.usageMode} eligibility={eligibility} incomeForm={state.income} incomeResult={incomeResult} projection={projection} checked={checked} onCopy={copySummary} onPdf={() => generateFgtsPdf(pdfData)} onSend={send} /><div className="rounded-lg border border-goodblue-100 bg-goodblue-50 p-4 text-sm leading-6 text-goodblue-800">{FGTS_INSTITUTIONAL_NOTICE}</div></main>;
}
