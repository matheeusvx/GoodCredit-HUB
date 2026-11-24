import type { ProfileAnalysisView } from "../../types/profileAnalysis";
import { PageHeader } from "../ui/PageHeader";
import { ProfileDocumentCard } from "./ProfileDocumentCard";
import { PROFILE_DOCUMENT_OPTIONS } from "./profileDocumentOptions";

export function ProfileAnalysisHome({ onOpen }: { onOpen: (view: Exclude<ProfileAnalysisView, "HOME">) => void }) {
  return (
    <div className="min-h-screen">
      <PageHeader title="Análise de Perfil" description="Analise documentos financeiros e profissionais para consolidar o perfil do cliente." />
      <main className="mx-auto max-w-[1700px] px-4 py-6 sm:px-6 sm:py-8 xl:px-8">
        <section aria-labelledby="profile-document-types-title">
          <h2 id="profile-document-types-title" className="text-base font-bold text-ink">Escolha o documento</h2>
          <div className="stagger mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {PROFILE_DOCUMENT_OPTIONS.map((option) => (
              <ProfileDocumentCard key={option.type} option={option} onSelect={() => onOpen(option.view)} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
