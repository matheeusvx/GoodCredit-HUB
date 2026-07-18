import { useEffect, useMemo, useState } from "react";
import { formatCurrencyBRL, normalizeCurrencyInput, parseCurrencyBRL } from "../../lib/fgts/currency";
import { calculateProSoluto, validateProSolutoForm } from "../../lib/pro-soluto/proSolutoCalculator";
import { buildProSolutoMessage } from "../../lib/pro-soluto/proSolutoMessageBuilder";
import { generateProSolutoPdf } from "../../lib/pro-soluto/proSolutoPdfGenerator";
import { parseNumberBR } from "../../lib/simulation/formatters";
import { ProSolutoForm as ProSolutoFormData, StoredProSolutoState } from "../../types/proSoluto";
import { SimulationFormData } from "../../types/simulation";
import { ProSolutoActions } from "./ProSolutoActions";
import { ProSolutoExplanation } from "./ProSolutoExplanation";
import { ProSolutoForm, ProSolutoInputValues } from "./ProSolutoForm";
import { ProSolutoResult } from "./ProSolutoResult";

const STORAGE_KEY = "goodcredit_pro_soluto_state";
const SIMULATION_FORM_KEY = "goodcredit_simulation_form";

const initialForm: ProSolutoFormData = {
  clientName: "",
  purchasePrice: 0,
  appraisalValue: null,
  financeablePercent: null,
  approvedFinancing: null,
  useEstimatedFinancing: false,
  fgtsAmount: 0,
  subsidyAmount: 0,
  paidEntryAmount: 0,
  otherOwnResources: 0
};

function readStoredForm(): ProSolutoFormData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialForm;
    const stored = JSON.parse(raw) as Partial<StoredProSolutoState>;
    return { ...initialForm, ...stored.form };
  } catch {
    return initialForm;
  }
}

function formatPercentInput(value: number | null): string {
  if (value === null) return "";
  return (value * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "%";
}

function parsePercentInput(value: string): number | null {
  const raw = value.replace(/\s|%/g, "");
  const clean = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  if (!clean) return null;
  const parsed = Number(clean);
  return Number.isFinite(parsed) ? parsed / 100 : null;
}

function toInputs(form: ProSolutoFormData): ProSolutoInputValues {
  return {
    purchasePrice: form.purchasePrice > 0 ? formatCurrencyBRL(form.purchasePrice) : "",
    appraisalValue: form.appraisalValue ? formatCurrencyBRL(form.appraisalValue) : "",
    financeablePercent: formatPercentInput(form.financeablePercent),
    approvedFinancing: form.approvedFinancing ? formatCurrencyBRL(form.approvedFinancing) : "",
    fgtsAmount: form.fgtsAmount > 0 ? formatCurrencyBRL(form.fgtsAmount) : "",
    subsidyAmount: form.subsidyAmount > 0 ? formatCurrencyBRL(form.subsidyAmount) : "",
    paidEntryAmount: form.paidEntryAmount > 0 ? formatCurrencyBRL(form.paidEntryAmount) : "",
    otherOwnResources: form.otherOwnResources > 0 ? formatCurrencyBRL(form.otherOwnResources) : ""
  };
}

export function ProSolutoPage() {
  const [form, setForm] = useState<ProSolutoFormData>(readStoredForm);
  const [inputs, setInputs] = useState<ProSolutoInputValues>(() => toInputs(readStoredForm()));
  const [copied, setCopied] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const result = useMemo(() => calculateProSoluto(form), [form]);
  const errors = useMemo(() => validateProSolutoForm(form), [form]);
  const canExport = result.status !== "INCOMPLETE" && errors.length === 0;

  useEffect(() => {
    const stored: StoredProSolutoState = { version: 1, form };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  }, [form]);

  function patchForm(patch: Partial<ProSolutoFormData>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function handleMoneyChange(field: Exclude<keyof ProSolutoInputValues, "financeablePercent">, value: string) {
    const normalized = normalizeCurrencyInput(value);
    setInputs((current) => ({ ...current, [field]: normalized }));
    const parsed = parseCurrencyBRL(normalized);
    patchForm({ [field]: field === "appraisalValue" || field === "approvedFinancing" ? parsed || null : parsed });
  }

  function handleMoneyBlur(field: Exclude<keyof ProSolutoInputValues, "financeablePercent">) {
    const parsed = parseCurrencyBRL(inputs[field]);
    setInputs((current) => ({ ...current, [field]: parsed > 0 ? formatCurrencyBRL(parsed) : "" }));
  }

  function handlePercentChange(value: string) {
    const normalized = value.replace(/[^\d.,%]/g, "");
    setInputs((current) => ({ ...current, financeablePercent: normalized }));
    patchForm({ financeablePercent: parsePercentInput(normalized) });
  }

  function handlePercentBlur() {
    setInputs((current) => ({ ...current, financeablePercent: formatPercentInput(form.financeablePercent) }));
  }

  async function copySummary() {
    if (!canExport) return;
    await navigator.clipboard.writeText(buildProSolutoMessage(form, result));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  }

  async function generatePdf() {
    if (!canExport || generatingPdf) return;
    setGeneratingPdf(true);
    try {
      await generateProSolutoPdf(form, result);
    } finally {
      setGeneratingPdf(false);
    }
  }

  function clearCalculation() {
    if (!window.confirm("Deseja apagar todos os dados deste cálculo de pró-soluto?")) return;
    setForm(initialForm);
    setInputs(toInputs(initialForm));
    localStorage.removeItem(STORAGE_KEY);
  }

  function importSimulation() {
    const raw = localStorage.getItem(SIMULATION_FORM_KEY);
    if (!raw) {
      window.alert("Nenhuma Simulação de Financiamento salva foi encontrada neste navegador.");
      return;
    }
    if (
      (form.purchasePrice > 0 || form.approvedFinancing || form.fgtsAmount > 0 || form.paidEntryAmount > 0) &&
      !window.confirm("Deseja substituir os valores atuais pelos dados salvos da Simulação de Financiamento?")
    ) return;

    try {
      const simulation = JSON.parse(raw) as Partial<SimulationFormData>;
      const purchasePrice = parseNumberBR(simulation.valorImovelInput || "");
      const approvedFinancing = parseNumberBR(simulation.valorFinanciamentoInput || "");
      const fgtsAmount = simulation.possuiFgts === "SIM" ? parseNumberBR(simulation.saldoFgtsInput || "") : 0;
      const paidEntryAmount = simulation.pretendeEntrada === "SIM" ? parseNumberBR(simulation.valorEntradaInput || "") : 0;
      const next: ProSolutoFormData = {
        ...initialForm,
        clientName: simulation.nomeCompleto || "",
        purchasePrice,
        approvedFinancing: approvedFinancing || null,
        fgtsAmount,
        paidEntryAmount
      };
      setForm(next);
      setInputs(toInputs(next));
    } catch {
      window.alert("Não foi possível importar os dados salvos da Simulação de Financiamento.");
    }
  }

  return (
    <div>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1700px] flex-col gap-5 px-4 py-5 sm:px-6 xl:px-8">
          <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-end 2xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-goodgreen-600">Ferramenta financeira</p>
              <h1 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">Cálculo de Pró-Soluto</h1>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Calcule o valor que ainda precisa ser complementado na operação após considerar financiamento, FGTS, subsídio e recursos próprios.
              </p>
            </div>
            <ProSolutoActions
              canExport={canExport}
              copied={copied}
              generatingPdf={generatingPdf}
              onCopy={copySummary}
              onGeneratePdf={generatePdf}
              onImport={importSimulation}
              onClear={clearCalculation}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-[1700px] flex-col gap-6 px-4 py-6 sm:px-6 xl:px-8">
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(390px,0.92fr)]">
          <ProSolutoForm
            form={form}
            inputs={inputs}
            errors={errors}
            onFormChange={patchForm}
            onMoneyChange={handleMoneyChange}
            onMoneyBlur={handleMoneyBlur}
            onPercentChange={handlePercentChange}
            onPercentBlur={handlePercentBlur}
          />
          <ProSolutoResult form={form} result={result} />
        </div>

        <ProSolutoExplanation form={form} result={result} />

        <section className="rounded-lg border border-goodblue-100 bg-goodblue-50 px-4 py-4 text-sm leading-6 text-goodblue-900">
          <strong>Importante:</strong> este cálculo possui caráter orientativo e está sujeito à validação do financiamento, da avaliação de engenharia e da composição final da operação.
        </section>
      </main>
    </div>
  );
}
