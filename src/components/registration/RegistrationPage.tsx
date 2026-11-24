import { useEffect, useState } from "react";
import { PageHeader } from "../ui/PageHeader";
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
    <div className="min-h-screen">
      <PageHeader title="Registro" description="Simule o ITBI e acompanhe os custos cartoriais." maxWidth="max-w-[1500px]" />

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
