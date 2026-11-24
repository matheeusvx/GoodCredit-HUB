import { AlertTriangle, ChevronDown, Download, LoaderCircle, RotateCcw, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { processCtpsPdf, validateCtpsPdf } from "../../../lib/profile-analysis/ctps/ctpsDocumentProcessor";
import { downloadCtpsSummaryPdf } from "../../../lib/profile-analysis/ctps/ctpsPdfReport";
import {
  CTPS_CONFIDENCE_LABEL,
  CTPS_CONTRACT_LABEL,
  CTPS_STATUS_LABEL,
  employmentDuration,
  formatCtpsCurrency,
  formatCtpsDate,
  formatEmploymentDuration,
  maskCtpsCpf,
} from "../../../lib/profile-analysis/ctps/ctpsPresentation";
import { BackLink } from "../../ui/BackLink";
import { PageHeader } from "../../ui/PageHeader";
import { StatTile } from "../../ui/StatTile";
import type { CtpsAnalysis, CtpsDocumentProcessingProgress, CtpsEmployment } from "../../../types/ctpsAnalysis";

const INITIAL_PROGRESS: CtpsDocumentProcessingProgress = { stage: "READING", label: "Lendo documento...", progress: 0 };

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) return String(error.message);
  return "Não foi possível analisar a Carteira de Trabalho. Verifique o PDF e tente novamente.";
}

function Field({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs text-ink-muted">{label}</dt><dd className="mt-0.5 text-sm font-medium text-ink">{value}</dd></div>;
}

function EmploymentDetails({ employment, referenceDate }: { employment: CtpsEmployment; referenceDate: string }) {
  return (
    <details className="group rounded-xl border border-slate-200/80 bg-white shadow-sm transition-shadow open:shadow-panel">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-goodgreen-500 sm:p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="truncate font-semibold text-ink">{employment.employer.name || "Empregador não identificado"}</h4>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${employment.status === "ACTIVE" ? "bg-goodgreen-50 text-goodgreen-700" : "bg-slate-100 text-ink-muted"}`}>{CTPS_STATUS_LABEL[employment.status]}</span>
          </div>
          <p className="mt-1 text-sm text-ink-muted">{employment.currentPosition || "Cargo não identificado"} · {formatCtpsCurrency(employment.currentSalary?.amount)}</p>
        </div>
        <ChevronDown className="h-5 w-5 shrink-0 text-slate-400 transition group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="border-t border-slate-100 p-4 sm:p-5">
        <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Field label="Empregador" value={employment.employer.name || "—"} />
          <Field label="CNPJ" value={employment.employer.cnpj || "—"} />
          <Field label="Estabelecimento" value={employment.establishment.name || "—"} />
          <Field label="CNPJ do estabelecimento" value={employment.establishment.cnpj || "—"} />
          <Field label="Admissão" value={formatCtpsDate(employment.admissionDate)} />
          <Field label="Desligamento" value={formatCtpsDate(employment.terminationDate)} />
          <Field label="Cargo atual" value={employment.currentPosition || "—"} />
          <Field label="CBO" value={employment.currentCbo || "—"} />
          <Field label="Tipo de contrato" value={CTPS_CONTRACT_LABEL[employment.contractType]} />
          <Field label="Tipo de admissão" value={employment.admissionType || "—"} />
          <Field label="Relação de trabalho" value={employment.employmentRelation || "—"} />
          <Field label="Tempo de vínculo" value={formatEmploymentDuration(employmentDuration(employment.admissionDate, employment.terminationDate, referenceDate))} />
        </dl>

        <div className="mt-6 grid gap-5 xl:grid-cols-2">
          <div>
            <h5 className="text-[13px] font-semibold text-ink">Histórico salarial</h5>
            <div className="mt-2 space-y-2">
              {employment.salaryHistory.length ? employment.salaryHistory.map((salary, index) => (
                <div key={`${salary.recordedAt}-${salary.amount}-${index}`} className="rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-ink-soft">
                  <strong>{formatCtpsCurrency(salary.amount)}</strong> · vigência {formatCtpsDate(salary.effectiveFrom)}
                  {salary.recordedAt !== salary.effectiveFrom && <span className="block text-xs text-slate-500">Registrado em {formatCtpsDate(salary.recordedAt)}</span>}
                </div>
              )) : <p className="text-[13px] text-ink-muted">Sem anotações salariais estruturadas.</p>}
            </div>
          </div>
          <div>
            <h5 className="text-[13px] font-semibold text-ink">Histórico de cargos e contrato</h5>
            <div className="mt-2 space-y-2">
              {[...employment.positionHistory.map((item) => ({ date: item.from, text: `Cargo: ${item.title}` })), ...employment.contractHistory.map((item) => ({ date: item.from, text: `Contrato: ${CTPS_CONTRACT_LABEL[item.type]}` }))]
                .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
                .map((item, index) => <div key={`${item.date}-${index}`} className="rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-ink-soft"><strong>{formatCtpsDate(item.date)}</strong> · {item.text}</div>)}
              {!employment.positionHistory.length && !employment.contractHistory.length && <p className="text-[13px] text-ink-muted">Sem alterações estruturadas.</p>}
            </div>
          </div>
          <div>
            <h5 className="text-[13px] font-semibold text-ink">Férias</h5>
            <div className="mt-2 space-y-2">
              {employment.vacations.length ? employment.vacations.map((vacation, index) => <div key={`${vacation.recordedAt}-${index}`} className="rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-ink-soft">{formatCtpsDate(vacation.startDate)} a {formatCtpsDate(vacation.endDate)}</div>) : <p className="text-[13px] text-ink-muted">Nenhuma anotação de férias estruturada.</p>}
            </div>
          </div>
          <div>
            <h5 className="text-[13px] font-semibold text-ink">Eventos relevantes</h5>
            <div className="mt-2 max-h-56 space-y-2 overflow-y-auto pr-1">
              {employment.events.map((event, index) => <div key={`${event.type}-${event.recordedAt}-${index}`} className="rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-ink-soft"><strong>{formatCtpsDate(event.recordedAt)}</strong> · {event.originalText}</div>)}
            </div>
          </div>
        </div>
      </div>
    </details>
  );
}

function CtpsResult({ analysis }: { analysis: CtpsAnalysis }) {
  const active = analysis.employments.filter((employment) => employment.status === "ACTIVE");
  const terminated = analysis.employments.filter((employment) => employment.status === "TERMINATED");
  return (
    <div className="space-y-6">
      <section className="surface p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-ink">{analysis.holder.name || "Titular não identificado"}</h2>
            <p className="mt-1 text-sm text-ink-muted">CPF {maskCtpsCpf(analysis.holder.cpf)} · confiança {CTPS_CONFIDENCE_LABEL[analysis.document.confidence].toLowerCase()}</p>
          </div>
          <button type="button" className="btn-secondary w-fit" onClick={() => downloadCtpsSummaryPdf(analysis)}><Download className="h-4 w-4" /> Baixar resumo em PDF</button>
        </div>
      </section>

      <section aria-labelledby="ctps-summary">
        <h2 id="ctps-summary" className="text-base font-bold text-ink">Resumo profissional</h2>
        <div className="stagger mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatTile label="Vínculos ativos" value={String(analysis.summary.activeEmploymentCount)} />
          <StatTile label="Salários contratuais vigentes" value={formatCtpsCurrency(analysis.summary.currentContractualIncome)} tone="green" emphasis />
          <StatTile label="Vínculo ativo mais antigo" value={formatCtpsDate(analysis.summary.oldestActiveAdmissionDate)} />
        </div>
      </section>

      <section className="space-y-3"><div><h2 className="text-base font-bold text-ink">Vínculos atuais</h2><p className="text-[13px] text-ink-muted">Contratos identificados como abertos no documento.</p></div>{active.length ? active.map((employment) => <EmploymentDetails key={employment.id} employment={employment} referenceDate={analysis.document.documentSignedAt || analysis.document.analysisDate} />) : <p className="surface p-5 text-sm text-ink-muted">Nenhum vínculo ativo identificado.</p>}</section>
      <section className="space-y-3"><div><h2 className="text-base font-bold text-ink">Histórico profissional</h2><p className="text-[13px] text-ink-muted">Vínculos encerrados e respectivos históricos.</p></div>{terminated.length ? terminated.map((employment) => <EmploymentDetails key={employment.id} employment={employment} referenceDate={analysis.document.documentSignedAt || analysis.document.analysisDate} />) : <p className="surface p-5 text-sm text-ink-muted">Nenhum vínculo encerrado identificado.</p>}</section>

      {analysis.alerts.length > 0 && <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 sm:p-6"><h2 className="font-bold text-amber-950">Alertas e inconsistências</h2><div className="mt-4 space-y-2">{analysis.alerts.map((alert, index) => <div key={`${alert.code}-${index}`} className="rounded-lg bg-white/70 p-3 text-sm text-amber-950"><strong>{alert.severity === "CRITICAL" ? "Crítico" : alert.severity === "WARNING" ? "Atenção" : "Informativo"}:</strong> {alert.message}</div>)}</div></section>}

      <section className="surface p-5 sm:p-6"><h2 className="text-base font-bold text-ink">Qualidade da leitura</h2><dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Field label="Confiança" value={CTPS_CONFIDENCE_LABEL[analysis.quality.confidence]} /><Field label="Páginas" value={String(analysis.quality.pageCount)} /><Field label="Eventos reconhecidos" value={String(analysis.quality.recognizedEventCount)} /><Field label="Método" value={analysis.document.extractionMethod === "PDF_TEXT" ? "Texto do PDF" : analysis.document.extractionMethod === "PDF_OCR" ? "OCR local" : "Texto + OCR"} /></dl></section>
    </div>
  );
}

export function CtpsAnalysisPage({ onBack }: { onBack: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<CtpsAnalysis | null>(null);
  const [progress, setProgress] = useState<CtpsDocumentProcessingProgress>(INITIAL_PROGRESS);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => () => controllerRef.current?.abort(), []);

  const selectFile = (candidate: File | null) => {
    if (!candidate) return;
    const validation = validateCtpsPdf(candidate);
    setError(validation || "");
    if (validation) return;
    setFile(candidate);
    setAnalysis(null);
    setProgress(INITIAL_PROGRESS);
  };

  const analyze = async () => {
    if (!file || processing) return;
    const controller = new AbortController();
    controllerRef.current = controller;
    setProcessing(true);
    setError("");
    try {
      const result = await processCtpsPdf(file, setProgress, controller.signal);
      setAnalysis(result);
      if (result.document.parseStatus === "UNRECOGNIZED") setError("O PDF não foi reconhecido como Carteira de Trabalho Digital. Nenhuma informação foi assumida.");
    } catch (caught) {
      if ((caught as Error)?.name !== "AbortError") setError(errorMessage(caught));
    } finally {
      setProcessing(false);
      controllerRef.current = null;
    }
  };

  const clear = () => { setFile(null); setAnalysis(null); setError(""); if (inputRef.current) inputRef.current.value = ""; };

  return (
    <div className="min-h-screen">
      <BackLink label="Voltar para Análise de Perfil" onClick={onBack} maxWidth="max-w-[1500px]" />
      <PageHeader
        title="Carteira de Trabalho"
        description="Analise vínculos empregatícios, salários, cargos e histórico profissional."
        maxWidth="max-w-[1500px]"
        actions={(file || analysis) && !processing ? <button type="button" className="btn-muted" onClick={clear}><RotateCcw className="h-4 w-4" /> Nova análise</button> : undefined}
      />
      <main className="mx-auto flex max-w-[1500px] flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 xl:px-8">
        <section className="surface p-5 sm:p-6">
          <label htmlFor="ctps-file" className="text-sm font-semibold text-ink">CTPS Digital em PDF</label>
          <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <button type="button" disabled={processing} onClick={() => inputRef.current?.click()} className={`flex min-h-24 w-full items-center gap-4 rounded-xl border-2 border-dashed px-5 py-5 text-left transition hover:border-goodgreen-300 hover:bg-goodgreen-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goodgreen-500 disabled:cursor-not-allowed disabled:opacity-60 ${file ? "border-goodgreen-200 bg-goodgreen-50/30" : "border-slate-200 bg-slate-50"}`}>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-goodgreen-700 shadow-sm"><Upload className="h-[18px] w-[18px]" strokeWidth={1.75} /></span>
              <span className="min-w-0"><strong className="block truncate text-sm font-semibold text-ink">{file ? file.name : "Selecionar PDF"}</strong><span className="mt-0.5 block text-xs text-ink-muted">{file ? "Clique para trocar o arquivo" : "PDF pesquisável ou digitalizado, processado no seu navegador."}</span></span>
            </button>
            <input ref={inputRef} id="ctps-file" className="sr-only" type="file" accept="application/pdf,.pdf" disabled={processing} onChange={(event) => selectFile(event.target.files?.[0] || null)} />
            <button type="button" className="btn-primary" disabled={!file || processing} onClick={() => { void analyze(); }}>{processing && <LoaderCircle className="h-4 w-4 animate-spin" />}{processing ? "Analisando..." : "Analisar documento"}</button>
          </div>
          {processing && <div className="mt-5" role="status" aria-live="polite"><div className="flex items-center justify-between gap-3 text-[13px]"><span className="font-medium text-ink-soft">{progress.label}</span><span className="tabular-nums text-ink-muted">{Math.round(progress.progress * 100)}%</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-goodgreen-600 transition-all duration-500 ease-out" style={{ width: `${Math.max(4, progress.progress * 100)}%` }} /></div></div>}
          {error && <div className="mt-5 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}</div>}
        </section>
        {analysis && analysis.document.parseStatus !== "UNRECOGNIZED" && <CtpsResult analysis={analysis} />}
      </main>
    </div>
  );
}
