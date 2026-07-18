import { useMemo, useState } from "react";
import { formatCurrencyBRL, normalizeCurrencyInput, parseCurrencyBRL } from "../../lib/fgts/currency";
import {
  calculateInstallmentCoverage,
  MAXIMUM_INSTALLMENT_COVERAGE_PERCENT
} from "../../lib/fgts/installmentCoverage";
import { InstallmentCoverageExplanation } from "./InstallmentCoverageExplanation";

const percentFormatter = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
});

const inputClass = "mt-2 h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-goodblue-500 focus:ring-4 focus:ring-goodblue-100";

export function FgtsInstallmentPaymentInfo() {
  const [installmentInput, setInstallmentInput] = useState("");
  const [countInput, setCountInput] = useState("12");
  const [coverageInput, setCoverageInput] = useState("80");
  const [balanceInput, setBalanceInput] = useState("");
  const [coverageWarning, setCoverageWarning] = useState("");

  const installmentAmount = parseCurrencyBRL(installmentInput);
  const installmentCount = Number(countInput);
  const coveragePercent = Number(coverageInput.replace(",", "."));
  const availableFgtsBalance = parseCurrencyBRL(balanceInput);
  const isValid =
    installmentInput.trim().length > 0 &&
    installmentAmount > 0 &&
    countInput.trim().length > 0 &&
    Number.isInteger(installmentCount) &&
    installmentCount > 0 &&
    coverageInput.trim().length > 0 &&
    Number.isFinite(coveragePercent) &&
    coveragePercent >= 0 &&
    coveragePercent <= MAXIMUM_INSTALLMENT_COVERAGE_PERCENT &&
    balanceInput.trim().length > 0 &&
    availableFgtsBalance >= 0;

  const calculationInput = useMemo(() => ({
    installmentAmount,
    installmentCount,
    coveragePercent,
    availableFgtsBalance
  }), [availableFgtsBalance, coveragePercent, installmentAmount, installmentCount]);
  const result = useMemo(() => calculateInstallmentCoverage(calculationInput), [calculationInput]);

  const cards = [
    ["Total das prestações", result.totalInstallments],
    ["Limite teórico de cobertura", result.theoreticalCoverageLimit],
    ["FGTS utilizado na simulação", result.appliedFgtsAmount],
    ["Valor restante a pagar pelo cliente", result.remainingClientAmount]
  ] as const;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-xl font-bold text-slate-950">Pagamento de Parte das Prestações</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Esta modalidade é diferente da amortização do saldo devedor e não será enviada à planilha como redução direta. A cobertura teórica é limitada a 80% e depende do agente financeiro.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CurrencyField
          label="Valor da prestação"
          value={installmentInput}
          onChange={setInstallmentInput}
          placeholder="R$ 1.200,00"
          invalid={installmentInput.trim().length > 0 && installmentAmount <= 0}
          error="Informe um valor maior que zero."
        />

        <label className="text-sm font-semibold text-slate-700">
          Quantidade de prestações
          <input
            type="text"
            inputMode="numeric"
            className={inputClass}
            value={countInput}
            onChange={(event) => setCountInput(event.target.value.replace(/\D/g, ""))}
            aria-invalid={countInput.trim().length === 0 || installmentCount <= 0}
          />
          {(countInput.trim().length === 0 || installmentCount <= 0) && <span className="mt-1 block text-xs font-medium text-red-600">Informe um número inteiro maior que zero.</span>}
        </label>

        <label className="text-sm font-semibold text-slate-700">
          Cobertura (máx. 80%)
          <input
            type="text"
            inputMode="decimal"
            className={inputClass}
            value={coverageInput}
            onChange={(event) => {
              const sanitized = event.target.value.replace(/[^\d.,]/g, "");
              const parsed = Number(sanitized.replace(",", "."));
              if (Number.isFinite(parsed) && parsed > MAXIMUM_INSTALLMENT_COVERAGE_PERCENT) {
                setCoverageInput(String(MAXIMUM_INSTALLMENT_COVERAGE_PERCENT));
                setCoverageWarning("A cobertura máxima permitida nesta simulação é de 80%.");
                return;
              }
              setCoverageInput(sanitized);
              setCoverageWarning("");
            }}
            aria-describedby={coverageWarning ? "coverage-warning" : undefined}
          />
          {coverageWarning && <span id="coverage-warning" className="mt-1 block text-xs font-medium text-amber-700">{coverageWarning}</span>}
        </label>

        <CurrencyField
          label="Saldo disponível do FGTS"
          value={balanceInput}
          onChange={setBalanceInput}
          placeholder="R$ 4.500,00"
        />
      </div>

      {isValid ? (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map(([label, value], index) => (
              <article key={label} className={`rounded-lg border p-4 ${index === 2 ? "border-goodgreen-200 bg-goodgreen-50" : "border-slate-200 bg-slate-50"}`}>
                <p className="text-xs font-semibold leading-5 text-slate-500">{label}</p>
                <p className={`mt-1 break-words font-bold ${index === 2 ? "text-goodgreen-700" : "text-slate-950"}`}>{formatCurrencyBRL(value)}</p>
              </article>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
            <span className="rounded-full bg-slate-100 px-3 py-1">Cobertura efetiva: {percentFormatter.format(result.effectiveCoveragePercent)}</span>
            <span className="rounded-full bg-slate-100 px-3 py-1">Saldo não utilizado: {formatCurrencyBRL(result.unusedFgtsBalance)}</span>
          </div>

          <InstallmentCoverageExplanation input={calculationInput} result={result} />
        </>
      ) : (
        <div className="mt-5 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-5 py-6 text-center text-sm font-medium text-slate-600">
          Preencha os campos corretamente para visualizar o cálculo.
        </div>
      )}

      <p className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
        Este cálculo é meramente orientativo e não representa autorização para utilização do FGTS. A aplicação efetiva depende das regras vigentes, do enquadramento do contrato e da análise do agente financeiro.
      </p>
    </section>
  );
}

function CurrencyField({
  label,
  value,
  onChange,
  placeholder,
  invalid = false,
  error
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  invalid?: boolean;
  error?: string;
}) {
  return (
    <label className="text-sm font-semibold text-slate-700">
      {label}
      <input
        type="text"
        inputMode="decimal"
        className={inputClass}
        value={value}
        placeholder={placeholder}
        aria-invalid={invalid}
        onChange={(event) => onChange(normalizeCurrencyInput(event.target.value))}
        onBlur={() => {
          if (value.trim()) onChange(formatCurrencyBRL(parseCurrencyBRL(value)));
        }}
      />
      {invalid && error && <span className="mt-1 block text-xs font-medium text-red-600">{error}</span>}
    </label>
  );
}
