import { ArrowUpRight } from "lucide-react";
import type { ProfileDocumentOption } from "../../types/profileAnalysis";

export function ProfileDocumentCard({ option, onSelect }: { option: ProfileDocumentOption; onSelect: () => void }) {
  const available = option.availability === "AVAILABLE";
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`${option.title}. ${available ? "Disponível" : "Em desenvolvimento"}`}
      className="group relative flex min-h-[176px] w-full flex-col rounded-xl border border-slate-200/80 bg-white p-5 text-left shadow-sm transition duration-200 ease-out hover:border-goodgreen-200 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goodgreen-500 sm:p-6"
    >
      <span className="flex items-start justify-between gap-3">
        <span className={`text-[17px] font-semibold ${available ? "text-ink" : "text-ink-soft"}`}>{option.title}</span>
        <ArrowUpRight
          className="h-4 w-4 shrink-0 -translate-x-1 translate-y-1 text-goodgreen-600 opacity-0 transition duration-200 ease-out group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100"
          aria-hidden="true"
        />
      </span>
      <span className="mt-1.5 flex-1 text-[13px] leading-5 text-ink-muted">{option.description}</span>
      <span className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4 text-xs font-medium">
        <span className={`h-1.5 w-1.5 rounded-full ${available ? "bg-goodgreen-500" : "bg-slate-300"}`} aria-hidden="true" />
        <span className={available ? "text-goodgreen-700" : "text-ink-muted"}>{available ? "Disponível" : "Em desenvolvimento"}</span>
      </span>
    </button>
  );
}
