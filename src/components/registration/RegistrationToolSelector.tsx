import { Calculator, FileText } from "lucide-react";
import { type KeyboardEvent, useRef } from "react";
import type { RegistrationTool } from "../../types/registration";

const tools = [
  { id: "ITBI" as const, label: "Simulação de ITBI", icon: Calculator, panelId: "registration-itbi-panel" },
  { id: "CARTORIAL_COSTS" as const, label: "Simulação de Custas", icon: FileText, panelId: "registration-costs-panel" }
];

export function RegistrationToolSelector({ value, onChange }: { value: RegistrationTool; onChange: (tool: RegistrationTool) => void }) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (index + direction + tools.length) % tools.length;
    const nextTool = tools[nextIndex];
    onChange(nextTool.id);
    refs.current[nextIndex]?.focus();
  }

  return (
    <div className="grid w-full max-w-[430px] grid-cols-1 gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1 sm:grid-cols-2" role="tablist" aria-label="Ferramentas de Registro">
      {tools.map((tool, index) => {
        const Icon = tool.icon;
        const selected = value === tool.id;
        return (
          <button
            key={tool.id}
            ref={(element) => { refs.current[index] = element; }}
            type="button"
            role="tab"
            id={`registration-tab-${tool.id.toLowerCase()}`}
            aria-selected={selected}
            aria-controls={tool.panelId}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tool.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goodgreen-400 focus-visible:ring-offset-1 ${
              selected
                ? "border-goodgreen-300 bg-white text-goodgreen-700 shadow-sm"
                : "border-transparent bg-transparent text-slate-600 hover:bg-white/70 hover:text-slate-900"
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {tool.label}
          </button>
        );
      })}
    </div>
  );
}
