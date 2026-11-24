import { useEffect, useState } from "react";

/**
 * Rolls a formatted value (currency, percent, count) into place.
 * Each character is keyed by its position counted from the right, where the digits of
 * money values line up. When a value changes, React remounts only the characters that
 * changed, and only those roll in: R$ 300.000 → R$ 320.000 moves one digit instead of
 * redrawing the number. On first paint the whole value rolls in once.
 */
export function Roll({ value, className = "" }: { value: string; className?: string }) {
  const chars = Array.from(value);
  return (
    <span className={`roll ${className}`} aria-label={value} title={value}>
      {chars.map((char, index) => (
        <span
          key={`${chars.length - index}-${char}`}
          aria-hidden="true"
          data-changed=""
          style={{ animationDelay: `${Math.min(index, 12) * 16}ms` }}
        >
          {char}
        </span>
      ))}
    </span>
  );
}

/** True one frame after mount, so CSS transitions (bars, meters) animate from zero. */
export function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  return mounted;
}
