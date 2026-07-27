export function navigateComplianceChecklist(path: string, replace = false) {
  if (replace) window.history.replaceState({}, "", path);
  else window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function complianceChecklistEditorPath(id: string): string {
  return `/checklist-conformidade/${encodeURIComponent(id)}`;
}
