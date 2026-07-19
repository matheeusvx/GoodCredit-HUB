import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Clipboard,
  Info,
  Link2,
  ListChecks,
  MousePointerClick,
  TriangleAlert
} from "lucide-react";
import { type ReactNode, useState } from "react";
import type { UsageGuide, UsageGuideDestination } from "../../types/usageGuide";
import { usageGuideIcons } from "./usageGuideIcons";

type Feedback = "instructions" | "link" | null;

interface Props {
  guide: UsageGuide;
  feedback: Feedback;
  onCopyInstructions: () => void;
  onCopyLink: () => void;
  onOpenModule: (destination: UsageGuideDestination) => void;
}

function GuideSection({ id, title, icon, children }: { id: string; title: string; icon: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(true);
  const panelId = `${id}-panel`;
  return (
    <section className="border-b border-slate-200 last:border-b-0">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((current) => !current)}
          className="flex min-h-14 w-full items-center justify-between gap-4 px-5 py-4 text-left text-base font-bold text-slate-950 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-goodgreen-400 sm:px-6"
        >
          <span className="flex items-center gap-3">{icon}{title}</span>
          <ChevronDown className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
        </button>
      </h3>
      {open && <div id={panelId} className="px-5 pb-5 sm:px-6 sm:pb-6">{children}</div>}
    </section>
  );
}

function BulletList({ items, tone = "slate" }: { items: string[]; tone?: "slate" | "amber" | "red" }) {
  const classes = {
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    amber: "border-amber-200 bg-amber-50 text-amber-950",
    red: "border-rose-200 bg-rose-50 text-rose-900"
  }[tone];
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {items.map((item) => (
        <li key={item} className={`flex items-start gap-2.5 rounded-lg border p-3 text-sm leading-6 ${classes}`}>
          {tone === "slate" ? <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-goodgreen-600" aria-hidden="true" /> : <TriangleAlert className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />}
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function UsageGuideContent({ guide, feedback, onCopyInstructions, onCopyLink, onOpenModule }: Props) {
  const Icon = usageGuideIcons[guide.icon];
  return (
    <article id={guide.anchor} className="scroll-mt-5 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm" aria-labelledby={`${guide.anchor}-title`}>
      <header className="border-b border-slate-200 px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-goodgreen-50 text-goodgreen-700">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-goodgreen-600">Orientação do módulo</p>
              <h2 id={`${guide.anchor}-title`} className="mt-1 text-xl font-bold text-slate-950 sm:text-2xl">{guide.title}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{guide.shortDescription}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onCopyInstructions} className="btn-secondary min-h-10 px-3 text-xs">
              {feedback === "instructions" ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <Clipboard className="h-4 w-4" aria-hidden="true" />}
              {feedback === "instructions" ? "Instruções copiadas" : "Copiar instruções"}
            </button>
            <button type="button" onClick={onCopyLink} className="btn-muted min-h-10 px-3 text-xs">
              {feedback === "link" ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <Link2 className="h-4 w-4" aria-hidden="true" />}
              {feedback === "link" ? "Link copiado" : "Copiar link desta orientação"}
            </button>
          </div>
        </div>
      </header>

      <GuideSection id={`${guide.anchor}-purpose`} title="Para que serve" icon={<Info className="h-5 w-5 text-goodblue-600" aria-hidden="true" />}>
        <p className="text-sm leading-7 text-slate-700">{guide.purpose}</p>
      </GuideSection>

      <GuideSection id={`${guide.anchor}-when`} title="Quando utilizar" icon={<MousePointerClick className="h-5 w-5 text-goodblue-600" aria-hidden="true" />}>
        <BulletList items={guide.whenToUse} />
      </GuideSection>

      <GuideSection id={`${guide.anchor}-fields`} title="Informações necessárias" icon={<ListChecks className="h-5 w-5 text-goodblue-600" aria-hidden="true" />}>
        <div className="grid gap-3 md:grid-cols-2">
          {guide.requiredInformation.map((field) => (
            <div key={field.name} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-sm font-bold text-slate-900">{field.name}</h4>
                {field.required && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">Obrigatório</span>}
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">{field.description}</p>
              {field.example && <p className="mt-2 text-xs text-slate-500"><strong>Exemplo:</strong> {field.example}</p>}
            </div>
          ))}
        </div>
      </GuideSection>

      <GuideSection id={`${guide.anchor}-steps`} title="Passo a passo" icon={<ListChecks className="h-5 w-5 text-goodgreen-600" aria-hidden="true" />}>
        <ol className="space-y-3">
          {guide.steps.map((step, index) => (
            <li key={step.id} className="grid grid-cols-[36px_minmax(0,1fr)] gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-goodgreen-600 text-sm font-bold text-white">{index + 1}</span>
              <div className="pt-0.5">
                <h4 className="text-sm font-bold text-slate-900">{step.title}</h4>
                <p className="mt-1 text-sm leading-6 text-slate-600">{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </GuideSection>

      <GuideSection id={`${guide.anchor}-results`} title="Como interpretar os resultados" icon={<CheckCircle2 className="h-5 w-5 text-goodgreen-600" aria-hidden="true" />}>
        <dl className="grid gap-3 md:grid-cols-2">
          {guide.results.map((result) => (
            <div key={result.title} className="rounded-lg border border-goodblue-100 bg-goodblue-50 p-4">
              <dt className="text-sm font-bold text-goodblue-900">{result.title}</dt>
              <dd className="mt-2 text-sm leading-6 text-goodblue-800">{result.description}</dd>
            </div>
          ))}
        </dl>
      </GuideSection>

      <GuideSection id={`${guide.anchor}-actions`} title="Principais ações" icon={<MousePointerClick className="h-5 w-5 text-goodgreen-600" aria-hidden="true" />}>
        <dl className="grid gap-3 md:grid-cols-2">
          {guide.actions.map((action) => (
            <div key={action.title} className="border-l-2 border-goodgreen-400 pl-4">
              <dt className="text-sm font-bold text-slate-900">{action.title}</dt>
              <dd className="mt-1 text-sm leading-6 text-slate-600">{action.description}</dd>
            </div>
          ))}
        </dl>
      </GuideSection>

      <GuideSection id={`${guide.anchor}-cautions`} title="Alertas e cuidados" icon={<AlertTriangle className="h-5 w-5 text-amber-600" aria-hidden="true" />}>
        <BulletList items={guide.cautions} tone="amber" />
      </GuideSection>

      <GuideSection id={`${guide.anchor}-mistakes`} title="Erros comuns" icon={<TriangleAlert className="h-5 w-5 text-rose-600" aria-hidden="true" />}>
        <BulletList items={guide.commonMistakes} tone="red" />
      </GuideSection>

      <footer className="flex flex-col gap-3 bg-slate-50 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="text-sm text-slate-600">Pronto para aplicar esta orientação?</p>
        <button type="button" onClick={() => onOpenModule(guide.destination)} className="btn-primary min-h-11 sm:w-auto">
          Abrir {guide.title} <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </footer>
    </article>
  );
}
