import { useId, useState, type KeyboardEvent } from "react";
import type { WeekdayBucket } from "../../../lib/home/productivity";
import { Roll } from "../../ui/Roll";
import { easeOutExpo, useTween } from "./useTween";

// Column adapted from the "Investment App User Age" reference: one 3D column (two faces, a lid, white edges)
// drawn once at 48 × 188.921 and stretched to each bar's height, so the lid deepens with the bar.
const BAR_VIEW = "0 0 48 188.921";
const BAR_RIGHT = "M23.9683 15.685L47.0527 8.2763V181.04L23.9683 188.449Z";
const BAR_LID = "M23.9672 0.0161L47.7527 8.05164L23.9672 15.6854L0.181641 8.05164Z";
const BAR_LEFT = "M0.881216 8.2758L23.9672 15.6849V188.449L0.881216 180.6494Z";
const BAR_EDGES = [
  "M23.6187 15.6855h0.699575v172.764h-0.699575Z",
  "M23.9683 16.4893L23.9684 15.6856L47.7527 8.05167L47.7527 8.8553Z",
  "M24.1562 16.4884L24.1561 15.6847L0.181752 8.05066L0.181702 8.85444Z",
  "M23.9683 0.0161L23.9684 0.81981L47.7527 8.4537L47.7527 7.65007Z",
  "M24.1562 0.016L24.1561 0.81974L0.181752 8.45374L0.181702 7.64996Z"
].join("");

const PLOT_HEIGHT = 196;
const VALUE_GAP = 6;
const MAX_BAR = PLOT_HEIGHT - 22;
const MIN_BAR = 10; // an empty day still shows its foot
const BAR_MAX_WIDTH = 40;
const COLUMN_GAP = 8;

export function WeekdayColumnsChart({ days, windowDays }: { days: WeekdayBucket[]; windowDays: number }) {
  const ids = useId().replace(/[^\w-]/g, "");
  const n = days.length;
  const values = days.map((d) => d.value);
  const max = Math.max(0, ...values);
  const tallest = values.reduce((best, value, i) => (value > values[best] ? i : best), 0);
  const total = values.reduce((sum, v) => sum + v, 0);

  const [hovered, setHovered] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const active = hovered ?? selected ?? tallest;
  const isTallest = active === tallest && max > 0;

  const target = values.map((v) => (max > 0 ? MIN_BAR + (v / max) * (MAX_BAR - MIN_BAR) : MIN_BAR));
  const heights = useTween(target, { from: values.map(() => 0), delay: 250, stagger: 60, duration: 1000, ease: easeOutExpo });

  const day = days[active];
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const next = { ArrowRight: active + 1, ArrowLeft: active - 1, Home: 0, End: n - 1 }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    const index = Math.min(n - 1, Math.max(0, next));
    setHovered(null);
    setSelected(index);
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>("button")[index]?.focus();
  };

  return (
    <section className="surface flex flex-col p-5 sm:p-6" aria-labelledby="home-week-title">
      <h2 id="home-week-title" className="text-base font-bold text-ink">
        Ritmo da semana
      </h2>
      <p className="mt-0.5 text-[13px] text-ink-muted">Ações registradas nos últimos {windowDays} dias</p>

      <div className="mt-5">
        <p key={isTallest ? "top" : "day"} className="animate-fade text-[13px] text-ink-muted">
          {max === 0 ? "Sem atividade no período" : isTallest ? "Seu dia mais produtivo" : "Atividade na"}
        </p>
        <p className="mt-0.5 flex items-baseline gap-2">
          <span key={day?.day} className="animate-rise text-[26px] font-semibold leading-8 tracking-tight text-ink">
            {day?.long ?? ""}
          </span>
          <span className="text-sm text-ink-muted">
            <Roll value={String(day?.value ?? 0)} /> {day?.value === 1 ? "ação" : "ações"}
            {total > 0 && <span className="text-slate-400"> · {Math.round(((day?.value ?? 0) / total) * 100)}%</span>}
          </span>
        </p>
      </div>

      <div className="mt-auto pt-6">
        <div
          role="group"
          aria-label="Ações por dia da semana"
          className="relative isolate flex"
          style={{ height: PLOT_HEIGHT, gap: COLUMN_GAP }}
          onPointerLeave={() => setHovered(null)}
        >
          <svg aria-hidden="true" className="pointer-events-none absolute h-0 w-0 overflow-hidden">
            <defs>
              <linearGradient id={`${ids}-grey-right`} gradientUnits="userSpaceOnUse" x1="35.86" y1="8" x2="35.86" y2="188.4">
                <stop offset="0" stopColor="#e4e9ed" />
                <stop offset="1" stopColor="#cfd7de" />
              </linearGradient>
              <linearGradient id={`${ids}-grey-left`} gradientUnits="userSpaceOnUse" x1="23.97" y1="0" x2="0.18" y2="0">
                <stop offset="0" stopColor="#e4e9ed" />
                <stop offset="1" stopColor="#cfd7de" />
              </linearGradient>
              <linearGradient id={`${ids}-lit-right`} gradientUnits="userSpaceOnUse" x1="23.97" y1="0" x2="47.75" y2="0">
                <stop offset="0" stopColor="#b2dcc3" />
                <stop offset="1" stopColor="#2f9461" />
              </linearGradient>
              <linearGradient id={`${ids}-lit-left`} gradientUnits="userSpaceOnUse" x1="23.97" y1="0" x2="0.18" y2="0">
                <stop offset="0" stopColor="#b2dcc3" />
                <stop offset="1" stopColor="#1f7c4e" />
              </linearGradient>
            </defs>
          </svg>

          {days.map((d, i) => {
            const lit = i === active && max > 0;
            const height = heights[i] ?? 0;
            return (
              <button
                key={d.day}
                type="button"
                aria-label={`${d.long}: ${d.value} ${d.value === 1 ? "ação" : "ações"}`}
                aria-pressed={i === active}
                tabIndex={i === active ? 0 : -1}
                onPointerEnter={() => setHovered(i)}
                onClick={() => setSelected(i)}
                onKeyDown={onKeyDown}
                className="group relative min-w-0 flex-1 cursor-pointer outline-none"
              >
                <svg
                  aria-hidden="true"
                  viewBox={BAR_VIEW}
                  preserveAspectRatio="none"
                  className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2"
                  style={{ width: `min(${BAR_MAX_WIDTH}px, 78%)`, height }}
                >
                  <g className="transition-opacity duration-300" opacity={lit ? 0 : 1}>
                    <path d={BAR_RIGHT} fill={`url(#${ids}-grey-right)`} />
                    <path d={BAR_LID} fill="#eef1f3" />
                    <path d={BAR_LEFT} fill={`url(#${ids}-grey-left)`} />
                    <path d={BAR_EDGES} fill="#ffffff" />
                  </g>
                  <g className="transition-opacity duration-300" opacity={lit ? 1 : 0}>
                    <path d={BAR_RIGHT} fill={`url(#${ids}-lit-right)`} />
                    <path d={BAR_LID} fill="#d8eee1" />
                    <path d={BAR_LEFT} fill={`url(#${ids}-lit-left)`} />
                    <path d={BAR_EDGES} fill="#ffffff" />
                  </g>
                </svg>
                <span
                  aria-hidden="true"
                  className={`pointer-events-none absolute left-1/2 -translate-x-1/2 text-xs tabular-nums transition-colors duration-200 ${
                    lit ? "font-semibold text-goodgreen-700" : "text-ink-muted"
                  }`}
                  style={{ bottom: height + VALUE_GAP, opacity: Math.min(1, height / 12) }}
                >
                  {d.value}
                </span>
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -inset-1 rounded-lg opacity-0 ring-2 ring-goodgreen-400/60 transition-opacity group-focus-visible:opacity-100"
                />
              </button>
            );
          })}
          {/* the columns' feet fade into the card */}
          <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-b from-white/0 to-white" />
        </div>

        {/* day labels; the active one sits in a pill that slides along */}
        <div aria-hidden="true" className="relative mt-2 flex" style={{ gap: COLUMN_GAP }}>
          <span
            className="absolute inset-y-0 rounded-lg bg-ink transition-[left] duration-500 ease-out"
            style={{
              left: `calc(${active} * ((100% - ${COLUMN_GAP * (n - 1)}px) / ${n} + ${COLUMN_GAP}px))`,
              width: `calc((100% - ${COLUMN_GAP * (n - 1)}px) / ${n})`
            }}
          />
          {days.map((d, i) => (
            <span
              key={d.day}
              className={`relative flex-1 py-1.5 text-center text-xs transition-colors duration-200 ${
                i === active ? "font-semibold text-white" : "text-ink-muted"
              }`}
            >
              {d.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
