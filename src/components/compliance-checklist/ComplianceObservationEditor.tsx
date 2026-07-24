import { Save, Trash2 } from "lucide-react";

interface Props {
  itemLabel: string;
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onRemove: () => void;
}

export function ComplianceObservationEditor({
  itemLabel,
  value,
  onChange,
  onSave,
  onRemove
}: Props) {
  return (
    <div className="border-t border-slate-100 bg-slate-50 px-4 py-4 sm:px-5">
      <label className="block">
        <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
          Observação de {itemLabel}
        </span>
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Descreva a pendência ou informação relevante..."
          rows={3}
          className="mt-2 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm leading-6 text-slate-900 outline-none transition focus:border-goodgreen-500 focus:ring-4 focus:ring-goodgreen-500/10"
        />
      </label>
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        {value.trim() && (
          <button type="button" onClick={onRemove} className="btn-muted">
            <Trash2 className="h-4 w-4" />
            Remover observação
          </button>
        )}
        <button type="button" onClick={onSave} className="btn-secondary">
          <Save className="h-4 w-4" />
          Salvar observação
        </button>
      </div>
    </div>
  );
}
