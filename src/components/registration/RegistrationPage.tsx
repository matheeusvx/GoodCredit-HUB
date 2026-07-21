import { Landmark } from "lucide-react";
import { useEffect, useState } from "react";
import type { RegistrationTool } from "../../types/registration";
import { ItbiSimulation } from "./ItbiSimulation";
import { RegistrationDevelopmentState } from "./RegistrationDevelopmentState";
import { RegistrationToolSelector } from "./RegistrationToolSelector";

function toolFromUrl(): RegistrationTool {
  return new URLSearchParams(window.location.search).get("ferramenta") === "custas" ? "CARTORIAL_COSTS" : "ITBI";
}

export function RegistrationPage() {
  const [tool, setTool] = useState<RegistrationTool>(toolFromUrl);

  useEffect(() => {
    const current = new URL(window.location.href);
    const expected = tool === "ITBI" ? "itbi" : "custas";
    if (current.searchParams.get("ferramenta") !== expected) {
      current.searchParams.set("ferramenta", expected);
      window.history.replaceState(window.history.state, "", `${current.pathname}${current.search}${current.hash}`);
    }
  }, [tool]);

  useEffect(() => {
    function handlePopState() {
      setTool(toolFromUrl());
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  function changeTool(nextTool: RegistrationTool) {
    setTool(nextTool);
    const url = new URL(window.location.href);
    url.searchParams.set("ferramenta", nextTool === "ITBI" ? "itbi" : "custas");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 xl:px-8">
          <div className="flex items-start gap-4">
            <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-goodgreen-50 text-goodgreen-700 sm:flex">
              <Landmark className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-goodgreen-600">GoodCredit Hub</p>
              <h1 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">Registro</h1>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">Simule o ITBI e consulte as ferramentas relacionadas às despesas de registro da operação.</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-[1500px] flex-col gap-6 px-4 py-6 sm:px-6 xl:px-8">
        <div className="flex w-full justify-center">
          <RegistrationToolSelector value={tool} onChange={changeTool} />
        </div>
        {tool === "ITBI" ? (
          <ItbiSimulation />
        ) : (
          <div id="registration-costs-panel" role="tabpanel" aria-labelledby="registration-tab-cartorial_costs">
            <RegistrationDevelopmentState kind="COSTS" />
          </div>
        )}
      </main>
    </div>
  );
}
