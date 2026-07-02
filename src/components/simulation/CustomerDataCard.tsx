import { SimulationFormData } from "../../types/simulation";
import { formatCpf, formatPhone } from "../../lib/simulation/formatters";
import { civilStatusOptions } from "./formOptions";

interface Props {
  form: SimulationFormData;
  onChange: (patch: Partial<SimulationFormData>) => void;
}

export function CustomerDataCard({ form, onChange }: Props) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
      <h2 className="text-lg font-bold text-slate-950">Dados do Cliente</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <label className="field">
          <span>Nome completo</span>
          <input value={form.nomeCompleto} onChange={(event) => onChange({ nomeCompleto: event.target.value })} />
        </label>
        <label className="field">
          <span>CPF</span>
          <input
            type="text"
            inputMode="numeric"
            value={form.cpf}
            onChange={(event) => onChange({ cpf: formatCpf(event.target.value) })}
          />
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
          <span>Celular com DDD</span>
          <input
            type="text"
            inputMode="numeric"
            value={form.celular}
            onChange={(event) => onChange({ celular: formatPhone(event.target.value) })}
          />
        </label>
        <label className="field">
          <span>E-mail</span>
          <input value={form.email} onChange={(event) => onChange({ email: event.target.value })} />
        </label>
        <label className="field">
          <span>Estado civil</span>
          <select
            value={form.estadoCivil}
            onChange={(event) => onChange({ estadoCivil: event.target.value as SimulationFormData["estadoCivil"] })}
            className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-950 outline-none transition focus:border-goodblue-500 focus:ring-4 focus:ring-goodblue-100"
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
