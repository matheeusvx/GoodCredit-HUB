import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { CrmPortfolioDistribution, CrmPortfolioHealth as Health } from "../../../types/crmDashboard";
import { ChartCard, EmptyChartState } from "./ChartCard";

const definitions = [
  { key: "awaitingResponse", label: "Aguardando você", color: "#f59e0b" },
  { key: "unread", label: "Não lidas", color: "#2377a4" },
  { key: "inactive", label: "Sem interação >24h", color: "#64748b" },
  { key: "ok", label: "Em dia", color: "#54a34c" },
] as const;

export function CrmPortfolioHealth({ distribution, health }: {
  distribution: CrmPortfolioDistribution;
  health: Health;
}) {
  const data = definitions.map((item) => ({ ...item, value: distribution[item.key] }));
  return (
    <ChartCard title="Saúde da carteira" description="Estado atual dos processos atribuídos a você.">
      {!distribution.total ? <EmptyChartState>Nenhum processo na carteira atual.</EmptyChartState> : (
        <>
          <div className="relative mx-auto h-56 max-w-xs" role="img" aria-label="Distribuição exclusiva da carteira">
            <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey="value" nameKey="label" innerRadius={66} outerRadius={92} paddingAngle={2} stroke="none">{data.map((item) => <Cell key={item.key} fill={item.color} />)}</Pie><Tooltip formatter={(value) => [String(value), "Processos"]} /></PieChart></ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><strong className="text-3xl text-slate-950">{distribution.total}</strong><span className="text-xs font-medium text-slate-500">processos</span></div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">{data.map((item) => <div key={item.key} className="flex items-center gap-2 text-xs text-slate-600"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} /><span className="truncate">{item.label}</span><strong className="ml-auto text-slate-900">{item.value}</strong></div>)}</div>
          <div className="mt-5 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4 text-center"><div><strong className="block text-lg text-slate-900">{health.awaitingResponse}</strong><span className="text-[10px] font-medium text-slate-500">aguardando</span></div><div><strong className="block text-lg text-slate-900">{health.conversationsWithUnread}</strong><span className="text-[10px] font-medium text-slate-500">não lidas</span></div><div><strong className="block text-lg text-slate-900">{health.inactiveOver24h}</strong><span className="text-[10px] font-medium text-slate-500">inativas</span></div></div>
        </>
      )}
    </ChartCard>
  );
}
