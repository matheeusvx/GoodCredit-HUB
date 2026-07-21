import { Building2, CheckCircle2, Clock3 } from "lucide-react";
import { REGISTRATION_CITIES } from "../../lib/registration/registrationCities";
import type { RegistrationCity } from "../../types/registration";

interface Props {
  value: RegistrationCity | "";
  onChange: (city: RegistrationCity) => void;
  error?: string;
}

export function ItbiCitySelector({ value, onChange, error }: Props) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="itbi-city-title">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-goodgreen-600">Município da operação</p>
        <h3 id="itbi-city-title" className="mt-1 text-lg font-bold text-slate-950">Selecione a cidade</h3>
        <p className="mt-1 text-sm leading-6 text-slate-500">Cada município utiliza uma configuração própria. Cidades futuras permanecem selecionáveis apenas para consulta de status.</p>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {REGISTRATION_CITIES.map((city) => {
          const selected = value === city.id;
          const available = city.availability === "AVAILABLE";
          return (
            <button
              key={city.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(city.id)}
              className={`min-h-[96px] rounded-lg border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goodgreen-400 focus-visible:ring-offset-2 ${
                selected
                  ? "border-goodgreen-400 bg-goodgreen-50 ring-1 ring-goodgreen-100"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <span className="flex items-start justify-between gap-3">
                <Building2 className={`h-5 w-5 shrink-0 ${selected ? "text-goodgreen-700" : "text-slate-400"}`} aria-hidden="true" />
                {selected && <CheckCircle2 className="h-4 w-4 shrink-0 text-goodgreen-700" aria-label="Cidade selecionada" />}
              </span>
              <span className="mt-3 block text-sm font-bold text-slate-900">{city.label}</span>
              <span className={`mt-1 inline-flex items-center gap-1 text-xs font-semibold ${available ? "text-goodgreen-700" : "text-amber-700"}`}>
                {!available && <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />}
                {available ? "Disponível" : "Em desenvolvimento"}
              </span>
            </button>
          );
        })}
      </div>
      {error && <p className="mt-4 text-sm font-semibold text-rose-700" role="alert">{error}</p>}
    </section>
  );
}
