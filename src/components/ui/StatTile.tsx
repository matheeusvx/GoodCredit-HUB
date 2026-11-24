import { Roll, useMounted } from "./Roll";

export type StatTone = "green" | "blue" | "amber" | "red" | "slate";

const METER: Record<StatTone, string> = {
  green: "bg-goodgreen-500",
  blue: "bg-goodblue-500",
  amber: "bg-amber-500",
  red: "bg-rose-500",
  slate: "bg-slate-400"
};

const VALUE: Record<StatTone, string> = {
  green: "text-goodgreen-700",
  blue: "text-ink",
  amber: "text-ink",
  red: "text-rose-700",
  slate: "text-ink"
};

/**
 * One number and what it is. Colour lives in the meter (its share of the whole), not in an icon.
 * `emphasis` tints the value itself, for the one tile that is the result.
 */
export function StatTile({
  label,
  value,
  detail,
  tone = "slate",
  share,
  emphasis = false,
  className = ""
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: StatTone;
  share?: number;
  emphasis?: boolean;
  className?: string;
}) {
  const mounted = useMounted();
  const scale = share === undefined ? 0 : Math.max(0, Math.min(1, share));
  return (
    <article className={`flex min-w-0 flex-col rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm ${className}`}>
      <p className="text-[13px] font-medium text-ink-muted">{label}</p>
      <p className={`mt-1.5 text-[26px] font-semibold leading-8 tracking-tight ${emphasis ? VALUE[tone] : "text-ink"}`}>
        <Roll value={value} />
      </p>
      {detail && <p className="mt-0.5 truncate text-xs text-ink-muted">{detail}</p>}
      {share !== undefined && (
        <div className="mt-auto pt-3" aria-hidden="true">
          <div className="h-1 overflow-hidden rounded-full bg-slate-100">
            <div className={`meter h-full w-full rounded-full ${METER[tone]}`} style={{ transform: `scaleX(${mounted ? scale : 0})` }} />
          </div>
        </div>
      )}
    </article>
  );
}
