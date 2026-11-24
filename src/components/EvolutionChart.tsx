import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrencyBR } from "../lib/financial";
import { AmortizationRow } from "../types/amortization";

interface EvolutionChartProps {
  rows: AmortizationRow[];
}

export function EvolutionChart({ rows }: EvolutionChartProps) {
  const data = rows.map((row) => ({
    month: row.month,
    original: row.contractFinalBalance,
    simulated: row.afterPayoff ? null : row.simulatedFinalBalance,
    manual: row.manualContributionApplied,
    fgts: row.fgtsContributionApplied,
    payoff: row.payoff
  }));

  return (
    <section id="chart-section" className="surface p-5 sm:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-bold text-ink">Evolução do saldo devedor</h2>
        <div className="flex items-center gap-5 text-[13px] text-ink-muted">
          <span className="flex items-center gap-2"><span className="h-0.5 w-4 rounded-full bg-slate-400" aria-hidden="true" />Contrato original</span>
          <span className="flex items-center gap-2"><span className="h-0.5 w-4 rounded-full bg-goodgreen-600" aria-hidden="true" />Com amortizações</span>
        </div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 12, right: 18, left: 10, bottom: 8 }}>
            <defs>
              <linearGradient id="simulatedFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1f7c4e" stopOpacity={0.14} />
                <stop offset="100%" stopColor="#1f7c4e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#eef1f3" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12, fill: "#6b7884" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "#6b7884" }}
              tickFormatter={(value) => `${Math.round(Number(value) / 1000)} mil`}
              tickLine={false}
              axisLine={false}
              width={72}
            />
            <Tooltip content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const item = payload[0]?.payload as (typeof data)[number];
              return (
                <div className="rounded-lg border border-slate-200 bg-white/95 p-3 text-xs shadow-lift backdrop-blur">
                  <p className="font-bold text-ink">Parcela {item.month}</p>
                  <p className="mt-2 text-ink-muted">Saldo original: {formatCurrencyBR(item.original)}</p>
                  {item.simulated !== null && <p className="mt-1 text-goodgreen-700">Saldo corrigido: {formatCurrencyBR(item.simulated)}</p>}
                  <p className="mt-1 text-amber-700">Aporte manual: {formatCurrencyBR(item.manual)}</p>
                  <p className="mt-1 text-goodgreen-700">FGTS: {formatCurrencyBR(item.fgts)}</p>
                  {item.payoff && <p className="mt-2 font-bold text-goodgreen-700">Financiamento quitado</p>}
                </div>
              );
            }} />
                        <Line
              name="Saldo original"
              type="monotone"
              dataKey="original"
              stroke="#94a3b8"
              strokeWidth={1.75}
              strokeDasharray="4 4"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
              animationDuration={900}
            />
            <Area
              name="Saldo com amortizações"
              type="monotone"
              dataKey="simulated"
              stroke="#1f7c4e"
              strokeWidth={2.25}
              fill="url(#simulatedFill)"
              dot={false}
              activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
              animationDuration={1100}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
