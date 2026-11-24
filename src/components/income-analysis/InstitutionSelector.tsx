import { Building2, ChevronDown, FileCheck2, ScanLine, Search } from "lucide-react";
import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { CATEGORY_LABELS, getInstitution, getInstitutionPresentation, searchInstitutions, type InstitutionSelection, type StatementInstitution } from "../../lib/statement-analysis/institutionCatalog";

function InstitutionLogo({ institution }: { institution?: StatementInstitution }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [institution?.logo]);
  return <span style={{ backgroundColor: institution?.logo && !failed ? institution.logoBackground : "#ffffff" }} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-slate-100 text-slate-400" aria-hidden="true">
    {institution?.logo && !failed ? <img src={institution.logo} alt="" className="h-6 w-6 object-contain" onError={() => setFailed(true)} /> : !institution ? <ScanLine className="h-4 w-4" /> : institution.category === "BANK" ? <Building2 className="h-4 w-4" /> : <FileCheck2 className="h-4 w-4" />}
  </span>;
}

export function InstitutionSelector({ value, onChange, fileName, disabled = false }: { value: InstitutionSelection; onChange: (value: InstitutionSelection) => void; fileName: string; disabled?: boolean }) {
  const [open, setOpen] = useState(false); const [query, setQuery] = useState(""); const [active, setActive] = useState(0);
  const [position, setPosition] = useState({ left: 16, top: 16, width: 340, maxHeight: 480 });
  const [tooltip, setTooltip] = useState<{ choice: InstitutionSelection; anchor: HTMLElement; source: "pointer" | "keyboard" | "touch" } | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ left: 16, top: 16, width: 280 });
  const tooltipElement = useRef<HTMLDivElement>(null);
  const dismissTimer = useRef<number | null>(null);
  const trigger = useRef<HTMLButtonElement>(null); const panel = useRef<HTMLDivElement>(null); const input = useRef<HTMLInputElement>(null);
  const id = useId(); const listId = `${id}-institutions`; const selected = getInstitution(value);
  const tooltipId = `${id}-tooltip`; const selectedPresentation = getInstitutionPresentation(selected);
  const institutions = searchInstitutions(query);
  const showAuto = !query || "detecção automática".normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(query.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase());
  const choices: InstitutionSelection[] = [...(showAuto ? ["AUTO" as const] : []), ...institutions.filter((entry) => entry.category === "BANK").map((entry) => entry.id), ...institutions.filter((entry) => entry.category === "PLATFORM").map((entry) => entry.id)];
  function showTooltip(choice: InstitutionSelection, anchor: HTMLElement | null, source: "pointer" | "keyboard" | "touch") {
    if (dismissTimer.current !== null) window.clearTimeout(dismissTimer.current);
    if (!anchor || !getInstitutionPresentation(getInstitution(choice)).tooltip) { setTooltip(null); return; }
    setTooltip({ choice, anchor, source });
  }
  function dismissHover() { if (tooltip?.source === "pointer") dismissTimer.current = window.setTimeout(() => setTooltip(null), 150); }
  useEffect(() => () => { if (dismissTimer.current !== null) window.clearTimeout(dismissTimer.current); }, []);
  function close(restore = true) { setOpen(false); setTooltip(null); if (restore) trigger.current?.focus(); }
  function select(choice: InstitutionSelection) { onChange(choice); close(); }
  function navigate(event: KeyboardEvent) {
    if (event.key === "Escape") { event.preventDefault(); close(); }
    else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      const next = event.key === "Home" ? 0 : event.key === "End" ? Math.max(0, choices.length - 1) : Math.max(0, Math.min(choices.length - 1, active + (event.key === "ArrowDown" ? 1 : -1)));
      setActive(next); if (choices[next]) showTooltip(choices[next], document.getElementById(`${id}-${choices[next]}`), "keyboard");
    } else if (event.key === "Enter") { event.preventDefault(); if (choices[active]) select(choices[active]); }
    else if (event.key === "Tab") {
      event.preventDefault();
      const elements = [...document.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href], [tabindex="0"]')].filter((element) => !panel.current?.contains(element) && element.getClientRects().length);
      const index = elements.indexOf(trigger.current!);
      close(false); (elements[index + (event.shiftKey ? -1 : 1)] || trigger.current)?.focus();
    }
  }
  useLayoutEffect(() => {
    if (!tooltip) return;
    if (tooltip.source === "keyboard" && open) tooltip.anchor.scrollIntoView({ block: "nearest" });
    const reposition = () => {
      if (!tooltip.anchor.isConnected) { setTooltip(null); return; }
      const rect = tooltip.anchor.getBoundingClientRect();
      const list = document.getElementById(listId)?.getBoundingClientRect();
      if (open && list && (rect.bottom <= list.top || rect.top >= list.bottom)) { setTooltip(null); return; }
      const width = Math.min(280, window.innerWidth - 32); const height = tooltipElement.current?.offsetHeight || 72;
      const below = rect.bottom + 6;
      setTooltipPosition({ width, left: Math.max(16, Math.min(rect.left, window.innerWidth - width - 16)), top: below + height <= window.innerHeight - 16 ? below : Math.max(16, rect.top - height - 6) });
    };
    reposition(); window.addEventListener("scroll", reposition, true); window.addEventListener("resize", reposition);
    return () => { window.removeEventListener("scroll", reposition, true); window.removeEventListener("resize", reposition); };
  }, [tooltip, open, listId]);
  useLayoutEffect(() => {
    if (!open) return;
    const reposition = () => {
      const rect = trigger.current?.getBoundingClientRect(); if (!rect) return;
      const width = Math.min(360, window.innerWidth - 32); const height = Math.min(480, window.innerHeight - 32);
      const below = window.innerHeight - rect.bottom - 24;
      const top = below >= Math.min(300, height) ? rect.bottom + 8 : Math.max(16, rect.top - height - 8);
      setPosition({ left: Math.max(16, Math.min(rect.right - width, window.innerWidth - width - 16)), top, width, maxHeight: Math.min(height, window.innerHeight - top - 16) });
    };
    reposition(); input.current?.focus();
    window.addEventListener("resize", reposition); window.addEventListener("scroll", reposition, true);
    return () => { window.removeEventListener("resize", reposition); window.removeEventListener("scroll", reposition, true); };
  }, [open]);
  useEffect(() => {
    if (!open && !tooltip) return;
    const outside = (event: Event) => { if (!panel.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node) && !tooltipElement.current?.contains(event.target as Node)) { setOpen(false); setTooltip(null); } };
    const escape = (event: { key: string }) => { if (event.key === "Escape") setTooltip(null); };
    document.addEventListener("keydown", escape); document.addEventListener("pointerdown", outside); document.addEventListener("focusin", outside);
    return () => { document.removeEventListener("keydown", escape); document.removeEventListener("pointerdown", outside); document.removeEventListener("focusin", outside); };
  }, [open, tooltip]);
  useEffect(() => { if (open && choices[active]) document.getElementById(`${id}-${choices[active]}`)?.scrollIntoView({ block: "nearest" }); }, [open, active, id, choices.join("|")]);
  const option = (choice: InstitutionSelection) => {
    const institution = getInstitution(choice); const index = choices.indexOf(choice);
    const presentation = getInstitutionPresentation(institution);
    return <button key={choice} id={`${id}-${choice}`} role="option" aria-label={institution?.label || "Detecção automática"} aria-describedby={tooltip?.choice === choice ? tooltipId : `${id}-${choice}-status`} aria-selected={value === choice} tabIndex={-1} type="button" onMouseEnter={(event) => { if (tooltip?.source !== "touch") showTooltip(choice, event.currentTarget, "pointer"); }} onMouseLeave={dismissHover} onFocus={(event) => showTooltip(choice, event.currentTarget, "keyboard")} onMouseMove={() => setActive(index)} onClick={() => select(choice)} className={`flex w-full min-h-12 items-center gap-3 px-3 py-2 text-left ${active === index ? "bg-blue-50 outline outline-1 -outline-offset-1 outline-goodblue-200" : value === choice ? "bg-emerald-50" : "hover:bg-slate-50"}`}>
      <InstitutionLogo institution={institution} /><span className="min-w-0 flex-1 text-sm font-semibold text-slate-800">{institution?.label || "Detecção automática"}{presentation.asterisk && <span data-institution-asterisk aria-hidden="true" className="relative ml-0.5 inline-block cursor-help font-bold text-amber-700 after:absolute after:-inset-2.5 after:content-['']" onClick={(event) => { event.stopPropagation(); tooltip?.choice === choice && tooltip.source === "touch" ? setTooltip(null) : showTooltip(choice, event.currentTarget.closest("button"), "touch"); }}>*</span>}</span><span id={`${id}-${choice}-status`} className="sr-only">{presentation.accessibleStatus}</span>
    </button>;
  };
  return <div className="min-w-0 w-full sm:w-64">
    <button ref={trigger} type="button" disabled={disabled} aria-label={`Instituição de ${fileName}: ${selected?.label || "Detecção automática"}`} aria-describedby={tooltip?.choice === value ? tooltipId : `${id}-selection-status`} aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? listId : undefined} onMouseEnter={(event) => { if (!open) showTooltip(value, event.currentTarget, "pointer"); }} onMouseLeave={dismissHover} onFocus={(event) => { if (!open) showTooltip(value, event.currentTarget, "keyboard"); }} onClick={() => { setTooltip(null); setQuery(""); setActive(0); setOpen((current) => !current); }} onKeyDown={(event) => { if (event.key === "Escape") setTooltip(null); if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); setTooltip(null); setQuery(""); setActive(0); setOpen(true); } }} className="flex min-h-11 w-full items-center gap-2 rounded-lg border border-goodgreen-200 bg-emerald-50/60 px-3 py-1.5 text-left text-sm font-semibold text-goodgreen-800 transition hover:bg-emerald-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-goodblue-500 disabled:opacity-50">
      <InstitutionLogo institution={selected} /><span className="min-w-0 flex-1 truncate">{selected?.label || "Detecção automática"}{selectedPresentation.asterisk && <span data-institution-asterisk aria-hidden="true" className="relative ml-0.5 inline-block cursor-help font-bold text-amber-700 after:absolute after:-inset-2.5 after:content-['']">*</span>}</span><ChevronDown className={`h-4 w-4 shrink-0 transition ${open ? "rotate-180" : ""}`} />
    </button>
    <span id={`${id}-selection-status`} className="sr-only">{selectedPresentation.accessibleStatus}</span>
    {open && createPortal(<div ref={panel} style={{ position: "fixed", ...position }} className="z-[70] flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
      <div className="shrink-0 border-b border-slate-100 p-3"><label className="flex items-center gap-2 rounded-lg border border-goodgreen-300 px-3 focus-within:ring-2 focus-within:ring-goodgreen-200"><Search className="h-4 w-4 shrink-0 text-slate-400" /><input ref={input} role="combobox" aria-label={`Pesquisar instituição para ${fileName}`} aria-expanded="true" aria-controls={listId} aria-autocomplete="list" aria-activedescendant={choices[active] ? `${id}-${choices[active]}` : undefined} aria-describedby={choices[active] ? tooltip?.choice === choices[active] ? tooltipId : `${id}-${choices[active]}-status` : undefined} value={query} onChange={(event) => { setTooltip(null); setQuery(event.target.value); setActive(0); }} onKeyDown={navigate} placeholder="Buscar banco ou plataforma" className="h-11 min-w-0 w-full bg-transparent text-sm outline-none" /></label></div>
      <div id={listId} role="listbox" aria-label="Instituições disponíveis" className="min-h-0 overflow-y-auto overscroll-contain" style={{ maxHeight: position.maxHeight - 78 }}>
        {showAuto && option("AUTO")}{(["BANK", "PLATFORM"] as const).map((category) => institutions.some((entry) => entry.category === category) && <div key={category} role="group" aria-label={CATEGORY_LABELS[category]}><p className="sticky top-0 bg-slate-50 px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">{CATEGORY_LABELS[category]}</p>{institutions.filter((entry) => entry.category === category).map((entry) => option(entry.id))}</div>)}
        {!choices.length && <p role="status" className="p-5 text-sm text-slate-500">Nenhuma instituição encontrada.</p>}
      </div>
    </div>, document.body)}
    {tooltip && createPortal(<div ref={tooltipElement} id={tooltipId} role="tooltip" onMouseEnter={() => { if (dismissTimer.current !== null) window.clearTimeout(dismissTimer.current); }} onMouseLeave={dismissHover} style={{ position: "fixed", ...tooltipPosition }} className="z-[80] rounded-lg bg-slate-800 px-3 py-2 text-xs leading-5 text-white shadow-lg">{getInstitutionPresentation(getInstitution(tooltip.choice)).tooltip}</div>, document.body)}
  </div>;
}
