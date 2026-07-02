export function HomeHero() {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-panel">
      <div className="bg-[linear-gradient(135deg,#ffffff_0%,#edf8ef_48%,#edf6fb_100%)] p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-goodgreen-700">GoodCredit Hub</p>
        <h1 className="mt-3 max-w-4xl text-3xl font-bold leading-tight text-slate-950 sm:text-4xl">
          Bem-vindo ao GoodCredit Hub
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
          Central inteligente para simulação, amortização, checklist documental e apoio operacional em financiamentos imobiliários.
        </p>
      </div>
    </section>
  );
}
