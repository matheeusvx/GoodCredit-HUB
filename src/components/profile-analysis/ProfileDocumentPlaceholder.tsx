import type { ProfileDocumentOption } from "../../types/profileAnalysis";
import { BackLink } from "../ui/BackLink";
import { PageHeader } from "../ui/PageHeader";

export function ProfileDocumentPlaceholder({ option, onBack }: { option: ProfileDocumentOption; onBack: () => void }) {
  return (
    <div className="min-h-screen">
      <BackLink label="Voltar para Análise de Perfil" onClick={onBack} maxWidth="max-w-[1400px]" />
      <PageHeader
        title={option.title}
        description={`${option.description}.`}
        maxWidth="max-w-[1400px]"
        actions={<span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-ink-muted">Em desenvolvimento</span>}
      />
      <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8 xl:px-8">
        <section aria-disabled="true" className="surface flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
          <h2 className="text-base font-bold text-ink">Em breve por aqui</h2>
          <p className="mt-1.5 max-w-md text-sm leading-6 text-ink-muted">O envio e o processamento deste documento serão disponibilizados em uma próxima etapa.</p>
        </section>
      </main>
    </div>
  );
}
