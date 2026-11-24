import { Calculator, Eraser } from "lucide-react";
import { PageHeader } from "../ui/PageHeader";
import { useEffect, useMemo, useState } from "react";
import { formatCurrencyBRL, parseNumberBR } from "../../lib/simulation/formatters";
import { runSimulation } from "../../lib/simulation/simulationEngine";
import { SimulationFormData, SimulationResult } from "../../types/simulation";
import { IncomeSimulationPrefill } from "../../types/incomeAnalysis";
import { BankSystemCard } from "./BankSystemCard";
import { CustomerDataCard } from "./CustomerDataCard";
import { EntryFgtsCard } from "./EntryFgtsCard";
import { OperationDataCard } from "./OperationDataCard";
import { SendToAmortizationButton } from "./SendToAmortizationButton";
import { SimulationResultCards } from "./SimulationResultCards";
import { SimulationSummaryBox } from "./SimulationSummaryBox";

const initialForm: SimulationFormData = {
  nomeCompleto: "",
  dataNascimento: "",
  estadoCivil: "",
  tipoFinanciamento: "",
  tipoOperacao: "",
  valorImovelInput: "",
  valorFinanciamentoInput: "",
  rendaBrutaFamiliarInput: "",
  uf: "",
  bancoPretendido: "",
  sistemaAmortizador: "SAC",
  prazoAnosInput: "30",
  possuiFgts: "NAO",
  saldoFgtsInput: "",
  pretendeEntrada: "NAO",
  valorEntradaInput: ""
};

const SIMULATION_FORM_KEY = "goodcredit_simulation_form";
const INCOME_PREFILL_KEY = "goodcredit_income_simulation_prefill";

function loadInitialForm(): SimulationFormData {
  try {
    return { ...initialForm, ...JSON.parse(localStorage.getItem(SIMULATION_FORM_KEY) || "{}") };
  } catch {
    return initialForm;
  }
}

interface Props {
  onSendToAmortization: (result: SimulationResult) => void;
}

export function SimulationPage({ onSendToAmortization }: Props) {
  const [form, setForm] = useState<SimulationFormData>(loadInitialForm);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const errors = useMemo(() => validateForm(form), [form]);

  useEffect(() => {
    localStorage.setItem(SIMULATION_FORM_KEY, JSON.stringify(form));
  }, [form]);

  useEffect(() => {
    const raw = localStorage.getItem(INCOME_PREFILL_KEY);
    if (!raw) return;
    try {
      const prefill = JSON.parse(raw) as IncomeSimulationPrefill;
      const currentIncome = parseNumberBR(form.rendaBrutaFamiliarInput);
      const shouldReplace =
        currentIncome <= 0 ||
        window.confirm(
          `Já existe uma renda preenchida na simulação. Deseja substituir pelo valor apurado de ${formatCurrencyBRL(prefill.averageIncome)}?`
        );
      if (shouldReplace) {
        setForm((current) => ({
          ...current,
          nomeCompleto: prefill.clientName || current.nomeCompleto,
          rendaBrutaFamiliarInput: formatCurrencyBRL(prefill.averageIncome)
        }));
        setResult(null);
      }
    } finally {
      localStorage.removeItem(INCOME_PREFILL_KEY);
    }
  }, []);

  function patchForm(patch: Partial<SimulationFormData>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function calculate() {
    setSubmitted(true);
    if (errors.length > 0) return;
    setResult(runSimulation(form));
  }

  function clear() {
    setForm(initialForm);
    localStorage.removeItem(SIMULATION_FORM_KEY);
    setResult(null);
    setSubmitted(false);
  }

  return (
    <div>
      <PageHeader
        title="Simulação de Financiamento"
        description="Calcule parcela, enquadramento e banco para a operação."
        actions={
          <>
              <button type="button" onClick={calculate} className="btn-primary">
                <Calculator className="h-4 w-4" />
                Calcular Simulação
              </button>
              <button type="button" onClick={clear} className="btn-muted">
                <Eraser className="h-4 w-4" />
                Limpar
              </button>
              <SendToAmortizationButton result={result} onSend={onSendToAmortization} />
            </>
        }
      />

      <main className="mx-auto flex max-w-[1700px] flex-col gap-6 px-4 py-6 sm:px-6 xl:px-8">
        {submitted && errors.length > 0 && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {errors.join(" ")}
          </div>
        )}

        <CustomerDataCard form={form} onChange={patchForm} />
        <OperationDataCard form={form} onChange={patchForm} />
        <BankSystemCard form={form} onChange={patchForm} />
        <EntryFgtsCard form={form} onChange={patchForm} />

        {result && (
          <>
            <section className="surface p-5 sm:p-6">
              <h2 className="text-lg font-bold text-ink">Resultado da Simulação</h2>
              <div className="mt-4">
                <SimulationResultCards result={result} />
              </div>
            </section>
            <SimulationSummaryBox text={result.textoSimulacao} />
          </>
        )}
      </main>
    </div>
  );
}

function validateForm(form: SimulationFormData): string[] {
  const errors: string[] = [];
  if (!form.nomeCompleto.trim()) errors.push("Nome obrigatório.");
  if (!form.dataNascimento) errors.push("Data de nascimento obrigatória.");
  if (!form.estadoCivil) errors.push("Estado civil obrigatório.");
  if (!form.tipoFinanciamento) errors.push("Tipo de financiamento obrigatório.");
  if (!form.tipoOperacao) errors.push("Tipo de operação obrigatório.");
  if (!form.uf) errors.push("UF obrigatória.");
  if (!form.bancoPretendido) errors.push("Banco obrigatório.");
  if (!form.sistemaAmortizador) errors.push("Sistema amortizador obrigatório.");
  if (parseNumberBR(form.valorImovelInput) <= 0) errors.push("Valor do imóvel obrigatório.");
  if (parseNumberBR(form.valorFinanciamentoInput) <= 0) errors.push("Valor do financiamento obrigatório.");
  if (parseNumberBR(form.rendaBrutaFamiliarInput) <= 0) errors.push("Renda bruta familiar obrigatória.");
  const prazo = Math.floor(parseNumberBR(form.prazoAnosInput) || 0);
  if (prazo <= 0) errors.push("Prazo deve ser maior que zero.");
  if (prazo > 35) errors.push("Prazo máximo inicial é 35 anos.");
  return errors;
}
