import type { ProfileAnalysisView } from "../../types/profileAnalysis";

export type ProfileAnalysisAction =
  | { type: "OPEN"; view: Exclude<ProfileAnalysisView, "HOME"> }
  | { type: "BACK_HOME" };

export function profileAnalysisReducer(
  _state: ProfileAnalysisView,
  action: ProfileAnalysisAction,
): ProfileAnalysisView {
  return action.type === "BACK_HOME" ? "HOME" : action.view;
}
