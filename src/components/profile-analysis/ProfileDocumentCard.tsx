import { ArrowRight, CheckCircle2, Clock3, type LucideIcon } from "lucide-react";
import type { ProfileDocumentOption } from "../../types/profileAnalysis";

export function ProfileDocumentCard({
  option,
  icon: Icon,
  onSelect,
}: {
  option: ProfileDocumentOption;
  icon: LucideIcon;
  onSelect: () => void;
}) {
  const available = option.availability === "AVAILABLE";
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`${option.title}. ${available ? "Disponível" : "Em desenvolvimento"}`}
      className="group flex min-h-56 w-full flex-col rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-goodgreen-200 hover:shadow-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goodgreen-500 focus-visible:ring-offset-2 sm:p-6"
    >
      <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${available ? "bg-goodgreen-50 text-goodgreen-700" : "bg-slate-100 text-slate-600"}`}>
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <span className="mt-5 text-lg font-bold text-slate-950">{option.title}</span>
      <span className="mt-2 flex-1 text-sm leading-6 text-slate-500">{option.description}</span>
      <span className="mt-5 flex w-full items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${available ? "bg-goodgreen-50 text-goodgreen-700" : "bg-amber-50 text-amber-700"}`}>
          {available ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />}
          {available ? "Disponível" : "Em desenvolvimento"}
        </span>
        <ArrowRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-goodgreen-600" aria-hidden="true" />
      </span>
    </button>
  );
}
