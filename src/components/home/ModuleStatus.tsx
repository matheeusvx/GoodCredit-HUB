const statuses = [
  ["Simulação de Financiamento", "Ativo"],
  ["Planilha de Amortização", "Ativo"],
  ["Checklist Documental", "Ativo"],
  ["Apuração de Renda", "Ativo"],
  ["Uso de FGTS", "Ativo"]
] as const;

export function ModuleStatus() {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel sm:p-6">
      <h2 className="text-xl font-bold text-slate-950">Status dos módulos</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {statuses.map(([name, status]) => (
          <div key={name} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-bold text-slate-900">{name}</p>
            <span
              className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                status === "Ativo" ? "bg-goodgreen-50 text-goodgreen-700" : "bg-amber-50 text-amber-700"
              }`}
            >
              {status}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
