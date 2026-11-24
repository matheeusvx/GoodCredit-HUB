export interface ComplianceChecklistHistoryState {
  /** Set when the editor just created this checklist and keeps its content. */
  adoptedChecklistId?: string;
}

export function navigateComplianceChecklist(
  path: string,
  replace = false,
  state: ComplianceChecklistHistoryState = {}
) {
  if (replace) window.history.replaceState(state, "", path);
  else window.history.pushState(state, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function complianceChecklistEditorPath(id: string): string {
  return `/checklist-conformidade/${encodeURIComponent(id)}`;
}
