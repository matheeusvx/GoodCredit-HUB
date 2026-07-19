import { ChevronDown } from "lucide-react";
import { useState } from "react";
import type { UsageGuide } from "../../types/usageGuide";
import { usageGuideIcons } from "./usageGuideIcons";

interface Props {
  guides: UsageGuide[];
  selectedId: UsageGuide["id"];
  onSelect: (guide: UsageGuide) => void;
}

function NavigationItems({ guides, selectedId, onSelect }: Props) {
  return (
    <nav aria-label="Módulos do Guia de Uso" className="space-y-1">
      {guides.map((guide) => {
        const Icon = usageGuideIcons[guide.icon];
        const selected = guide.id === selectedId;
        return (
          <button
            key={guide.id}
            type="button"
            onClick={() => onSelect(guide)}
            aria-current={selected ? "page" : undefined}
            className={`flex min-h-10 w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goodgreen-400 ${selected ? "bg-goodgreen-50 text-goodgreen-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{guide.title}</span>
          </button>
        );
      })}
    </nav>
  );
}

export function UsageGuideNavigation(props: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const selected = props.guides.find((guide) => guide.id === props.selectedId);

  return (
    <>
      <aside className="hidden self-start rounded-lg border border-slate-200 bg-white p-3 shadow-sm lg:sticky lg:top-5 lg:block">
        <p className="px-3 pb-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Índice do guia</p>
        <NavigationItems {...props} />
      </aside>
      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm lg:hidden">
        <button
          type="button"
          aria-expanded={mobileOpen}
          aria-controls="usage-guide-mobile-navigation"
          onClick={() => setMobileOpen((current) => !current)}
          className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-2 text-left font-bold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goodgreen-400"
        >
          <span>Índice: {selected?.title}</span>
          <ChevronDown className={`h-5 w-5 transition-transform ${mobileOpen ? "rotate-180" : ""}`} aria-hidden="true" />
        </button>
        {mobileOpen && (
          <div id="usage-guide-mobile-navigation" className="mt-2 border-t border-slate-100 pt-2" onClick={() => setMobileOpen(false)}>
            <NavigationItems {...props} />
          </div>
        )}
      </div>
    </>
  );
}
