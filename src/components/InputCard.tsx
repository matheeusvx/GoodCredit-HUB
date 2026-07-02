import { Calculator } from "lucide-react";
import { calcMonthlyRate, formatCurrencyBR, formatPercentBR } from "../lib/financial";
import { FinancingInputs } from "../types/amortization";

interface InputCardProps {
  inputs: FinancingInputs;
  valorFinanciadoInput: string;
  prazoMesesInput: string;
  taxaAnualInput: string;
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
  onValorFinanciadoInputChange,
  onValorFinanciadoBlur,
  onPrazoMesesInputChange,
  onPrazoMesesBlur,
  onTaxaAnualInputChange,
  onTaxaAnualBlur,
  errors
}: InputCardProps) {
  const monthlyRate = calcMonthlyRate(inputs.taxaAnual);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-goodgreen-50 text-goodgreen-700">
          <Calculator className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-950">Parâmetros do financiamento</h2>
          <p className="text-sm text-slate-500">Informe os dados principais da operação.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <label className="field">
          <span>Valor financiado</span>
          <input
            type="text"
            inputMode="decimal"
            value={valorFinanciadoInput}
            onChange={(event) => onValorFinanciadoInputChange(event.target.value)}
            onBlur={onValorFinanciadoBlur}
          />
          <small>{formatCurrencyBR(inputs.valorFinanciado)}</small>
        </label>

        <label className="field">
          <span>Prazo em meses</span>
          <input
            type="text"
            inputMode="numeric"
            value={prazoMesesInput}
            onChange={(event) => onPrazoMesesInputChange(event.target.value)}
            onBlur={onPrazoMesesBlur}
          />
          <small>{inputs.prazoMeses} meses</small>
        </label>

        <label className="field">
          <span>Taxa anual efetiva</span>
          <input
            type="text"
            inputMode="decimal"
            value={taxaAnualInput}
            onChange={(event) => onTaxaAnualInputChange(event.target.value)}
            onBlur={onTaxaAnualBlur}
          />
          <small>{formatPercentBR(inputs.taxaAnual)} ao ano</small>
        </label>

        <div className="field readonly">
          <span>Taxa mensal calculada</span>
          <strong>{formatPercentBR(monthlyRate)}</strong>
          <small>Conversão efetiva mensal</small>
        </div>

        <div className="field readonly">
          <span>Sistema selecionado</span>
          <strong>{inputs.sistema}</strong>
          <small>{inputs.sistema === "SAC" ? "Amortização constante" : "Parcela calculada por PMT"}</small>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errors.join(" ")}
        </div>
      )}
    </section>
  );
}
