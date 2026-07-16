import { useMemo, useRef, useState } from "react";
import type { NormalizedBankTransaction, RelatedPerson, StatementFileRecord, StatementProcessingProgress } from "../../types/statementAnalysis";
import { calculateAutomatedIncome } from "../../lib/statement-analysis/statementAnalysis";
import { classifyTransactions } from "../../lib/statement-analysis/transactionClassifier";
import { markDuplicateTransactions } from "../../lib/statement-analysis/duplicateDetector";
import { matchInternalTransfers, markTransitoryPairs } from "../../lib/statement-analysis/relatedTransferMatcher";
import { createStatementFileRecord, processStatementFile, PROCESSING_STEPS } from "../../lib/statement-analysis/statementPipeline";
import { generateStatementAnalysisPdf } from "../../lib/statement-analysis/statementPdfReport";
import { StatementUpload } from "./StatementUpload";
import { StatementProcessing } from "./StatementProcessing";
import { IncomeAnalysisResult } from "./IncomeAnalysisResult";
import { AdvancedTransactionReview } from "./AdvancedTransactionReview";
import { StatementViewer } from "./StatementViewer";

type Stage = "UPLOAD" | "PROCESSING" | "RESULT";
const ALLOWED_EXTENSIONS = ["pdf", "csv", "xlsx", "xls"];
const SIMULATION_KEY = "goodcredit_income_simulation_prefill";

export function IncomeAnalysisPage({ onSendToSimulation }: { onSendToSimulation: () => void }) {
  const [stage, setStage] = useState<Stage>("UPLOAD"); const [clientName, setClientName] = useState(""); const [files, setFiles] = useState<StatementFileRecord[]>([]); const [relatedPeople, setRelatedPeople] = useState<RelatedPerson[]>([]); const [transactions, setTransactions] = useState<NormalizedBankTransaction[]>([]); const [progress, setProgress] = useState<StatementProcessingProgress | null>(null); const [reviewOpen, setReviewOpen] = useState(false); const [viewing, setViewing] = useState<NormalizedBankTransaction | null>(null); const [notice, setNotice] = useState(""); const controllerRef = useRef<AbortController | null>(null);
  const result = useMemo(() => stage === "RESULT" ? calculateAutomatedIncome(clientName, files, transactions) : null, [clientName, files, stage, transactions]);

  function addFiles(candidates: File[]) {
    const rejected: string[] = []; const existing = new Set(files.map((item) => `${item.name}-${item.size}`)); const accepted = candidates.filter((file) => {
      const extension = file.name.split(".").pop()?.toLowerCase() || ""; const duplicate = existing.has(`${file.name}-${file.size}`);
      if (!ALLOWED_EXTENSIONS.includes(extension) || file.size <= 0 || file.size > 30 * 1024 * 1024 || duplicate) { rejected.push(file.name); return false; }
      existing.add(`${file.name}-${file.size}`); return true;
    });
    setFiles((current) => [...current, ...accepted.map(createStatementFileRecord)]); setNotice(rejected.length ? `${rejected.length} arquivo(s) ignorado(s) por formato, tamanho ou duplicidade.` : "");
  }

  async function startAnalysis() {
    if (!files.length) return; const controller = new AbortController(); controllerRef.current = controller; setStage("PROCESSING"); setNotice(""); let processed: StatementFileRecord[] = [];
    for (let index = 0; index < files.length; index += 1) {
      if (controller.signal.aborted) { setStage("UPLOAD"); return; }
      const current = files[index]; setFiles((items) => items.map((item) => item.id === current.id ? { ...item, status: "PROCESSING" } : item));
      try {
        const next = await processStatementFile(current, (value) => { const enriched = { ...value, completedFiles: processed.filter((file) => ["COMPLETED", "REVIEW_REQUIRED", "DIVERGENT"].includes(file.status)).length, warningFiles: processed.filter((file) => ["REVIEW_REQUIRED", "DIVERGENT", "ERROR", "UNRECOGNIZED"].includes(file.status)).length }; setProgress(enriched); }, controller.signal);
        processed = [...processed, next]; setFiles((items) => items.map((item) => item.id === current.id ? next : item));
      } catch (error) {
        if ((error as Error).name === "AbortError") { setStage("UPLOAD"); return; }
        const candidate = error as { code?: string; message?: string }; const failed: StatementFileRecord = { ...current, status: candidate.code === "PASSWORD_REQUIRED" || candidate.code === "WRONG_PASSWORD" ? "PASSWORD_REQUIRED" : "ERROR", warnings: [candidate.message || "Não foi possível processar o arquivo."] };
        processed = [...processed, failed]; setFiles((items) => items.map((item) => item.id === current.id ? failed : item));
      }
    }
    const anchor = processed.at(-1) || files[0]; const emitFinal = (step: number) => setProgress({ fileId: anchor.id, fileName: "Análise consolidada", step, stepLabel: PROCESSING_STEPS[step], currentPage: 0, totalPages: 0, percent: Math.round((step / PROCESSING_STEPS.length) * 100), completedFiles: processed.filter((file) => ["COMPLETED", "REVIEW_REQUIRED", "DIVERGENT"].includes(file.status)).length, warningFiles: processed.filter((file) => ["REVIEW_REQUIRED", "DIVERGENT", "ERROR", "UNRECOGNIZED"].includes(file.status)).length });
    emitFinal(9); let consolidated = markDuplicateTransactions(processed.flatMap((file) => file.transactions)); emitFinal(10); consolidated = matchInternalTransfers(consolidated); consolidated = markTransitoryPairs(consolidated); emitFinal(11); consolidated = classifyTransactions(consolidated, relatedPeople); emitFinal(12); emitFinal(13); emitFinal(14);
    setFiles(processed); setTransactions(consolidated); setStage("RESULT"); setProgress(null); controllerRef.current = null;
  }

  function reset() { if ((files.length || transactions.length) && !window.confirm("Limpar os arquivos e o resultado desta análise?")) return; controllerRef.current?.abort(); setStage("UPLOAD"); setFiles([]); setTransactions([]); setProgress(null); setReviewOpen(false); setViewing(null); setNotice(""); }
  function sendToSimulation() {
    if (!result) return; if (localStorage.getItem(SIMULATION_KEY) && !window.confirm("Já existe uma renda preparada para a simulação. Deseja substituí-la pela renda confirmada desta análise?")) return;
    const competences = result.months.map((month) => month.competence); localStorage.setItem(SIMULATION_KEY, JSON.stringify({ clientName: result.clientName, confirmedMonthlyIncome: result.confirmedMonthlyIncome, potentialMonthlyIncome: result.potentialMonthlyIncome, participants: [...new Set(result.transactions.map((item) => item.accountHolder).filter(Boolean))], analyzedMonths: competences, overallConfidence: Math.min(result.extractionConfidence, result.classificationConfidence), generatedAt: result.generatedAt, averageIncome: result.confirmedMonthlyIncome, medianIncome: result.medianIncome, totalConsidered: result.confirmedIncomeTotal, pendingReviewAmount: result.totalPending, incomeProfile: "", analyzedPeriod: { start: competences[0] || "", end: competences.at(-1) || "", months: result.completeMonths } })); onSendToSimulation();
  }
  const viewingFile = viewing ? files.find((file) => file.id === viewing.sourceFileId) : undefined;
  return <div className="min-h-screen bg-slate-100">{notice && <div className="mx-auto mt-4 max-w-[1500px] rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{notice}</div>}{stage === "UPLOAD" && <StatementUpload clientName={clientName} files={files} relatedPeople={relatedPeople} onClientName={setClientName} onAddFiles={addFiles} onRemoveFile={(id) => setFiles((items) => items.filter((item) => item.id !== id))} onRelatedPeople={setRelatedPeople} onStart={() => { void startAnalysis(); }} onClear={reset} />}{stage === "PROCESSING" && <StatementProcessing files={files} progress={progress} onCancel={() => controllerRef.current?.abort()} />}{stage === "RESULT" && result && <IncomeAnalysisResult result={result} onReview={() => setReviewOpen(true)} onPdf={() => { void generateStatementAnalysisPdf(result); }} onSend={sendToSimulation} onReset={reset} />}{reviewOpen && <AdvancedTransactionReview transactions={transactions} onChange={setTransactions} onView={setViewing} onClose={() => setReviewOpen(false)} />}{viewing && viewingFile && <StatementViewer transaction={viewing} file={viewingFile} onClose={() => setViewing(null)} />}</div>;
}
