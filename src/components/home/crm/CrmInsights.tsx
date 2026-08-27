import { Clock3, Lightbulb, MessageCircleMore, TrendingUp } from "lucide-react";

const icons = [TrendingUp, MessageCircleMore, Clock3];

export function CrmInsights({ insights }: { insights: string[] }) {
  return (
    <section className="rounded-xl border border-goodgreen-100 bg-[linear-gradient(135deg,#ffffff_0%,#edf8ef_100%)] p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-goodgreen-100 text-goodgreen-700"><Lightbulb className="h-5 w-5" aria-hidden="true" /></span><div><h2 className="font-bold text-slate-950">Insights</h2><p className="text-xs text-slate-500">Leituras automáticas do período</p></div></div>
      {insights.length ? <ul className="mt-5 grid gap-3 lg:grid-cols-3">{insights.map((insight, index) => { const Icon = icons[index] || Lightbulb; return <li key={insight} className="flex gap-3 rounded-xl border border-white bg-white/80 p-4 text-sm leading-6 text-slate-700 shadow-sm"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-goodgreen-700" aria-hidden="true" /><span>{insight}</span></li>; })}</ul> : <p className="mt-4 text-sm text-slate-500">Ainda não há dados suficientes para gerar comparações relevantes.</p>}
    </section>
  );
}
