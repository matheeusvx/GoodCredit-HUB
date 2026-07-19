import { ArrowRight, BookOpen } from "lucide-react";
import type { UsageGuide, UsageGuideDestination } from "../../types/usageGuide";
import { usageGuideIcons } from "./usageGuideIcons";

interface Props {
  guides: UsageGuide[];
  selectedId: UsageGuide["id"];
  onSelect: (guide: UsageGuide) => void;
  onOpenModule: (destination: UsageGuideDestination) => void;
}

export function UsageGuideCards({ guides, selectedId, onSelect, onOpenModule }: Props) {
  return (
    <section aria-labelledby="usage-guide-modules-title">
      <div className="mb-4">
        <h2 id="usage-guide-modules-title" className="text-xl font-bold text-slate-950">Módulos documentados</h2>
        <p className="mt-1 text-sm text-slate-500">Escolha uma ferramenta para abrir sua orientação completa.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        {guides.map((guide) => {
          const Icon = usageGuideIcons[guide.icon];
          const selected = guide.id === selectedId;
          return (
            <article
              key={guide.id}
              className={`flex min-h-[250px] flex-col rounded-lg border bg-white p-5 shadow-sm transition ${selected ? "border-goodgreen-300 ring-2 ring-goodgreen-100" : "border-slate-200 hover:border-slate-300"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-goodgreen-50 text-goodgreen-700">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                {selected && <span className="rounded-full bg-goodgreen-50 px-2.5 py-1 text-[11px] font-bold text-goodgreen-700">Selecionado</span>}
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-950">{guide.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{guide.shortDescription}</p>
              <ul className="mt-3 space-y-1 text-xs leading-5 text-slate-500">
                {guide.keyFeatures.map((feature) => <li key={feature}>• {feature}</li>)}
              </ul>
              <div className="mt-auto grid grid-cols-2 gap-2 pt-5">
                <button type="button" onClick={() => onSelect(guide)} className="btn-secondary min-h-10 px-3 text-xs">
                  <BookOpen className="h-4 w-4" aria-hidden="true" /> Ver instruções
                </button>
                <button type="button" onClick={() => onOpenModule(guide.destination)} className="btn-muted min-h-10 px-3 text-xs">
                  Abrir módulo <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
