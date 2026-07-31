import { useEffect, useRef, useState } from "react";
import { formatCentsBRL, parseBRLToCents } from "../../lib/registration/financial/money";

export function FinancialMoneyInput({ valueCents, onChange, disabled, id, ariaLabel }: {
  valueCents: number; onChange: (value: number) => void; disabled?: boolean; id?: string; ariaLabel?: string;
}) {
  const focused = useRef(false);
  const [text, setText] = useState(valueCents > 0 ? formatCentsBRL(valueCents) : "");
  useEffect(() => { if (!focused.current) setText(valueCents > 0 ? formatCentsBRL(valueCents) : ""); }, [valueCents]);
  return (
    <input
      id={id}
      aria-label={ariaLabel}
      type="text"
      inputMode="decimal"
      disabled={disabled}
      value={text}
      onFocus={() => { focused.current = true; }}
      onChange={(event) => { setText(event.target.value); onChange(parseBRLToCents(event.target.value)); }}
      onBlur={() => { focused.current = false; const parsed = parseBRLToCents(text); onChange(parsed); setText(parsed > 0 ? formatCentsBRL(parsed) : ""); }}
      className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-goodgreen-500 focus:ring-4 focus:ring-goodgreen-500/10 disabled:bg-slate-100 disabled:text-slate-500"
    />
  );
}
