import { Check } from "lucide-react";
import { ChecklistItem } from "../../types/checklist";

interface Props {
  item: ChecklistItem;
  checked: boolean;
  onToggle: () => void;
}

export function ChecklistItemRow({ item, checked, onToggle }: Props) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50">
      <button
        type="button"
        onClick={onToggle}
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
          checked ? "border-goodgreen-600 bg-goodgreen-600 text-white" : "border-slate-300 bg-white text-transparent"
        }`}
        aria-label={`Marcar ${item.label}`}
      >
        <Check className="h-3.5 w-3.5" />
      </button>
      <span className={checked ? "font-medium text-slate-500 line-through" : "font-medium text-slate-800"}>{item.label}</span>
    </label>
  );
}
