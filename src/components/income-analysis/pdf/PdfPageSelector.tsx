export function PdfPageSelector({ start, end, pageCount, disabled, onChange }: { start: number; end: number; pageCount: number; disabled: boolean; onChange: (start: number, end: number) => void }) {
  return <div className="grid gap-3 sm:grid-cols-2">
    <label className="text-sm font-semibold text-slate-700">Página inicial<input type="text" inputMode="numeric" className="input-field mt-2" value={start} disabled={disabled} onChange={(event) => onChange(Math.max(1, Number(event.target.value.replace(/\D/g, "")) || 1), end)} /></label>
    <label className="text-sm font-semibold text-slate-700">Página final<input type="text" inputMode="numeric" className="input-field mt-2" value={end} disabled={disabled} onChange={(event) => onChange(start, Math.min(pageCount, Math.max(1, Number(event.target.value.replace(/\D/g, "")) || 1)))} /></label>
  </div>;
}
