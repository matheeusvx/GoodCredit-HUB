import { Calculator, Eraser } from "lucide-react";
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
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1700px] flex-col gap-5 px-4 py-5 sm:px-6 xl:px-8">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-goodgreen-600">GoodCredit Hub</p>
              <h1 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">Simulação de Financiamento</h1>
              <p className="mt-1 text-sm text-slate-600">
                Preencha os dados da operação para gerar uma simulação inicial aproximada
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={calculate} className="btn-primary">
                <Calculator className="h-4 w-4" />
                Calcular Simulação
              </button>
              <button type="button" onClick={clear} className="btn-muted">
                <Eraser className="h-4 w-4" />
                Limpar
              </button>
              <SendToAmortizationButton result={result} onSend={onSendToAmortization} />
            </div>
          </div>
        </div>
      </header>

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
        <section className="rounded-lg border border-goodblue-100 bg-goodblue-50 px-4 py-3 text-sm leading-6 text-goodblue-800">
          Esta versão pública da simulação não solicita CPF, telefone ou e-mail. Os dados informados são utilizados apenas
          para cálculo estimativo no navegador.
        </section>

        {result && (
          <>
            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
              <h2 className="text-lg font-bold text-slate-950">Resultado da Simulação</h2>
              <div className="mt-4">
                <SimulationResultCards result={result} />
              </div>
            </section>
            <section className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
              Esta é uma simulação estimativa e não representa aprovação de crédito. A aprovação final depende da análise
              bancária, validação documental, regras vigentes, avaliação do imóvel e perfil do cliente.
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
