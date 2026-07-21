import { Calculator, RotateCcw } from "lucide-react";

interface Props {
  value: string;
  error?: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  onCalculate: () => void;
  onClear: () => void;
}

export function ItbiForm({ value, error, onChange, onBlur, onCalculate, onClear }: Props) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="itbi-form-title">
      <h3 id="itbi-form-title" className="text-lg font-bold text-slate-950">Dados da simulação</h3>
      <p className="mt-1 text-sm leading-6 text-slate-500">Esta versão utiliza exclusivamente o valor de compra e venda informado.</p>
      <label htmlFor="registration-purchase-price" className="mt-5 block text-sm font-semibold text-slate-700">
        Valor de compra e venda
        <input
          id="registration-purchase-price"
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          placeholder="R$ 0,00"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "registration-purchase-price-error" : undefined}
          className={`input-field mt-2 h-12 ${error ? "border-rose-400 focus:border-rose-500 focus:ring-rose-100" : ""}`}
        />
      </label>
      {error && <p id="registration-purchase-price-error" className="mt-2 text-sm font-semibold text-rose-700" role="alert">{error}</p>}
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={onCalculate} className="btn-primary sm:min-w-36">
          <Calculator className="h-4 w-4" aria-hidden="true" /> Calcular
        </button>
        <button type="button" onClick={onClear} className="btn-muted sm:min-w-44">
          <RotateCcw className="h-4 w-4" aria-hidden="true" /> Limpar simulação
        </button>
      </div>
    </section>
  );
}
