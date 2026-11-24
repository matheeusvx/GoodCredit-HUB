import { calcMonthlyRate, formatCurrencyBR, formatPercentBR } from "../lib/financial";
import { AmortizationSystem, FinancingInputs } from "../types/amortization";
import { SegmentedControl } from "./ui/SegmentedControl";

interface InputCardProps {
  inputs: FinancingInputs;
  valorFinanciadoInput: string;
  prazoMesesInput: string;
  taxaAnualInput: string;
  onClientNameChange: (value: string) => void;
  onSystemChange: (value: AmortizationSystem) => void;
  onValorFinanciadoInputChange: (value: string) => void;
  onValorFinanciadoBlur: () => void;
  onPrazoMesesInputChange: (value: string) => void;
  onPrazoMesesBlur: () => void;
  onTaxaAnualInputChange: (value: string) => void;
  onTaxaAnualBlur: () => void;
  errors: string[];
}

export function InputCard({
  inputs,
  valorFinanciadoInput,
  prazoMesesInput,
  taxaAnualInput,
  onClientNameChange,
  onSystemChange,
  onValorFinanciadoInputChange,
  onValorFinanciadoBlur,
  onPrazoMesesInputChange,
  onPrazoMesesBlur,
  onTaxaAnualInputChange,
  onTaxaAnualBlur,
  errors
}: InputCardProps) {
  const monthlyRate = calcMonthlyRate(inputs.taxaAnual);
  const years = inputs.prazoMeses / 12;

  return (
    <section className="surface p-5 sm:p-6" aria-labelledby="financing-params-title">
      <h2 id="financing-params-title" className="text-base font-bold text-ink">
        Parâmetros do financiamento
      </h2>

      <div className="mt-4 grid gap-x-4 gap-y-5 sm:grid-cols-2 xl:grid-cols-12">
        <label className="field sm:col-span-2 xl:col-span-3">
          <span>Cliente</span>
          <input
            value={inputs.nomeCliente}
            onChange={(event) => onClientNameChange(event.target.value)}
            placeholder="Nome do cliente"
          />
          <small>&nbsp;</small>
        </label>

        <label className="field xl:col-span-3">
          <span>Valor financiado</span>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-ink-muted">R$</span>
            <input
              type="text"
              inputMode="decimal"
              className="!pl-9 text-right"
              value={valorFinanciadoInput.replace(/^R\$\s?/, "")}
              onChange={(event) => onValorFinanciadoInputChange(event.target.value)}
              onBlur={onValorFinanciadoBlur}
            />
          </div>
          <small>{formatCurrencyBR(inputs.valorFinanciado)}</small>
        </label>

        <label className="field xl:col-span-2">
          <span>Prazo</span>
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              className="!pr-16 text-right"
              value={prazoMesesInput}
              onChange={(event) => onPrazoMesesInputChange(event.target.value)}
              onBlur={onPrazoMesesBlur}
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-ink-muted">meses</span>
          </div>
          <small>
            {Number.isInteger(years) ? years : years.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} {years === 1 ? "ano" : "anos"}
          </small>
        </label>

        <label className="field xl:col-span-2">
          <span>Taxa efetiva</span>
          <div className="relative">
            <input
              type="text"
              inputMode="decimal"
              className="!pr-16 text-right"
              value={taxaAnualInput}
              onChange={(event) => onTaxaAnualInputChange(event.target.value)}
              onBlur={onTaxaAnualBlur}
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-ink-muted">% a.a.</span>
          </div>
          <small>{formatPercentBR(monthlyRate)} ao mês</small>
        </label>

        <div className="field xl:col-span-2">
          <span>Sistema</span>
          <SegmentedControl
            label="Sistema de amortização"
            fill
            value={inputs.sistema}
            options={[
              { value: "SAC", label: "SAC" },
              { value: "PRICE", label: "PRICE" }
            ]}
            onChange={onSystemChange}
          />
          <small>{inputs.sistema === "SAC" ? "Amortização constante" : "Parcela constante"}</small>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="mt-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 animate-rise">
          {errors.join(" ")}
        </div>
      )}
    </section>
  );
}
