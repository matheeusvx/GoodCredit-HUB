import { ArrowLeft } from "lucide-react";
import { useReducer } from "react";
import { profileAnalysisReducer } from "../../lib/profile-analysis/navigation";
import type { ProfileAnalysisView } from "../../types/profileAnalysis";
import { BackLink } from "../ui/BackLink";
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
  return (
    <div key={view} className="view-enter">
      {view === "HOME" ? (
        <ProfileAnalysisHome onOpen={onOpen} />
      ) : view === "BANK_STATEMENTS" ? (
        <>
          <BackLink label="Voltar para Análise de Perfil" onClick={onBack} maxWidth="max-w-[1600px]" />
          <IncomeAnalysisPage onSendToSimulation={onSendToSimulation} />
        </>
      ) : view === "CTPS" ? (
        <CtpsAnalysisPage onBack={onBack} />
      ) : (
        <ProfileDocumentPlaceholder option={getProfileDocumentOption(view)} onBack={onBack} />
      )}
    </div>
  );
}
