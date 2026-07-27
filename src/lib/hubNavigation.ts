import type { HubView } from "../components/Sidebar";

export const HUB_VIEW_PATHS: Record<HubView, string> = {
  home: "/",
  amortization: "/amortizacao",
  simulation: "/simulacao-financiamento",
  "pro-soluto": "/pro-soluto",
  registration: "/registro",
  checklist: "/checklist-documental",
  "compliance-checklist": "/checklist-conformidade",
  fgts: "/uso-fgts",
  "income-analysis": "/apuracao-renda",
  "usage-guide": "/guia-de-uso",
  faq: "/faq"
};

export type ResolvedHubView = HubView | "not-found";

export function resolveHubView(pathname: string): ResolvedHubView {
  if (
    /^\/checklist-conformidade(?:\/novo|\/[^/]+)?$/.test(pathname)
  ) {
    return "compliance-checklist";
  }

  const match = (
    Object.entries(HUB_VIEW_PATHS) as Array<[HubView, string]>
  ).find(([, path]) => path === pathname);
  return match?.[0] ?? "not-found";
}
