function Pulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200/80 ${className}`} />;
}

export function CrmDashboardSkeleton() {
  return (
    <section className="space-y-5" aria-label="Carregando indicadores" aria-busy="true">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><Pulse className="h-7 w-64" /><Pulse className="mt-3 h-4 w-96 max-w-full" /></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => <div key={index} className="rounded-xl border border-slate-200 bg-white p-5"><Pulse className="h-4 w-32" /><Pulse className="mt-5 h-9 w-24" /><Pulse className="mt-4 h-5 w-40" /></div>)}
      </div>
      <div className="grid gap-5 xl:grid-cols-3"><div className="xl:col-span-2 rounded-xl border border-slate-200 bg-white p-6"><Pulse className="h-5 w-48" /><Pulse className="mt-6 h-64 w-full" /></div><div className="rounded-xl border border-slate-200 bg-white p-6"><Pulse className="h-5 w-36" /><Pulse className="mx-auto mt-6 h-52 w-52 rounded-full" /></div></div>
      <div className="rounded-xl border border-slate-200 bg-white p-6"><Pulse className="h-5 w-56" /><Pulse className="mt-6 h-44 w-full" /></div>
    </section>
  );
}
