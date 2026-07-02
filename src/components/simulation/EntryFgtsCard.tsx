import { SimulationFormData, YesNo } from "../../types/simulation";
import { formatCurrencyBRL, parseNumberBR } from "../../lib/simulation/formatters";

interface Props {
  form: SimulationFormData;
  onChange: (patch: Partial<SimulationFormData>) => void;
}

function moneyBlur(value: string) {
  const parsed = parseNumberBR(value);
  return parsed > 0 ? formatCurrencyBRL(parsed) : "";
}

function YesNoRadio({
  name,
  value,
  onChange
}: {
  name: string;
  value: YesNo;
  onChange: (value: YesNo) => void;
}) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      {(["SIM", "NAO"] as const).map((option) => (
        <label key={option} className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700">
          <input
            type="radio"
            name={name}
            checked={value === option}
            onChange={() => onChange(option)}
            className="text-goodgreen-600 focus:ring-goodgreen-500"
          />
          {option === "SIM" ? "Sim" : "Não"}
        </label>
      ))}
    </div>
  );
}

export function EntryFgtsCard({ form, onChange }: Props) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
      <h2 className="text-lg font-bold text-slate-950">Entrada e FGTS</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="field">
          <span>Possui FGTS?</span>
          <YesNoRadio name="possuiFgts" value={form.possuiFgts} onChange={(possuiFgts) => onChange({ possuiFgts })} />
        </div>
        <label className="field">
          <span>Valor aproximado do saldo de FGTS</span>
          <input
            type="text"
            inputMode="decimal"
            value={form.saldoFgtsInput}
            disabled={form.possuiFgts === "NAO"}
            onChange={(event) => onChange({ saldoFgtsInput: event.target.value.replace(/[^\d.,R$\s]/g, "") })}
            onBlur={() => onChange({ saldoFgtsInput: moneyBlur(form.saldoFgtsInput) })}
          />
        </label>
        <div className="field">
          <span>Pretende dar entrada com recurso próprio?</span>
          <YesNoRadio
            name="pretendeEntrada"
            value={form.pretendeEntrada}
            onChange={(pretendeEntrada) => onChange({ pretendeEntrada })}
          />
        </div>
        <label className="field">
          <span>Valor de entrada com recurso próprio</span>
          <input
            type="text"
            inputMode="decimal"
            value={form.valorEntradaInput}
            disabled={form.pretendeEntrada === "NAO"}
            onChange={(event) => onChange({ valorEntradaInput: event.target.value.replace(/[^\d.,R$\s]/g, "") })}
            onBlur={() => onChange({ valorEntradaInput: moneyBlur(form.valorEntradaInput) })}
          />
        </label>
      </div>
    </section>
  );
}
