import { useEffect, useRef, useState } from "react";
import { formatCurrencyBRL, normalizeCurrencyInput, parseCurrencyBRL } from "../../lib/fgts/currency";

interface Props {
  value: number;
  onValueChange: (value: number) => void;
  className?: string;
  placeholder?: string;
  ariaLabel?: string;
}

export function FgtsCurrencyInput({ value, onValueChange, className = "", placeholder, ariaLabel }: Props) {
  const focused = useRef(false);
  const [input, setInput] = useState(() => value > 0 ? formatCurrencyBRL(value) : "");

  useEffect(() => {
    if (!focused.current) setInput(value > 0 ? formatCurrencyBRL(value) : "");
  }, [value]);

  return <input
    type="text"
    inputMode="decimal"
    aria-label={ariaLabel}
    className={className}
    value={input}
    placeholder={placeholder}
    onFocus={() => { focused.current = true; }}
    onChange={(event) => {
      const normalized = normalizeCurrencyInput(event.target.value);
      setInput(normalized);
      onValueChange(parseCurrencyBRL(normalized));
    }}
    onBlur={() => {
      focused.current = false;
      const parsed = parseCurrencyBRL(input);
      setInput(parsed > 0 ? formatCurrencyBRL(parsed) : "");
      onValueChange(parsed);
    }}
  />;
}
