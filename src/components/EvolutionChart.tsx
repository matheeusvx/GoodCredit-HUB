import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
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
    <section id="chart-section" className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-950">Evolução do saldo devedor</h2>
          <p className="text-sm text-slate-500">Comparativo entre o contrato original e a simulação com amortizações.</p>
        </div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 12, right: 18, left: 10, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12, fill: "#64748b" }}
              tickLine={false}
              axisLine={{ stroke: "#cbd5e1" }}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "#64748b" }}
              tickFormatter={(value) => `${Math.round(Number(value) / 1000)} mil`}
              tickLine={false}
              axisLine={{ stroke: "#cbd5e1" }}
              width={72}
            />
            <Tooltip content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const item = payload[0]?.payload as (typeof data)[number];
              return (
                <div className="rounded-lg border border-goodblue-100 bg-white p-3 text-xs shadow-xl">
                  <p className="font-bold text-slate-900">Parcela {item.month}</p>
                  <p className="mt-2 text-goodblue-700">Saldo original: {formatCurrencyBR(item.original)}</p>
                  {item.simulated !== null && <p className="mt-1 text-goodgreen-700">Saldo corrigido: {formatCurrencyBR(item.simulated)}</p>}
                  <p className="mt-1 text-amber-700">Aporte manual: {formatCurrencyBR(item.manual)}</p>
                  <p className="mt-1 text-goodgreen-700">FGTS: {formatCurrencyBR(item.fgts)}</p>
                  {item.payoff && <p className="mt-2 font-bold text-goodgreen-700">Financiamento quitado</p>}
                </div>
              );
            }} />
            <Legend />
            <Line
              name="Saldo original"
              type="monotone"
              dataKey="original"
              stroke="#2377a4"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 5 }}
            />
            <Line
              name="Saldo com amortizações"
              type="monotone"
              dataKey="simulated"
              stroke="#54a34c"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
