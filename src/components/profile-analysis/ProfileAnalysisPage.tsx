import { ArrowLeft } from "lucide-react";
import { useReducer } from "react";
import { profileAnalysisReducer } from "../../lib/profile-analysis/navigation";
import type { ProfileAnalysisView } from "../../types/profileAnalysis";
import { IncomeAnalysisPage } from "../income-analysis/IncomeAnalysisPage";
import { ProfileAnalysisHome } from "./ProfileAnalysisHome";
import { ProfileDocumentPlaceholder } from "./ProfileDocumentPlaceholder";
import { CtpsAnalysisPage } from "./ctps/CtpsAnalysisPage";
import { getProfileDocumentOption } from "./profileDocumentOptions";

export function ProfileAnalysisPage({
  onSendToSimulation,
}: {
  onSendToSimulation: () => void;
}) {
  const [view, dispatch] = useReducer(profileAnalysisReducer, "HOME");
  const backHome = () => dispatch({ type: "BACK_HOME" });

  return (
    <ProfileAnalysisContent
      view={view}
      onOpen={(next) => dispatch({ type: "OPEN", view: next })}
      onBack={backHome}
      onSendToSimulation={onSendToSimulation}
    />
  );
}

export function ProfileAnalysisContent({
  view,
  onOpen,
  onBack,
  onSendToSimulation,
}: {
  view: ProfileAnalysisView;
  onOpen: (view: Exclude<ProfileAnalysisView, "HOME">) => void;
  onBack: () => void;
  onSendToSimulation: () => void;
}) {
  if (view === "HOME") {
    return <ProfileAnalysisHome onOpen={onOpen} />;
  }

  if (view === "BANK_STATEMENTS") {
    return (
      <div className="min-h-screen bg-slate-100">
        <div className="mx-auto max-w-[1500px] px-4 pt-5 sm:px-6 xl:px-8">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-slate-600 transition hover:bg-white hover:text-goodgreen-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goodgreen-500"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Voltar para Análise de Perfil
          </button>
        </div>
        <IncomeAnalysisPage onSendToSimulation={onSendToSimulation} />
      </div>
    );
  }

  if (view === "CTPS") {
    return <CtpsAnalysisPage onBack={onBack} />;
  }

  return <ProfileDocumentPlaceholder option={getProfileDocumentOption(view)} onBack={onBack} />;
}
