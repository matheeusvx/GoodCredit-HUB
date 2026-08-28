import {
  AlertTriangle,
  ArrowLeft,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Download,
  FileText,
  LoaderCircle,
  RotateCcw,
  ShieldCheck,
  Upload,
} from "lucide-react";
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
import type { CtpsAnalysis, CtpsDocumentProcessingProgress, CtpsEmployment } from "../../../types/ctpsAnalysis";

const INITIAL_PROGRESS: CtpsDocumentProcessingProgress = { stage: "READING", label: "Lendo documento...", progress: 0 };

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) return String(error.message);
  return "Não foi possível analisar a Carteira de Trabalho. Verifique o PDF e tente novamente.";
}

function Field({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</dt><dd className="mt-1 text-sm font-semibold text-slate-800">{value}</dd></div>;
}

function EmploymentDetails({ employment, referenceDate }: { employment: CtpsEmployment; referenceDate: string }) {
  return (
    <details className="group rounded-xl border border-slate-200 bg-white open:shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-goodgreen-500 sm:p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="truncate font-bold text-slate-950">{employment.employer.name || "Empregador não identificado"}</h4>
            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${employment.status === "ACTIVE" ? "bg-goodgreen-50 text-goodgreen-700" : "bg-slate-100 text-slate-600"}`}>{CTPS_STATUS_LABEL[employment.status]}</span>
          </div>
          <p className="mt-1 text-sm text-slate-500">{employment.currentPosition || "Cargo não identificado"} · {formatCtpsCurrency(employment.currentSalary?.amount)}</p>
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
            <h5 className="text-sm font-bold text-slate-900">Histórico salarial</h5>
            <div className="mt-2 space-y-2">
              {employment.salaryHistory.length ? employment.salaryHistory.map((salary, index) => (
                <div key={`${salary.recordedAt}-${salary.amount}-${index}`} className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                  <strong>{formatCtpsCurrency(salary.amount)}</strong> · vigência {formatCtpsDate(salary.effectiveFrom)}
                  {salary.recordedAt !== salary.effectiveFrom && <span className="block text-xs text-slate-500">Registrado em {formatCtpsDate(salary.recordedAt)}</span>}
                </div>
              )) : <p className="text-sm text-slate-500">Sem anotações salariais estruturadas.</p>}
            </div>
          </div>
          <div>
            <h5 className="text-sm font-bold text-slate-900">Histórico de cargos e contrato</h5>
            <div className="mt-2 space-y-2">
              {[...employment.positionHistory.map((item) => ({ date: item.from, text: `Cargo: ${item.title}` })), ...employment.contractHistory.map((item) => ({ date: item.from, text: `Contrato: ${CTPS_CONTRACT_LABEL[item.type]}` }))]
                .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
                .map((item, index) => <div key={`${item.date}-${index}`} className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700"><strong>{formatCtpsDate(item.date)}</strong> · {item.text}</div>)}
              {!employment.positionHistory.length && !employment.contractHistory.length && <p className="text-sm text-slate-500">Sem alterações estruturadas.</p>}
            </div>
          </div>
          <div>
            <h5 className="text-sm font-bold text-slate-900">Férias</h5>
            <div className="mt-2 space-y-2">
              {employment.vacations.length ? employment.vacations.map((vacation, index) => <div key={`${vacation.recordedAt}-${index}`} className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{formatCtpsDate(vacation.startDate)} a {formatCtpsDate(vacation.endDate)}</div>) : <p className="text-sm text-slate-500">Nenhuma anotação de férias estruturada.</p>}
            </div>
          </div>
          <div>
            <h5 className="text-sm font-bold text-slate-900">Eventos relevantes</h5>
            <div className="mt-2 max-h-56 space-y-2 overflow-y-auto pr-1">
              {employment.events.map((event, index) => <div key={`${event.type}-${event.recordedAt}-${index}`} className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700"><strong>{formatCtpsDate(event.recordedAt)}</strong> · {event.originalText}</div>)}
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
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-goodgreen-600">Documento analisado</p>
            <h2 className="mt-2 text-xl font-bold text-slate-950">{analysis.holder.name || "Titular não identificado"}</h2>
            <p className="mt-1 text-sm text-slate-500">CPF {maskCtpsCpf(analysis.holder.cpf)} · confiança {CTPS_CONFIDENCE_LABEL[analysis.document.confidence].toLowerCase()}</p>
          </div>
          <button type="button" className="btn-secondary w-fit" onClick={() => downloadCtpsSummaryPdf(analysis)}><Download className="h-4 w-4" /> Baixar resumo em PDF</button>
        </div>
      </section>

      <section aria-labelledby="ctps-summary" className="space-y-3">
        <h2 id="ctps-summary" className="text-sm font-bold uppercase tracking-[0.14em] text-slate-500">Resumo profissional</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Vínculos ativos</p><p className="mt-2 text-3xl font-bold text-slate-950">{analysis.summary.activeEmploymentCount}</p></div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Salários contratuais vigentes identificados</p><p className="mt-2 text-2xl font-bold text-slate-950">{formatCtpsCurrency(analysis.summary.currentContractualIncome)}</p></div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Vínculo ativo mais antigo</p><p className="mt-2 text-2xl font-bold text-slate-950">{formatCtpsDate(analysis.summary.oldestActiveAdmissionDate)}</p></div>
        </div>
      </section>

      <section className="space-y-3"><div><h2 className="text-lg font-bold text-slate-950">Vínculos atuais</h2><p className="text-sm text-slate-500">Contratos identificados como abertos no documento.</p></div>{active.length ? active.map((employment) => <EmploymentDetails key={employment.id} employment={employment} referenceDate={analysis.document.documentSignedAt || analysis.document.analysisDate} />) : <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Nenhum vínculo ativo identificado.</p>}</section>
      <section className="space-y-3"><div><h2 className="text-lg font-bold text-slate-950">Histórico profissional</h2><p className="text-sm text-slate-500">Vínculos encerrados e respectivos históricos.</p></div>{terminated.length ? terminated.map((employment) => <EmploymentDetails key={employment.id} employment={employment} referenceDate={analysis.document.documentSignedAt || analysis.document.analysisDate} />) : <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Nenhum vínculo encerrado identificado.</p>}</section>

      {analysis.alerts.length > 0 && <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 sm:p-6"><h2 className="flex items-center gap-2 font-bold text-amber-950"><AlertTriangle className="h-5 w-5" /> Alertas e inconsistências</h2><div className="mt-4 space-y-2">{analysis.alerts.map((alert, index) => <div key={`${alert.code}-${index}`} className="rounded-lg bg-white/70 p-3 text-sm text-amber-950"><strong>{alert.severity === "CRITICAL" ? "Crítico" : alert.severity === "WARNING" ? "Atenção" : "Informativo"}:</strong> {alert.message}</div>)}</div></section>}

      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6"><h2 className="flex items-center gap-2 font-bold text-slate-950"><ShieldCheck className="h-5 w-5 text-goodgreen-600" /> Qualidade da leitura</h2><dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Field label="Confiança" value={CTPS_CONFIDENCE_LABEL[analysis.quality.confidence]} /><Field label="Páginas" value={String(analysis.quality.pageCount)} /><Field label="Eventos reconhecidos" value={String(analysis.quality.recognizedEventCount)} /><Field label="Método" value={analysis.document.extractionMethod === "PDF_TEXT" ? "Texto do PDF" : analysis.document.extractionMethod === "PDF_OCR" ? "OCR local" : "Texto + OCR"} /></dl></section>
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

  return (
    <main className="mx-auto flex max-w-[1500px] flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 xl:px-8">
      <button type="button" onClick={onBack} className="inline-flex w-fit items-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-slate-600 transition hover:bg-white hover:text-goodgreen-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goodgreen-500"><ArrowLeft className="h-4 w-4" /> Voltar para Análise de Perfil</button>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-goodgreen-600">Análise de Perfil</p><h1 className="mt-2 text-3xl font-bold text-slate-950">Carteira de Trabalho</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Analise vínculos empregatícios, salários, cargos e histórico profissional.</p></div>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-goodgreen-50 px-3 py-1.5 text-xs font-bold text-goodgreen-700"><CheckCircle2 className="h-3.5 w-3.5" /> Disponível</span>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <label htmlFor="ctps-file" className="text-sm font-bold text-slate-900">Documento CTPS Digital em PDF</label>
            <button type="button" disabled={processing} onClick={() => inputRef.current?.click()} className="mt-3 flex min-h-36 w-full items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-5 py-6 text-center transition hover:border-goodgreen-300 hover:bg-goodgreen-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goodgreen-500 disabled:cursor-not-allowed disabled:opacity-60">
              <span><span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-white text-goodgreen-700 shadow-sm"><Upload className="h-5 w-5" /></span><strong className="mt-3 block text-sm text-slate-900">{file ? file.name : "Selecionar PDF"}</strong><span className="mt-1 block text-xs text-slate-500">O processamento acontece localmente no navegador.</span></span>
            </button>
            <input ref={inputRef} id="ctps-file" className="sr-only" type="file" accept="application/pdf,.pdf" disabled={processing} onChange={(event) => selectFile(event.target.files?.[0] || null)} />
          </div>
          <div className="flex flex-wrap gap-2 lg:flex-col">
            <button type="button" className="btn-primary" disabled={!file || processing} onClick={() => { void analyze(); }}>{processing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <BriefcaseBusiness className="h-4 w-4" />}{processing ? "Analisando..." : "Analisar documento"}</button>
            {(file || analysis) && !processing && <button type="button" className="btn-muted" onClick={() => { setFile(null); setAnalysis(null); setError(""); if (inputRef.current) inputRef.current.value = ""; }}><RotateCcw className="h-4 w-4" /> Nova análise</button>}
          </div>
        </div>
        {processing && <div className="mt-5" role="status" aria-live="polite"><div className="flex items-center justify-between gap-3 text-sm"><span className="flex items-center gap-2 font-semibold text-slate-700"><LoaderCircle className="h-4 w-4 animate-spin text-goodgreen-600" /> {progress.label}</span><span className="text-slate-500">{Math.round(progress.progress * 100)}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-goodgreen-600 transition-all" style={{ width: `${Math.max(4, progress.progress * 100)}%` }} /></div></div>}
        {error && <div className="mt-5 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}</div>}
        {!processing && !analysis && <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500"><span className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> PDF com texto pesquisável ou OCR local quando necessário</span><span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> Datas e históricos permanecem estruturados</span></div>}
      </section>
      {analysis && analysis.document.parseStatus !== "UNRECOGNIZED" && <CtpsResult analysis={analysis} />}
    </main>
  );
}
