import { Landmark } from "lucide-react";
import { useEffect, useState } from "react";
import { RegistrationFinancialEditorPage } from "../../pages/RegistrationFinancialEditorPage";
import { RegistrationFinancialListPage } from "../../pages/RegistrationFinancialListPage";
import type { RegistrationTool } from "../../types/registration";
import { ItbiSimulation } from "./ItbiSimulation";
import { RegistrationToolSelector } from "./RegistrationToolSelector";

function toolFromUrl(): RegistrationTool {
  return new URLSearchParams(window.location.search).get("ferramenta") === "balancete" ? "CARTORIAL_BALANCE" : "ITBI";
}

export function getRegistrationRouteState(pathname: string) {
  if (pathname === "/registro/balancete/novo") return { type: "NEW_BALANCE" as const, id: null };
  const match = pathname.match(/^\/registro\/balancete\/([^/]+)$/);
  if (match) return { type: "EDIT_BALANCE" as const, id: decodeURIComponent(match[1]) };
  return { type: "TOOLS" as const, id: null };
}

export function RegistrationPage() {
  const [tool, setTool] = useState<RegistrationTool>(toolFromUrl);
  const [pathname, setPathname] = useState(window.location.pathname);

  useEffect(() => {
    if (pathname !== "/registro") return;
    const current = new URL(window.location.href);
    const expected = tool === "ITBI" ? "itbi" : "balancete";
    if (current.searchParams.get("ferramenta") !== expected) {
      current.searchParams.set("ferramenta", expected);
      window.history.replaceState(window.history.state, "", `${current.pathname}${current.search}${current.hash}`);
    }
  }, [pathname, tool]);

  useEffect(() => {
    function handlePopState() {
      setTool(toolFromUrl());
      setPathname(window.location.pathname);
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  function changeTool(nextTool: RegistrationTool) {
    setTool(nextTool);
    setPathname("/registro");
    const url = new URL(window.location.href);
    url.pathname = "/registro";
    url.searchParams.set("ferramenta", nextTool === "ITBI" ? "itbi" : "balancete");
    window.history.pushState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }

  const route = getRegistrationRouteState(pathname);
  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 xl:px-8">
          <div className="flex items-start gap-4">
            <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-goodgreen-50 text-goodgreen-700 sm:flex"><Landmark className="h-5 w-5" aria-hidden="true" /></span>
            <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-goodgreen-600">GoodCredit Hub</p><h1 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">Registro</h1><p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">Simule o ITBI e acompanhe os valores operacionais dos processos cartoriais.</p></div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-[1500px] flex-col gap-6 px-4 py-6 sm:px-6 xl:px-8">
        {route.type === "TOOLS" && <div className="flex w-full justify-center"><RegistrationToolSelector value={tool} onChange={changeTool} /></div>}
        {route.type === "NEW_BALANCE" ? <RegistrationFinancialEditorPage caseId={null} />
          : route.type === "EDIT_BALANCE" ? <RegistrationFinancialEditorPage caseId={route.id} />
          : tool === "ITBI" ? <ItbiSimulation />
          : <div id="registration-balance-panel" role="tabpanel" aria-labelledby="registration-tab-cartorial_balance"><RegistrationFinancialListPage /></div>}
      </main>
    </div>
  );
}
