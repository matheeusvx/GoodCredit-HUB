export function navigateRegistration(path: string, replace = false): void {
  if (replace) window.history.replaceState({}, "", path);
  else window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function registrationFinancialEditorPath(id: string): string {
  return `/registro/balancete/${encodeURIComponent(id)}`;
}
