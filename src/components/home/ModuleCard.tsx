import { LucideIcon } from "lucide-react";
import { HubView } from "../Sidebar";

interface Props {
  title: string;
  description: string;
  status: "Ativo" | "Em desenvolvimento";
  actionLabel: string;
  icon: LucideIcon;
  target?: HubView;
  onNavigate: (view: HubView) => void;
}

export function ModuleCard({ title, description, status, actionLabel, icon: Icon, target, onNavigate }: Props) {
  const active = status === "Ativo" && target;

  return (
    <article className={`flex min-h-64 flex-col rounded-lg border bg-white p-5 shadow-sm ${active ? "border-slate-200" : "border-slate-200 opacity-75"}`}>
      <div className="flex items-start justify-between gap-4">
        <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${active ? "bg-goodgreen-50 text-goodgreen-700" : "bg-slate-100 text-slate-500"}`}>
          <Icon className="h-5 w-5" />
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-bold ${
            active ? "bg-goodgreen-50 text-goodgreen-700" : "bg-amber-50 text-amber-700"
          }`}
        >
          {status}
        </span>
      </div>

      <h3 className="mt-5 text-lg font-bold text-slate-950">{title}</h3>
      <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{description}</p>

      <button
        type="button"
        disabled={!active}
        onClick={() => target && onNavigate(target)}
        className={active ? "btn-secondary mt-5 w-full" : "btn-muted mt-5 w-full cursor-not-allowed opacity-70"}
      >
        {actionLabel}
      </button>
    </article>
  );
}
