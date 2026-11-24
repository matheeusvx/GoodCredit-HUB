import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

interface Option<T extends string> {
  value: T;
  label: string;
  badge?: ReactNode;
}

/**
 * Two to four options. Options size to their labels and never wrap; the selected thumb
 * is measured from the chosen button and slides to it.
 * `fill` stretches the options evenly across the container (for form fields).
 */
export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
  size = "md",
  fill = false
}: {
  label: string;
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  size?: "sm" | "md";
  fill?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState<{ left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const measure = () => {
      const selected = container.querySelector<HTMLElement>('[aria-checked="true"]');
      setThumb(selected ? { left: selected.offsetLeft, width: selected.offsetWidth } : null);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, [value, options.length]);

  const height = size === "sm" ? "h-9" : "h-11";
  return (
    <div
      ref={containerRef}
      role="radiogroup"
      aria-label={label}
      className={`relative ${fill ? "grid w-full" : "inline-flex"} ${height} items-stretch rounded-lg bg-slate-100 p-1`}
      style={fill ? { gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` } : undefined}
    >
      {thumb && (
        <span
          aria-hidden="true"
          className="absolute bottom-1 top-1 rounded-md bg-white shadow-sm ring-1 ring-slate-200/80 transition-[left,width] duration-300 ease-out"
          style={{ left: thumb.left, width: thumb.width }}
        />
      )}
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={`relative z-[1] inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3.5 text-sm font-semibold leading-none outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-goodgreen-400/70 ${
              selected ? "text-ink" : "text-ink-muted hover:text-ink-soft"
            }`}
          >
            {option.label}
            {option.badge !== undefined && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums leading-none transition-colors ${
                  selected ? "bg-goodgreen-100 text-goodgreen-800" : "bg-slate-200/80 text-ink-muted"
                }`}
              >
                {option.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
