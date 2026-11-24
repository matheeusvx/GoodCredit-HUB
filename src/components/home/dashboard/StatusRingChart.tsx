import { useId, useState, type KeyboardEvent, type PointerEvent } from "react";
import type { StatusBucket, StatusKey } from "../../../lib/home/productivity";
import { Roll } from "../../ui/Roll";
import { easeInOutCubic, easeOutExpo, useTween } from "./useTween";

type Slice = { start: number; span: number; outer: number; band: number; tuckStart: number; tuckEnd: number };

// Ring adapted from the "Portfolio Allocation" reference: slices tuck under each other like a spiral,
// each a step thinner than the one before it clockwise.
const SIZE = 260;
const CENTER = SIZE / 2;
const OUTER = 130;
const INNER = 78;
const STEP = 7;
const MIN_BAND = 28;
const TUCK = 6;
const POP = 5;
const START_ANGLE = -30;

const COLORS: Record<StatusKey, { fill: string; swatch: string; text: string }> = {
  COMPLETED: { fill: "#1f7c4e", swatch: "bg-goodgreen-600", text: "#ffffff" },
  IN_PROGRESS: { fill: "#295a7f", swatch: "bg-goodblue-600", text: "#ffffff" },
  AWAITING_PAYMENT: { fill: "#b5cde0", swatch: "bg-goodblue-200", text: "#10273a" },
  HAS_ISSUES: { fill: "#f5b83d", swatch: "bg-amber-400", text: "#3b2a05" }
};

const rad = (deg: number) => (deg * Math.PI) / 180;
const mod = (n: number, m: number) => ((n % m) + m) % m;
const polar = (radius: number, angle: number): [number, number] => [CENTER + radius * Math.sin(angle), CENTER - radius * Math.cos(angle)];
const f = (n: number) => Math.round(n * 100) / 100;

function sectorPath(inner: number, outer: number, a0: number, a1: number) {
  if (a1 - a0 >= Math.PI * 2 - 0.0001) {
    const circle = (radius: number, sweep: 0 | 1) =>
      `M ${f(CENTER - radius)} ${CENTER} A ${f(radius)} ${f(radius)} 0 1 ${sweep} ${f(CENTER + radius)} ${CENTER} A ${f(radius)} ${f(radius)} 0 1 ${sweep} ${f(CENTER - radius)} ${CENTER} Z`;
    return `${circle(outer, 1)} ${circle(inner, 0)}`;
  }
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const [x0, y0] = polar(outer, a0);
  const [x1, y1] = polar(outer, a1);
  const [x2, y2] = polar(inner, a1);
  const [x3, y3] = polar(inner, a0);
  return `M ${f(x0)} ${f(y0)} A ${outer} ${outer} 0 ${large} 1 ${f(x1)} ${f(y1)} L ${f(x2)} ${f(y2)} A ${inner} ${inner} 0 ${large} 0 ${f(x3)} ${f(y3)} Z`;
}

/** A slice's outline plus what runs on under its neighbours, cut to `upTo` degrees from the start (the entrance sweep). */
function slicePath(g: Slice, upTo: number) {
  if (!(g.span > 0.001)) return "";
  let a0 = g.start - g.tuckStart;
  let a1 = g.start + g.span + g.tuckEnd;
  const u0 = mod(a0 - START_ANGLE, 360);
  const u1 = Math.min(u0 + (a1 - a0), upTo);
  if (!(u1 > u0)) return "";
  a0 = START_ANGLE + u0;
  a1 = START_ANGLE + u1;
  return sectorPath(INNER, g.outer, rad(a0), rad(a1));
}

/** The first slice runs clockwise from the start; the others line up counter-clockwise, each a step thinner going round. */
function layoutRing(values: number[]): Slice[] {
  const shown = values.flatMap((value, i) => (value > 0 ? [i] : []));
  const total = shown.reduce((sum, i) => sum + values[i], 0);
  const m = shown.length;
  const step = m > 1 ? Math.min(STEP, (OUTER - INNER - MIN_BAND) / (m - 1)) : 0;
  let edge = START_ANGLE;
  return values.map((value, i) => {
    const at = shown.indexOf(i);
    if (at < 0) return { start: edge, span: 0, outer: OUTER, band: OUTER, tuckStart: 0, tuckEnd: 0 };
    const span = (value / total) * 360;
    const rank = at === 0 ? 0 : m - at;
    const band = OUTER - step * rank;
    if (at === 0) return { start: START_ANGLE, span, outer: band, band, tuckStart: 0, tuckEnd: m > 1 && rank === m - 1 ? TUCK : 0 };
    edge -= span;
    return { start: edge, span, outer: band, band, tuckStart: TUCK, tuckEnd: rank === m - 1 ? TUCK : 0 };
  });
}

export function StatusRingChart({ buckets }: { buckets: StatusBucket[] }) {
  const ids = useId().replace(/[^\w-]/g, "");
  const values = buckets.map((b) => b.value);
  const total = values.reduce((sum, v) => sum + v, 0);
  const shown = values.flatMap((value, i) => (value > 0 ? [i] : []));
  const layout = layoutRing(values);

  const [hovered, setHovered] = useState<number | null>(null);
  const active = hovered !== null && values[hovered] > 0 ? hovered : null;

  // the ring sweeps round once; the active slice stands out a little, the others step back
  const [sweep] = useTween([1], { from: [0], delay: 200, duration: 1300, ease: easeInOutCubic });
  const outers = useTween(layout.map((g, i) => g.band + (i === active ? POP : 0)), { duration: 380, ease: easeOutExpo });
  const geometry = layout.map((g, i) => ({ ...g, outer: outers[i] ?? g.outer }));
  const upTo = sweep * (360 + TUCK);
  const order = buckets.map((_, i) => i).sort((a, b) => layout[a].band - layout[b].band);

  const sliceAt = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const unit = box.width / SIZE;
    const x = (event.clientX - box.left) / unit - CENTER;
    const y = (event.clientY - box.top) / unit - CENTER;
    const radius = Math.hypot(x, y);
    if (radius < INNER - 8 || radius > OUTER + 8) return null;
    const angle = (Math.atan2(x, -y) * 180) / Math.PI;
    return shown.find((k) => mod(angle - layout[k].start, 360) < layout[k].span) ?? null;
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!shown.length) return;
    const at = active !== null ? shown.indexOf(active) : -1;
    const next = { ArrowRight: at + 1, ArrowDown: at + 1, ArrowLeft: at - 1, ArrowUp: at - 1 }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    setHovered(shown[mod(next, shown.length)]);
  };

  const middle = active !== null ? buckets[active] : null;
  const share = (value: number) => (total > 0 ? Math.round((value / total) * 100) : 0);

  return (
    <section className="surface flex flex-col p-5 sm:p-6" aria-labelledby="home-status-title">
      <h2 id="home-status-title" className="text-base font-bold text-ink">
        Situação dos processos
      </h2>
      <p className="mt-0.5 text-[13px] text-ink-muted">Checklists e registros ativos</p>

      <div className="relative mx-auto mt-5 aspect-square w-full max-w-[260px]">
        <svg aria-hidden="true" viewBox={`0 0 ${SIZE} ${SIZE}`} className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
          <defs>
            <filter id={`${ids}-shadow`} x={-40} y={-40} width={SIZE + 80} height={SIZE + 80} filterUnits="userSpaceOnUse">
              <feDropShadow dx={-1.5} dy={2} stdDeviation={2.5} floodColor="#0c1a26" floodOpacity={0.16} />
            </filter>
          </defs>
          {total === 0 ? (
            <path d={sectorPath(INNER, OUTER - 14, 0, Math.PI * 2)} fill="#eef1f3" />
          ) : (
            order.map((i) => {
              const d = slicePath(geometry[i], upTo);
              return (
                <g key={buckets[i].key}>
                  <path d={d} fill={COLORS[buckets[i].key].fill} filter={`url(#${ids}-shadow)`} />
                  <path
                    d={d}
                    fill="#ffffff"
                    className="transition-opacity duration-300"
                    opacity={active !== null && active !== i ? 0.55 : 0}
                  />
                </g>
              );
            })
          )}
        </svg>

        {/* share labels near the end of each slice that has room for one */}
        {total > 0 &&
          shown.map((i) => {
            const g = geometry[i];
            const radius = (INNER + g.band) / 2;
            const angle = g.start + g.span - Math.min(14, g.span / 2);
            const fits = rad(g.span) * radius >= 40;
            const [x, y] = polar(radius, rad(angle));
            const reached = mod(angle - START_ANGLE, 360) <= upTo;
            return (
              <span
                key={buckets[i].key}
                aria-hidden="true"
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 text-[11px] font-semibold tabular-nums transition-opacity duration-300"
                style={{
                  left: `${(x / SIZE) * 100}%`,
                  top: `${(y / SIZE) * 100}%`,
                  color: COLORS[buckets[i].key].text,
                  opacity: fits && reached ? (active !== null && active !== i ? 0.4 : 1) : 0
                }}
              >
                {share(values[i])}%
              </span>
            );
          })}

        <div
          role="slider"
          tabIndex={shown.length ? 0 : -1}
          aria-label="Situação dos processos"
          aria-valuemin={0}
          aria-valuemax={Math.max(0, shown.length - 1)}
          aria-valuenow={active !== null ? shown.indexOf(active) : 0}
          aria-valuetext={middle ? `${middle.label}: ${middle.value}` : `${total} processos ativos`}
          className="absolute inset-0 cursor-pointer touch-pan-y rounded-full outline-none focus-visible:ring-2 focus-visible:ring-goodgreen-400/60"
          onPointerMove={(event) => setHovered(sliceAt(event))}
          onPointerLeave={() => setHovered(null)}
          onBlur={() => setHovered(null)}
          onKeyDown={onKeyDown}
        />

        {/* the middle: the slice under the pointer, or the whole when none is */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span key={middle?.key ?? "all"} className="animate-rise text-xs text-ink-muted">
            {middle ? middle.label : total === 0 ? "Nenhum processo" : "Processos ativos"}
          </span>
          <span className="text-[30px] font-semibold leading-9 tracking-tight text-ink">
            <Roll value={String(middle ? middle.value : total)} />
          </span>
          <span className="h-4 text-xs text-ink-muted">{middle ? `${share(middle.value)}% do total` : ""}</span>
        </div>
      </div>

      <div role="group" aria-label="Situações" className="mx-auto mt-6 grid w-full max-w-[440px] grid-cols-2 gap-x-8 gap-y-2.5">
        {buckets.map((bucket, i) => (
          <button
            key={bucket.key}
            type="button"
            disabled={bucket.value === 0}
            onPointerEnter={() => setHovered(i)}
            onPointerLeave={() => setHovered(null)}
            onFocus={() => setHovered(i)}
            onBlur={() => setHovered(null)}
            className={`flex items-center gap-2 rounded-md text-left text-[13px] outline-none transition-opacity duration-300 focus-visible:ring-2 focus-visible:ring-goodgreen-400/60 disabled:cursor-default ${
              active !== null && active !== i ? "opacity-50" : ""
            } ${bucket.value === 0 ? "text-slate-400" : "text-ink-soft"}`}
          >
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${bucket.value === 0 ? "bg-slate-200" : COLORS[bucket.key].swatch}`} aria-hidden="true" />
            <span className="truncate">{bucket.label}</span>
            <span className="ml-auto font-semibold tabular-nums text-ink">{bucket.value}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
