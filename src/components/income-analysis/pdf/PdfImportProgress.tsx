export function PdfImportProgress({ label, progress, onCancel }: { label: string; progress: number; onCancel: () => void }) {
  const percent = Math.max(0, Math.min(100, Math.round(progress * 100)));
  return <div className="rounded-xl border border-goodblue-200 bg-goodblue-50 p-4">
    <div className="flex items-center justify-between gap-4 text-sm"><span className="font-semibold text-goodblue-900">{label}</span><span className="tabular-nums text-goodblue-700">{percent}%</span></div>
    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-goodblue-600 transition-[width]" style={{ width: `${percent}%` }} /></div>
    <button type="button" className="mt-3 text-sm font-semibold text-rose-700 hover:underline" onClick={onCancel}>Cancelar processamento</button>
  </div>;
}
