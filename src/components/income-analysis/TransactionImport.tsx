import { useState } from "react";
import { Upload } from "lucide-react";
import { BankTransaction, CsvColumnMapping, CsvPreview } from "../../types/incomeAnalysis";
import { csvRowsToTransactions, parseCsvPreview } from "../../lib/income-analysis/csvParser";
import { flagPossibleDuplicates } from "../../lib/income-analysis/transactionClassifier";
import { CsvMappingModal } from "./CsvMappingModal";
import { PdfImportButton } from "./pdf/PdfImportButton";
import { PdfImportModal } from "./pdf/PdfImportModal";

const initialMapping: CsvColumnMapping = { date: "", description: "", amount: "", type: "", payer: "", account: "", competence: "" };

interface TransactionImportProps {
  existing: BankTransaction[];
  analysisBank: string;
  periodStart: string;
  periodEnd: string;
  onImport: (transactions: BankTransaction[]) => void;
}

export function TransactionImport({ existing, analysisBank, periodStart, periodEnd, onImport }: TransactionImportProps) {
  const [separator, setSeparator] = useState(";");
  const [ignoreHeader, setIgnoreHeader] = useState(true);
  const [preview, setPreview] = useState<CsvPreview | null>(null);
  const [mapping, setMapping] = useState(initialMapping);
  const [paste, setPaste] = useState("");
  const [pdfOpen, setPdfOpen] = useState(false);

  function openContent(content: string) {
    const next = parseCsvPreview(content, separator, ignoreHeader);
    setPreview(next);
    setMapping({
      ...initialMapping,
      date: next.headers.find((header) => /data/i.test(header)) || "",
      description: next.headers.find((header) => /descr/i.test(header)) || "",
      amount: next.headers.find((header) => /valor/i.test(header)) || "",
      type: next.headers.find((header) => /tipo|natureza/i.test(header)) || "",
      payer: next.headers.find((header) => /pagador|origem/i.test(header)) || "",
      account: next.headers.find((header) => /conta/i.test(header)) || "",
      competence: next.headers.find((header) => /compet/i.test(header)) || "",
    });
  }

  function fileChange(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => openContent(String(reader.result || ""));
    reader.readAsText(file, "UTF-8");
  }

  function confirmCsv() {
    if (!preview) return;
    onImport(flagPossibleDuplicates([...existing, ...csvRowsToTransactions(preview, mapping)]));
    setPreview(null);
    setPaste("");
  }

  return <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <h2 className="text-xl font-bold">Importar Movimentações</h2>
    <p className="mt-1 text-sm text-slate-500">CSV e PDF são processados localmente. O arquivo original não é armazenado.</p>
    <div className="mt-5 flex flex-wrap items-end gap-4">
      <label className="text-sm font-semibold">Separador<select className="mt-2 h-11 rounded-lg border border-slate-300 px-3" value={separator} onChange={(event) => setSeparator(event.target.value)}><option value=";">Ponto e vírgula</option><option value=",">Vírgula</option><option value={'\t'}>Tabulação</option></select></label>
      <label className="flex h-11 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold"><input type="checkbox" checked={ignoreHeader} onChange={(event) => setIgnoreHeader(event.target.checked)} /> Ignorar cabeçalho</label>
      <label className="btn-secondary cursor-pointer"><Upload className="h-4 w-4" /> Selecionar CSV<input type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => fileChange(event.target.files?.[0])} /></label>
      <PdfImportButton onClick={() => setPdfOpen(true)} />
    </div>
    <label className="mt-5 block text-sm font-semibold">Ou cole dados estruturados<textarea className="mt-2 min-h-28 w-full rounded-lg border border-slate-300 p-3 font-mono text-xs" value={paste} onChange={(event) => setPaste(event.target.value)} placeholder="Data;Descrição;Valor;Tipo;Pagador;Conta" /></label>
    <button type="button" className="btn-secondary mt-3" disabled={!paste.trim()} onClick={() => openContent(paste)}>Mapear dados colados</button>
    {preview && <CsvMappingModal preview={preview} mapping={mapping} onMapping={setMapping} onConfirm={confirmCsv} onClose={() => setPreview(null)} />}
    {pdfOpen && <PdfImportModal existing={existing} analysisBank={analysisBank} periodStart={periodStart} periodEnd={periodEnd} onConfirm={onImport} onClose={() => setPdfOpen(false)} />}
  </section>;
}
