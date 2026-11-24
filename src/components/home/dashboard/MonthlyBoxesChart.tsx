import { useId, useMemo, useState, type KeyboardEvent, type PointerEvent } from "react";
import { percentChange, type MonthBucket } from "../../../lib/home/productivity";
import { Roll } from "../../ui/Roll";
import { SegmentedControl } from "../../ui/SegmentedControl";
import { easeOutCubic, easeOutExpo, useTween, useWidth } from "./useTween";

type Point = [number, number];
type Box = { x: number; width: number; height: number; side: number; back: number };

// Geometry adapted from the "Average Sales" reference: each box is one isometric template stretched to its height.
const PLOT_HEIGHT = 216;
const TALLEST = 200;
const BOX_WIDTH = 72;
const BOX_GAP = 20;
const SIDE = 0.0558; // side corners sit this share of the front edge above the front corner
const BACK = 0.0597; // the back corner this share above the side corners
const PERIODS = [
  { value: "3", label: "3 meses" },
  { value: "6", label: "6 meses" },
  { value: "12", label: "12 meses" }
] as const;
type Period = (typeof PERIODS)[number]["value"];

/** The window's months spread over the plot; months before it wait off the left edge. Heights follow the window's highest month. */
function layoutBoxes(values: number[], start: number, count: number, width: number): Box[] {
  const ratio = BOX_GAP / BOX_WIDTH;
  const fit = width / (count + (count - 1) * ratio);
  const boxWidth = Math.min(BOX_WIDTH, fit);
  const gap = count > 1 ? (width - count * boxWidth) / (count - 1) : 0;
  const max = Math.max(0, ...values.slice(start, start + count));
  const scale = boxWidth / BOX_WIDTH;
  return values.map((value, i) => {
    const total = max > 0 ? (TALLEST * Math.max(0, value)) / max : 0;
    const height = total / (1 + (SIDE + BACK) * scale);
    return { x: (i - start) * (boxWidth + gap), width: boxWidth, height, side: SIDE * height * scale, back: BACK * height * scale };
  });
}

const r = (n: number) => Math.round(n * 100) / 100;
const polygon = (points: Point[]) => `M ${points.map(([x, y]) => `${r(x)} ${r(y)}`).join(" L ")} Z`;

function faces({ x, width, height, side, back }: Box, level = 1) {
  const h = Math.max(0, height * level);
  const mid = x + width / 2;
  const right = x + width;
  const y = PLOT_HEIGHT;
  // a box with no height still shows its footprint, so an empty month reads as zero, not as missing
  const s = Math.max(side, (width / BOX_WIDTH) * 3);
  const b = Math.max(back, (width / BOX_WIDTH) * 3);
  const fb: Point = [mid, y];
  const lb: Point = [x, y - s];
  const rb: Point = [right, y - s];
  const ft: Point = [mid, y - h];
  const lt: Point = [x, y - h - s];
  const rt: Point = [right, y - h - s];
  const bt: Point = [mid, y - h - s - b];
  return {
    left: polygon([fb, lb, lt, ft]),
    right: polygon([fb, rb, rt, ft]),
    top: polygon([bt, lt, ft, rt])
  };
}

const monthShort = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
const monthLong = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export function MonthlyBoxesChart({ months }: { months: MonthBucket[] }) {
  const ids = useId().replace(/[^\w-]/g, "");
  const n = months.length;
  const [period, setPeriod] = useState<Period>("6");
  const count = Math.min(n, Number(period));
  const start = n - count;
  const [plotRef, width] = useWidth<HTMLDivElement>(560);

  const [selected, setSelected] = useState(n - 1);
  const [hovered, setHovered] = useState<number | null>(null);
  const active = hovered !== null && hovered >= start ? hovered : Math.max(selected, start);

  const boxes = useMemo(() => layoutBoxes(months.map((m) => m.total), start, count, width), [months, start, count, width]);

  // Boxes rise from the floor one after another; a new period slides and rescales them from where they are.
  const xs = useTween(boxes.map((b) => b.x), { duration: 800 });
  const widths = useTween(boxes.map((b) => b.width), { duration: 800 });
  const heights = useTween(boxes.map((b) => b.height), {
    from: boxes.map(() => 0),
    delay: 150,
    stagger: 70,
    duration: 900,
    ease: easeOutExpo
  });
  // The active month fills with green; the one it leaves drains.
  const levels = useTween(months.map((_, i) => (i === active ? 1 : 0)), {
    from: months.map(() => 0),
    delay: 650,
    duration: 650,
    ease: easeOutCubic
  });

  const month = months[active];
  const change = percentChange(month?.total ?? 0, months[active - 1]?.total);
  const windowMonths = months.slice(start);
  const busiest = windowMonths.reduce((best, m) => (m.total > best.total ? m : best), windowMonths[0]);
  const empty = windowMonths.every((m) => m.total === 0);

  const pick = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    let best = start;
    for (let i = start; i < n; i++) {
      const center = boxes[i].x + boxes[i].width / 2;
      if (Math.abs(center - x) < Math.abs(boxes[best].x + boxes[best].width / 2 - x)) best = i;
    }
    return best;
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const next = { ArrowRight: active + 1, ArrowLeft: active - 1, Home: start, End: n - 1 }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    setHovered(null);
    setSelected(Math.min(n - 1, Math.max(start, next)));
  };

  return (
    <section className="surface p-5 sm:p-6" aria-labelledby="home-monthly-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="home-monthly-title" className="text-base font-bold text-ink">
          Processos abertos
        </h2>
        <SegmentedControl
          size="sm"
          label="Período"
          value={period}
          onChange={(value) => {
            setPeriod(value);
            setHovered(null);
            if (selected < n - Number(value)) setSelected(n - 1);
          }}
          options={PERIODS.map((option) => ({ ...option }))}
        />
      </div>

      <div className="mt-5 flex flex-col gap-6 md:flex-row md:gap-10">
        {/* the active month: its total, change from the month before, and what it was made of */}
        <div className="flex shrink-0 flex-col justify-between gap-5 md:w-[200px]">
          <div>
            <p className="text-[13px] text-ink-muted">{month ? capitalize(monthLong(month.month)) : ""}</p>
            <p className="mt-1 flex items-baseline gap-2">
              <span className="text-[40px] font-semibold leading-none tracking-tight text-ink">
                <Roll value={String(month?.total ?? 0)} />
              </span>
              <span className="text-sm text-ink-muted">{month?.total === 1 ? "processo" : "processos"}</span>
            </p>
            <div className="mt-3 h-6">
              {change !== null && (
                <span
                  key={`${active}-${Math.sign(Math.round(change))}`}
                  className={`inline-flex animate-fade items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                    Math.round(change) > 0
                      ? "bg-goodgreen-50 text-goodgreen-700"
                      : Math.round(change) < 0
                        ? "bg-rose-50 text-rose-700"
                        : "bg-slate-100 text-ink-muted"
                  }`}
                >
                  {Math.round(change) === 0 ? (
                    "Igual ao mês anterior"
                  ) : (
                    <>
                      {change > 0 ? "▲" : "▼"} {Math.abs(Math.round(change))}%
                      <span className="font-medium opacity-70">vs. mês anterior</span>
                    </>
                  )}
                </span>
              )}
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <Split swatch="bg-goodgreen-500" label="Checklists" value={month?.checklists ?? 0} />
            <Split swatch="bg-goodblue-400" label="Registros" value={month?.registros ?? 0} />
            {busiest && busiest.total > 0 && (
              <p key={busiest.month} className="animate-fade pt-2 text-xs leading-5 text-ink-muted">
                {busiest.month === month?.month ? "Mês mais movimentado do período." : `Pico em ${monthLong(busiest.month)}.`}
              </p>
            )}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div
            ref={plotRef}
            role="slider"
            tabIndex={0}
            aria-label="Processos abertos por mês"
            aria-valuemin={start}
            aria-valuemax={n - 1}
            aria-valuenow={active}
            aria-valuetext={month ? `${monthLong(month.month)}: ${month.total} processos` : undefined}
            className="relative cursor-pointer touch-pan-y rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-goodgreen-400/60"
            style={{ height: PLOT_HEIGHT }}
            onPointerMove={(event) => setHovered(pick(event))}
            onPointerLeave={() => setHovered(null)}
            onPointerUp={(event) => setSelected(pick(event))}
            onKeyDown={onKeyDown}
          >
            <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
              <defs>
                <linearGradient id={`${ids}-left`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#2f9461" />
                  <stop offset="1" stopColor="#d8eee1" />
                </linearGradient>
                <linearGradient id={`${ids}-right`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#4fa877" />
                  <stop offset="1" stopColor="#eef7f1" />
                </linearGradient>
                <linearGradient id={`${ids}-top`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stopColor="#80c39d" />
                  <stop offset="1" stopColor="#b2dcc3" />
                </linearGradient>
                <clipPath id={`${ids}-plot`}>
                  <rect x={0} y={-PLOT_HEIGHT} width={width} height={PLOT_HEIGHT * 2} />
                </clipPath>
              </defs>
              <g clipPath={`url(#${ids}-plot)`}>
                {months.map((m, i) => {
                  const box: Box = {
                    x: xs[i] ?? 0,
                    width: widths[i] ?? 0,
                    height: heights[i] ?? 0,
                    side: SIDE * (heights[i] ?? 0) * ((widths[i] ?? 0) / BOX_WIDTH),
                    back: BACK * (heights[i] ?? 0) * ((widths[i] ?? 0) / BOX_WIDTH)
                  };
                  const level = levels[i] ?? 0;
                  const wire = faces(box);
                  const solid = faces(box, level);
                  return (
                    <g key={m.month}>
                      {/* dashed wireframe, fading out as the box fills */}
                      <g opacity={0.9 * (1 - level)}>
                        {(["left", "right", "top"] as const).map((face) => (
                          <path
                            key={face}
                            d={wire[face]}
                            fill="#ffffff"
                            stroke="#b8c2cb"
                            strokeWidth={1}
                            strokeDasharray="4 4"
                            strokeLinejoin="round"
                          />
                        ))}
                      </g>
                      {level > 0.001 && (
                        <g>
                          <path d={solid.left} fill={`url(#${ids}-left)`} />
                          <path d={solid.right} fill={`url(#${ids}-right)`} />
                          <path d={solid.top} fill={`url(#${ids}-top)`} />
                        </g>
                      )}
                    </g>
                  );
                })}
              </g>
            </svg>
            {empty && (
              <p className="absolute inset-x-0 top-1/3 text-center text-sm text-ink-muted">Nenhum processo aberto neste período.</p>
            )}
          </div>

          {/* each month centred under its box */}
          <div aria-hidden="true" className="relative mt-2 h-6 overflow-x-clip">
            {months.map((m, i) => (
              <span
                key={m.month}
                className={`absolute top-1 -translate-x-1/2 whitespace-nowrap text-xs transition-colors duration-200 ${
                  i < start ? "opacity-0" : ""
                } ${i === active ? "font-semibold text-ink" : "text-ink-muted"}`}
                style={{ left: (xs[i] ?? 0) + (widths[i] ?? 0) / 2 }}
              >
                {monthShort(m.month)}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Split({ swatch, label, value }: { swatch: string; label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="flex items-center gap-2 text-ink-muted">
        <span className={`h-2 w-2 rounded-sm ${swatch}`} aria-hidden="true" />
        {label}
      </span>
      <span className="font-semibold text-ink-soft">
        <Roll value={String(value)} />
      </span>
    </div>
  );
}
