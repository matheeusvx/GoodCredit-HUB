import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CrmAnalyticsDailyPoint } from "../../../types/crmDashboard";
import { ChartCard, EmptyChartState } from "./ChartCard";
import { formatChartDate, formatDuration } from "./crmDashboardUtils";

export function CrmResponseChart({ data }: { data: CrmAnalyticsDailyPoint[] }) {
  const hasResponses = data.some((item) => item.averageResponseSeconds !== null);
  return <ChartCard title="Tempo médio de resposta" description="Evolução diária do tempo até a primeira resposta">{!hasResponses ? <EmptyChartState /> : <div className="h-72" role="img" aria-label="Gráfico do tempo médio de resposta"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data}><defs><linearGradient id="crmResponseArea" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2377a4" stopOpacity={0.28} /><stop offset="95%" stopColor="#2377a4" stopOpacity={0.02} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" /><XAxis dataKey="date" tickFormatter={formatChartDate} tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} minTickGap={24} /><YAxis tickFormatter={(value: number) => formatDuration(value)} tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} width={54} /><Tooltip labelFormatter={(label) => formatChartDate(String(label))} formatter={(value) => [value === null || value === undefined ? "Sem histórico disponível" : formatDuration(Number(value)), "Tempo médio"]} /><Area type="monotone" dataKey="averageResponseSeconds" stroke="#2377a4" strokeWidth={2.5} fill="url(#crmResponseArea)" connectNulls={false} /></AreaChart></ResponsiveContainer></div>}</ChartCard>;
}
