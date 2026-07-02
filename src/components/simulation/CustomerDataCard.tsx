import { SimulationFormData } from "../../types/simulation";
import { civilStatusOptions } from "./formOptions";

interface Props {
  form: SimulationFormData;
  onChange: (patch: Partial<SimulationFormData>) => void;
}

export function CustomerDataCard({ form, onChange }: Props) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
      <h2 className="text-lg font-bold text-slate-950">Dados do Cliente</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <label className="field">
          <span>Nome completo ou processo</span>
          <input value={form.nomeCompleto} onChange={(event) => onChange({ nomeCompleto: event.target.value })} />
        </label>
        <label className="field">
          <span>Data de nascimento</span>
          <input
            type="date"
            value={form.dataNascimento}
            onChange={(event) => onChange({ dataNascimento: event.target.value })}
          />
        </label>
        <label className="field">
          <span>Estado civil</span>
          <select
            value={form.estadoCivil}
            onChange={(event) => onChange({ estadoCivil: event.target.value as SimulationFormData["estadoCivil"] })}
            className="select-field"
          >
            <option value="">Selecione</option>
            {civilStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}
