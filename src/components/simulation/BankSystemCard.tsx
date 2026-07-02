import { SimulationFormData } from "../../types/simulation";
import { bankOptions } from "./formOptions";

interface Props {
  form: SimulationFormData;
  onChange: (patch: Partial<SimulationFormData>) => void;
}

export function BankSystemCard({ form, onChange }: Props) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
      <h2 className="text-lg font-bold text-slate-950">Banco e Sistema</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <label className="field">
          <span>Banco pretendido</span>
          <select
            value={form.bancoPretendido}
            onChange={(event) =>
              onChange({ bancoPretendido: event.target.value as SimulationFormData["bancoPretendido"] })
            }
            className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-950 outline-none transition focus:border-goodblue-500 focus:ring-4 focus:ring-goodblue-100"
          >
            <option value="">Selecione</option>
            {bankOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <div className="field">
          <span>Sistema amortizador</span>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {(["SAC", "PRICE"] as const).map((system) => (
              <label key={system} className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700">
                <input
                  type="radio"
                  name="sistemaAmortizador"
                  checked={form.sistemaAmortizador === system}
                  onChange={() => onChange({ sistemaAmortizador: system })}
                  className="text-goodgreen-600 focus:ring-goodgreen-500"
                />
                {system}
              </label>
            ))}
          </div>
        </div>
        <label className="field">
          <span>Prazo em anos</span>
          <input
            type="text"
            inputMode="numeric"
            value={form.prazoAnosInput}
            onChange={(event) => {
              const sanitized = event.target.value.replace(/\D/g, "");
              const parsed = Number(sanitized || 0);
              onChange({ prazoAnosInput: parsed > 35 ? "35" : sanitized });
            }}
            onBlur={() => {
              const parsed = Math.min(35, Math.max(1, Number(form.prazoAnosInput || 30)));
              onChange({ prazoAnosInput: String(parsed) });
            }}
          />
          <small>{Math.min(35, Math.max(1, Number(form.prazoAnosInput || 30))) * 12} meses</small>
        </label>
      </div>
    </section>
  );
}
