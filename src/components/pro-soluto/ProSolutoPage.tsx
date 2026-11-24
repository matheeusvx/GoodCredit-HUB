import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../ui/PageHeader";
import { formatCurrencyBRL, normalizeCurrencyInput, parseCurrencyBRL } from "../../lib/fgts/currency";
import { calculateProSoluto, validateProSolutoForm } from "../../lib/pro-soluto/proSolutoCalculator";
import { clampFinanceablePercent } from "../../lib/pro-soluto/proSolutoConstants";
import { buildProSolutoFormFromSimulation } from "../../lib/pro-soluto/proSolutoImport";
import { buildProSolutoMessage } from "../../lib/pro-soluto/proSolutoMessageBuilder";
import { generateProSolutoPdf } from "../../lib/pro-soluto/proSolutoPdfGenerator";
import {
  INITIAL_PRO_SOLUTO_FORM,
  LEGACY_PRO_SOLUTO_STORAGE_KEY,
  PRO_SOLUTO_STORAGE_KEY,
  readProSolutoForm,
  storeProSolutoForm
} from "../../lib/pro-soluto/proSolutoStorage";
import { ProSolutoForm as ProSolutoFormData } from "../../types/proSoluto";
import { SimulationFormData } from "../../types/simulation";
import { ProSolutoActions } from "./ProSolutoActions";
import { ProSolutoExplanation } from "./ProSolutoExplanation";
import { ProSolutoForm, ProSolutoInputValues, ProSolutoMoneyField } from "./ProSolutoForm";
import { ProSolutoResult } from "./ProSolutoResult";

const SIMULATION_FORM_KEY = "goodcredit_simulation_form";

function formatPercentInput(value: number): string {
  if (value <= 0) return "";
  return `${(value * 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}%`;
}

function parsePercentInput(value: string): number {
  const raw = value.replace(/\s|%/g, "");
  const normalized = raw.includes(",")
    ? raw.replace(/\./g, "").replace(",", ".")
    : raw;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed / 100 : 0;
}

function toInputs(form: ProSolutoFormData): ProSolutoInputValues {
  return {
    sellerReceivableAmount:
      form.sellerReceivableAmount > 0 ? formatCurrencyBRL(form.sellerReceivableAmount) : "",
    appraisalValue: form.appraisalValue > 0 ? formatCurrencyBRL(form.appraisalValue) : "",
    financeablePercent: formatPercentInput(form.financeablePercent),
    approvedCreditAmount:
      form.approvedCreditAmount ? formatCurrencyBRL(form.approvedCreditAmount) : "",
    fgtsAmount: form.fgtsAmount > 0 ? formatCurrencyBRL(form.fgtsAmount) : "",
    paidEntryAmount: form.paidEntryAmount > 0 ? formatCurrencyBRL(form.paidEntryAmount) : ""
  };
}

export function ProSolutoPage() {
  const [form, setForm] = useState<ProSolutoFormData>(() => readProSolutoForm(localStorage));
  const [inputs, setInputs] = useState<ProSolutoInputValues>(() =>
    toInputs(readProSolutoForm(localStorage))
  );
  const [copied, setCopied] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const result = useMemo(() => calculateProSoluto(form), [form]);
  const errors = useMemo(() => validateProSolutoForm(form), [form]);
  const canExport = result.status !== "INCOMPLETE" && errors.length === 0;

  useEffect(() => {
    storeProSolutoForm(localStorage, form);
  }, [form]);

  function patchForm(patch: Partial<ProSolutoFormData>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function handleMoneyChange(field: ProSolutoMoneyField, value: string) {
    const normalized = normalizeCurrencyInput(value);
    const parsed = parseCurrencyBRL(normalized);
    setInputs((current) => ({ ...current, [field]: normalized }));
    patchForm({
      [field]: field === "approvedCreditAmount" ? parsed || null : parsed
    } as Partial<ProSolutoFormData>);
  }

  function handleMoneyBlur(field: ProSolutoMoneyField) {
    const parsed = parseCurrencyBRL(inputs[field]);
    setInputs((current) => ({
      ...current,
      [field]: parsed > 0 ? formatCurrencyBRL(parsed) : ""
    }));
  }

  function handlePercentChange(value: string) {
    const normalized = value.replace(/[^\d.,%-]/g, "");
    setInputs((current) => ({ ...current, financeablePercent: normalized }));
    patchForm({ financeablePercent: parsePercentInput(normalized) });
  }

  function handlePercentBlur() {
    const validatedPercent = clampFinanceablePercent(form.financeablePercent);
    if (validatedPercent !== form.financeablePercent) {
      patchForm({ financeablePercent: validatedPercent });
    }
    setInputs((current) => ({
      ...current,
      financeablePercent: formatPercentInput(validatedPercent)
    }));
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
    setForm(INITIAL_PRO_SOLUTO_FORM);
    setInputs(toInputs(INITIAL_PRO_SOLUTO_FORM));
    localStorage.removeItem(PRO_SOLUTO_STORAGE_KEY);
    localStorage.removeItem(LEGACY_PRO_SOLUTO_STORAGE_KEY);
  }

  function importSimulation() {
    const raw = localStorage.getItem(SIMULATION_FORM_KEY);
    if (!raw) {
      window.alert("Nenhuma Simulação de Financiamento salva foi encontrada neste navegador.");
      return;
    }

    const hasCurrentData =
      form.sellerReceivableAmount > 0 ||
      form.appraisalValue > 0 ||
      form.approvedCreditAmount !== null ||
      form.fgtsAmount > 0 ||
      form.paidEntryAmount > 0;
    const confirmation = hasCurrentData
      ? "Deseja substituir os dados atuais pelos valores da Simulação de Financiamento? A avaliação e o percentual financiável deverão ser preenchidos novamente."
      : "Deseja importar os dados da Simulação de Financiamento? O valor financiado será preenchido no campo de crédito aprovado para sua conferência. A avaliação e o percentual financiável não serão importados.";

    if (!window.confirm(confirmation)) return;

    try {
      const next = buildProSolutoFormFromSimulation(
        JSON.parse(raw) as Partial<SimulationFormData>
      );
      setForm(next);
      setInputs(toInputs(next));
    } catch {
      window.alert("Não foi possível importar os dados salvos da Simulação de Financiamento.");
    }
  }

  return (
    <div>
      <PageHeader
        title="Cálculo de Pró-Soluto"
        description="Apure quanto o comprador paga com recursos próprios."
        actions={<ProSolutoActions
              canExport={canExport}
              copied={copied}
              generatingPdf={generatingPdf}
              onCopy={copySummary}
              onGeneratePdf={generatePdf}
              onImport={importSimulation}
              onClear={clearCalculation}
            />}
      />

      <main className="mx-auto flex max-w-[1700px] flex-col gap-6 px-4 py-6 sm:px-6 xl:px-8">
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.06fr)_minmax(420px,0.94fr)]">
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

        {canExport && <ProSolutoExplanation form={form} result={result} />}
      </main>
    </div>
  );
}
