import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CrmAnalyticsDailyPoint } from "../../../types/crmDashboard";
import { ChartCard, EmptyChartState } from "./ChartCard";
import { formatChartDate, formatDuration, formatMetricNumber } from "./crmDashboardUtils";

export type MainChartMetric = "clientsServed" | "received" | "transferred" | "averageResponseSeconds";
export type MainChartType = "line" | "bar" | "area";

const metricOptions: Array<{ key: MainChartMetric; label: string }> = [
  { key: "clientsServed", label: "Clientes atendidos" },
  { key: "received", label: "Recebidos" },
  { key: "transferred", label: "Transferidos" },
  { key: "averageResponseSeconds", label: "Tempo de resposta" },
];

function PerformanceTooltip({ active, label, value, metric }: {
  active?: boolean;
  label?: string;
  value?: number | null;
  metric: MainChartMetric;
}) {
  if (!active || !label) return null;
  const name = metricOptions.find((item) => item.key === metric)?.label || "Indicador";
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-panel">
      <p className="text-xs font-bold text-slate-900">{formatChartDate(label)}</p>
      <p className="mt-1 text-xs text-slate-600">{name}: <strong>{value === null || value === undefined ? "Sem histórico disponível" : metric === "averageResponseSeconds" ? formatDuration(value) : formatMetricNumber(value)}</strong></p>
    </div>
  );
}

export function CrmPerformanceChart({ data, metric, chartType, onMetricChange, onChartTypeChange }: {
  data: CrmAnalyticsDailyPoint[];
  metric: MainChartMetric;
  chartType: MainChartType;
  onMetricChange: (metric: MainChartMetric) => void;
  onChartTypeChange: (type: MainChartType) => void;
}) {
  const hasData = data.some((point) => point[metric] !== null);
  const common = (
    <>
      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
      <XAxis dataKey="date" tickFormatter={formatChartDate} tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={28} />
      <YAxis tickFormatter={(value: number) => metric === "averageResponseSeconds" ? formatDuration(value) : formatMetricNumber(value)} tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} width={52} />
      <Tooltip content={({ active, label, payload }) => <PerformanceTooltip active={active} label={String(label || "")} value={payload?.[0]?.value as number | null | undefined} metric={metric} />} />
    </>
  );
  return (
    <ChartCard title="Desempenho operacional" description="Acompanhe a evolução diária do período selecionado." className="xl:col-span-2" actions={<div className="flex flex-wrap gap-2"><label className="sr-only" htmlFor="main-chart-metric">Métrica</label><select id="main-chart-metric" value={metric} onChange={(event) => onMetricChange(event.target.value as MainChartMetric)} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none focus:border-goodgreen-500 focus:ring-2 focus:ring-goodgreen-100">{metricOptions.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select><div className="flex rounded-lg bg-slate-100 p-1" aria-label="Visualização do gráfico">{(["line", "bar", "area"] as const).map((type) => <button key={type} type="button" aria-pressed={chartType === type} onClick={() => onChartTypeChange(type)} className={`rounded-md px-2.5 py-1 text-[11px] font-bold capitalize ${chartType === type ? "bg-white text-goodgreen-700 shadow-sm" : "text-slate-500"}`}>{type === "line" ? "Linha" : type === "bar" ? "Barras" : "Área"}</button>)}</div></div>}>
      {!data.length || !hasData ? <EmptyChartState>{metric === "received" || metric === "transferred" ? "Histórico disponível após o início do monitoramento." : undefined}</EmptyChartState> : (
        <div className="h-72 sm:h-80" role="img" aria-label={`Gráfico de ${metricOptions.find((item) => item.key === metric)?.label}`}>
          <ResponsiveContainer width="100%" height="100%">
            {chartType === "bar" ? <BarChart data={data}>{common}<Bar dataKey={metric} fill="#3f8b3a" radius={[6, 6, 0, 0]} /></BarChart> : chartType === "area" ? <AreaChart data={data}>{common}<defs><linearGradient id="crmPerformanceArea" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#54a34c" stopOpacity={0.28} /><stop offset="95%" stopColor="#54a34c" stopOpacity={0.02} /></linearGradient></defs><Area type="monotone" dataKey={metric} stroke="#3f8b3a" strokeWidth={2.5} fill="url(#crmPerformanceArea)" connectNulls={false} /></AreaChart> : <LineChart data={data}>{common}<Line type="monotone" dataKey={metric} stroke="#3f8b3a" strokeWidth={2.5} dot={{ r: 3, fill: "#fff", strokeWidth: 2 }} activeDot={{ r: 5 }} connectNulls={false} /></LineChart>}
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}
