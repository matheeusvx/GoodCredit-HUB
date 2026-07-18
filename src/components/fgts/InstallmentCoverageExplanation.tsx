import { ChevronDown, CircleDollarSign } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { formatCurrencyBRL } from "../../lib/fgts/currency";
import type {
  InstallmentCoverageInput,
  InstallmentCoverageResult
} from "../../lib/fgts/installmentCoverage";

interface Props {
  input: InstallmentCoverageInput;
  result: InstallmentCoverageResult;
}

const percentFormatter = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
});

function formatPercent(decimalValue: number): string {
  return percentFormatter.format(Number.isFinite(decimalValue) ? decimalValue : 0);
}

export function InstallmentCoverageExplanation({ input, result }: Props) {
  const [expanded, setExpanded] = useState(true);
  const coverageDecimal = input.coveragePercent / 100;
  const balanceComparison = input.availableFgtsBalance < result.theoreticalCoverageLimit
    ? `Como o saldo disponível de ${formatCurrencyBRL(input.availableFgtsBalance)} é menor que o limite teórico de ${formatCurrencyBRL(result.theoreticalCoverageLimit)}, a simulação utiliza ${formatCurrencyBRL(result.appliedFgtsAmount)} do FGTS.`
    : input.availableFgtsBalance > result.theoreticalCoverageLimit
      ? `Embora o saldo disponível seja de ${formatCurrencyBRL(input.availableFgtsBalance)}, o limite permitido pela cobertura escolhida é de ${formatCurrencyBRL(result.theoreticalCoverageLimit)}. Por isso, somente ${formatCurrencyBRL(result.appliedFgtsAmount)} são utilizados nesta simulação.`
      : `O saldo disponível é exatamente igual ao limite teórico. Portanto, todo o valor de ${formatCurrencyBRL(result.appliedFgtsAmount)} é utilizado.`;

  return (
    <section className="mt-5 overflow-hidden rounded-lg border border-goodblue-200 bg-goodblue-50/60">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-4 p-5 text-left transition hover:bg-goodblue-50 focus:outline-none focus:ring-4 focus:ring-inset focus:ring-goodblue-100"
        aria-expanded={expanded}
        aria-controls="installment-coverage-explanation"
        onClick={() => setExpanded((current) => !current)}
      >
        <span className="flex items-start gap-3">
          <CircleDollarSign className="mt-0.5 h-5 w-5 shrink-0 text-goodblue-700" />
          <span>
            <span className="block text-base font-bold text-slate-950">Como esse cálculo foi feito?</span>
            <span className="mt-1 block text-sm font-normal leading-6 text-slate-600">
              Veja as etapas utilizadas para calcular a participação do FGTS e o valor restante das prestações.
            </span>
          </span>
        </span>
        <ChevronDown className={`h-5 w-5 shrink-0 text-slate-500 transition ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded && (
        <div id="installment-coverage-explanation" className="border-t border-goodblue-100 p-5">
          <div className="grid gap-4 xl:grid-cols-2">
            <CalculationStep number="1" title="Total das prestações">
              <p>Primeiro, multiplicamos o valor de cada prestação pela quantidade de prestações informada.</p>
              <FormulaBox>
                <span>Total das prestações = Valor da prestação × Quantidade</span>
                <strong>{formatCurrencyBRL(input.installmentAmount)} × {input.installmentCount} = {formatCurrencyBRL(result.totalInstallments)}</strong>
              </FormulaBox>
              <p className="font-semibold text-slate-800">
                {input.installmentCount === 1
                  ? `O total de 1 prestação é de ${formatCurrencyBRL(result.totalInstallments)}.`
                  : `O total das ${input.installmentCount} prestações é de ${formatCurrencyBRL(result.totalInstallments)}.`}
              </p>
            </CalculationStep>

            <CalculationStep number="2" title="Limite teórico de cobertura">
              <p>Em seguida, aplicamos o percentual de cobertura escolhido sobre o total das prestações.</p>
              <FormulaBox>
                <span>Limite teórico = Total das prestações × Cobertura</span>
                <strong>{formatCurrencyBRL(result.totalInstallments)} × {formatPercent(coverageDecimal)} = {formatCurrencyBRL(result.theoreticalCoverageLimit)}</strong>
              </FormulaBox>
              <p className="font-semibold text-slate-800">Com uma cobertura de {formatPercent(coverageDecimal)}, o limite teórico de utilização do FGTS é de {formatCurrencyBRL(result.theoreticalCoverageLimit)}.</p>
              <p>Esse é o valor máximo que poderia ser coberto pelo FGTS considerando apenas o percentual selecionado.</p>
            </CalculationStep>

            <CalculationStep number="3" title="FGTS efetivamente utilizado">
              <p>O sistema compara o limite teórico com o saldo disponível do FGTS e utiliza o menor entre os dois valores.</p>
              <FormulaBox>
                <span>FGTS utilizado = menor valor entre saldo e limite</span>
                <strong>menor entre {formatCurrencyBRL(input.availableFgtsBalance)} e {formatCurrencyBRL(result.theoreticalCoverageLimit)} = {formatCurrencyBRL(result.appliedFgtsAmount)}</strong>
              </FormulaBox>
              <p className="font-semibold text-slate-800">{balanceComparison}</p>
            </CalculationStep>

            <CalculationStep number="4" title="Valor restante do cliente">
              <p>Por fim, subtraímos o FGTS utilizado do total das prestações.</p>
              <FormulaBox>
                <span>Valor restante = Total das prestações − FGTS utilizado</span>
                <strong>{formatCurrencyBRL(result.totalInstallments)} − {formatCurrencyBRL(result.appliedFgtsAmount)} = {formatCurrencyBRL(result.remainingClientAmount)}</strong>
              </FormulaBox>
              <p className="font-semibold text-slate-800">Após a utilização de {formatCurrencyBRL(result.appliedFgtsAmount)} do FGTS, restará ao cliente o pagamento de {formatCurrencyBRL(result.remainingClientAmount)}.</p>
            </CalculationStep>
          </div>

          <div className="mt-5 rounded-lg border border-goodgreen-200 bg-white p-5">
            <h3 className="font-bold text-slate-950">Resumo da simulação</h3>
            <dl className="mt-4 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
              <SummaryItem label="Total das prestações" value={formatCurrencyBRL(result.totalInstallments)} />
              <SummaryItem label="Cobertura selecionada" value={formatPercent(coverageDecimal)} />
              <SummaryItem label="Limite teórico de cobertura" value={formatCurrencyBRL(result.theoreticalCoverageLimit)} />
              <SummaryItem label="Saldo disponível do FGTS" value={formatCurrencyBRL(input.availableFgtsBalance)} />
              <SummaryItem label="FGTS utilizado na simulação" value={formatCurrencyBRL(result.appliedFgtsAmount)} />
              <SummaryItem label="Cobertura efetiva alcançada" value={formatPercent(result.effectiveCoveragePercent)} />
              <SummaryItem label="Valor restante a pagar pelo cliente" value={formatCurrencyBRL(result.remainingClientAmount)} />
              <SummaryItem label="Saldo de FGTS não utilizado" value={formatCurrencyBRL(result.unusedFgtsBalance)} />
            </dl>
          </div>
        </div>
      )}
    </section>
  );
}

function CalculationStep({ number, title, children }: { number: string; title: string; children: ReactNode }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-goodblue-600 text-sm font-bold text-white">{number}</span>
        <h3 className="font-bold text-slate-950">{title}</h3>
      </div>
      <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">{children}</div>
    </article>
  );
}

function FormulaBox({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 [&_strong]:break-words [&_strong]:text-slate-950">{children}</div>;
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-2"><dt className="text-slate-600">{label}</dt><dd className="text-right font-bold text-slate-950">{value}</dd></div>;
}
