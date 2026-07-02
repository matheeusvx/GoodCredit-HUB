import { SimulationFormData } from "../../types/simulation";
import { formatCurrencyBRL, parseNumberBR } from "../../lib/simulation/formatters";
import { financingTypeOptions, operationTypeOptions, ufOptions } from "./formOptions";

interface Props {
  form: SimulationFormData;
  onChange: (patch: Partial<SimulationFormData>) => void;
}

function moneyBlur(value: string) {
  const parsed = parseNumberBR(value);
  return parsed > 0 ? formatCurrencyBRL(parsed) : "";
}

export function OperationDataCard({ form, onChange }: Props) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
      <h2 className="text-lg font-bold text-slate-950">Dados da Operação</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <label className="field">
          <span>Tipo de financiamento</span>
          <select
            value={form.tipoFinanciamento}
            onChange={(event) =>
              onChange({ tipoFinanciamento: event.target.value as SimulationFormData["tipoFinanciamento"] })
            }
            className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-950 outline-none transition focus:border-goodblue-500 focus:ring-4 focus:ring-goodblue-100"
          >
            <option value="">Selecione</option>
            {financingTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Tipo de operação</span>
          <select
            value={form.tipoOperacao}
            onChange={(event) => onChange({ tipoOperacao: event.target.value as SimulationFormData["tipoOperacao"] })}
            className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-950 outline-none transition focus:border-goodblue-500 focus:ring-4 focus:ring-goodblue-100"
          >
            <option value="">Selecione</option>
            {operationTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Estado / UF</span>
          <select
            value={form.uf}
            onChange={(event) => onChange({ uf: event.target.value })}
            className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-950 outline-none transition focus:border-goodblue-500 focus:ring-4 focus:ring-goodblue-100"
          >
            <option value="">UF</option>
            {ufOptions.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Valor do imóvel</span>
          <input
            type="text"
            inputMode="decimal"
            value={form.valorImovelInput}
            onChange={(event) => onChange({ valorImovelInput: event.target.value.replace(/[^\d.,R$\s]/g, "") })}
            onBlur={() => onChange({ valorImovelInput: moneyBlur(form.valorImovelInput) })}
          />
        </label>
        <label className="field">
          <span>Valor do financiamento</span>
          <input
            type="text"
            inputMode="decimal"
            value={form.valorFinanciamentoInput}
            onChange={(event) =>
              onChange({ valorFinanciamentoInput: event.target.value.replace(/[^\d.,R$\s]/g, "") })
            }
            onBlur={() => onChange({ valorFinanciamentoInput: moneyBlur(form.valorFinanciamentoInput) })}
          />
        </label>
        <label className="field">
          <span>Renda bruta familiar</span>
          <input
            type="text"
            inputMode="decimal"
            value={form.rendaBrutaFamiliarInput}
            onChange={(event) =>
              onChange({ rendaBrutaFamiliarInput: event.target.value.replace(/[^\d.,R$\s]/g, "") })
            }
            onBlur={() => onChange({ rendaBrutaFamiliarInput: moneyBlur(form.rendaBrutaFamiliarInput) })}
          />
        </label>
      </div>
    </section>
  );
}
