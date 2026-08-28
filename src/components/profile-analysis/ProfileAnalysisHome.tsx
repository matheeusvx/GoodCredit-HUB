import { BriefcaseBusiness, FileText, Landmark, WalletCards, type LucideIcon } from "lucide-react";
import type { ProfileAnalysisView, ProfileDocumentType } from "../../types/profileAnalysis";
import { ProfileDocumentCard } from "./ProfileDocumentCard";
import { PROFILE_DOCUMENT_OPTIONS } from "./profileDocumentOptions";

const DOCUMENT_ICONS: Record<ProfileDocumentType, LucideIcon> = {
  BANK_STATEMENT: Landmark,
  CTPS: BriefcaseBusiness,
  INCOME_TAX: FileText,
  FGTS: WalletCards,
};

export function ProfileAnalysisHome({
  onOpen,
}: {
  onOpen: (view: Exclude<ProfileAnalysisView, "HOME">) => void;
}) {
  return (
    <main className="mx-auto flex max-w-[1700px] flex-col gap-7 px-4 py-6 sm:px-6 sm:py-8 xl:px-8">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-goodgreen-600">GoodCredit Hub</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Análise de Perfil</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Analise documentos financeiros e profissionais para consolidar o perfil do cliente.
        </p>
      </header>

      <section aria-labelledby="profile-document-types-title">
        <div className="mb-4">
          <h2 id="profile-document-types-title" className="text-lg font-bold text-slate-950">Tipos de análise</h2>
          <p className="mt-1 text-sm text-slate-500">Escolha o documento que deseja analisar.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {PROFILE_DOCUMENT_OPTIONS.map((option) => (
            <ProfileDocumentCard
              key={option.type}
              option={option}
              icon={DOCUMENT_ICONS[option.type]}
              onSelect={() => onOpen(option.view)}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
