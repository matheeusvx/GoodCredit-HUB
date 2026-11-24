import type { ReactNode } from "react";

/** The top of every tab: its name, one short line about it, and the tab's actions. Nothing else. */
export function PageHeader({
  title,
  description,
  actions,
  maxWidth = "max-w-[1700px]"
}: {
  title: string;
  description: string;
  actions?: ReactNode;
  maxWidth?: string;
}) {
  return (
    <header className="border-b border-slate-200/80 bg-white">
      <div className={`mx-auto flex ${maxWidth} flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between xl:px-8`}>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-ink sm:text-[28px]">{title}</h1>
          <p className="mt-1 text-sm text-ink-muted">{description}</p>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
