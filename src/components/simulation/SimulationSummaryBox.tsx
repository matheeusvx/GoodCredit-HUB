interface Props {
  text: string;
}

export function SimulationSummaryBox({ text }: Props) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
      <h2 className="text-lg font-bold text-slate-950">Resumo da Simulação</h2>
      <textarea
        value={text}
        readOnly
        className="mt-4 min-h-96 w-full resize-y rounded-lg border border-slate-200 bg-slate-50 p-4 font-mono text-sm leading-6 text-slate-800 outline-none"
      />
    </section>
  );
}
