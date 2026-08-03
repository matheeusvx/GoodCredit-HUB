import { useState } from "react";

const tone: Record<string, string> = {
  SANTANDER:"border-amber-200 bg-amber-50 text-amber-900",CAIXA:"border-rose-200 bg-rose-50 text-rose-800",INTER:"border-sky-200 bg-sky-50 text-sky-800",ITAU:"border-orange-300 bg-orange-50 text-orange-900",BRADESCO:"border-violet-200 bg-violet-50 text-violet-800",BANCO_DO_BRASIL:"border-slate-300 bg-slate-100 text-slate-800",NAO:"border-slate-200 bg-slate-50 text-slate-700",
  TO_CHARGE:"border-rose-200 bg-rose-50 text-rose-800",FULL_PAYMENT:"border-goodgreen-200 bg-goodgreen-50 text-goodgreen-800",FOLLOWED_ACCOUNT:"border-sky-200 bg-sky-50 text-sky-800",ADVISORY_ONLY:"border-violet-200 bg-violet-50 text-violet-800",NO_PAYMENT:"border-slate-300 bg-slate-100 text-slate-800",
  ALREADY_PAID:"border-sky-200 bg-sky-50 text-sky-800",NOTHING_PAID:"border-slate-400 bg-slate-100 text-slate-900",DO_NOT_CHARGE:"border-blue-200 bg-blue-50 text-blue-800",CHARGE_SENT:"border-violet-200 bg-violet-50 text-violet-800",
  PAID_BY_GOODCREDIT:"border-goodgreen-200 bg-goodgreen-50 text-goodgreen-800",PAID_BY_CLIENT:"border-sky-200 bg-sky-50 text-sky-800",PENDING:"border-amber-200 bg-amber-50 text-amber-900",EXEMPT:"border-slate-200 bg-slate-50 text-slate-700",NOT_APPLICABLE:"border-slate-200 bg-slate-50 text-slate-600",IN_PROGRESS:"border-sky-200 bg-sky-50 text-sky-800",PAID:"border-goodgreen-200 bg-goodgreen-50 text-goodgreen-800"
};

export function OperationalStatusSelect<T extends string>({ value, options, ariaLabel, onSave }: { value: T | null; options: Record<T, string>; ariaLabel: string; onSave: (value: T) => Promise<void> }) {
  const [state, setState] = useState<"IDLE" | "SAVING" | "SAVED" | "ERROR">("IDLE");
  async function change(next: T) {
    setState("SAVING");
    try { await onSave(next); setState("SAVED"); window.setTimeout(() => setState("IDLE"), 1400); }
    catch { setState("ERROR"); window.setTimeout(() => setState("IDLE"), 2200); }
  }
  return <div className="min-w-[132px]"><select aria-label={ariaLabel} value={value ?? ""} onChange={(event) => void change(event.target.value as T)} className={`h-9 w-full rounded-lg border px-2 text-xs font-bold outline-none focus:ring-2 focus:ring-goodgreen-400 ${tone[value ?? ""] ?? "border-slate-200 bg-white text-slate-700"}`}><option value="" disabled>Selecionar</option>{Object.entries(options).map(([key,label]) => <option key={key} value={key}>{String(label)}</option>)}</select><span className={`mt-1 block text-[10px] font-semibold ${state === "ERROR" ? "text-rose-700" : "text-slate-400"}`} aria-live="polite">{state === "SAVING" ? "Salvando..." : state === "SAVED" ? "Salvo" : state === "ERROR" ? "Não salvo" : "\u00a0"}</span></div>;
}
