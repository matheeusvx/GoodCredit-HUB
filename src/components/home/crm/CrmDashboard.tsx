import { AlertCircle, ArrowDownToLine, ArrowUpFromLine, BriefcaseBusiness, Clock3 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { getCrmDashboard } from "../../../services/crmDashboardService";
import type { CrmAnalyticsPeriodKey, CrmDashboardResponse } from "../../../types/crmDashboard";
import { CrmDashboardHeader } from "./CrmDashboardHeader";
import { CrmPeriodSelector } from "./CrmPeriodSelector";
import { CrmDashboardSkeleton } from "./CrmDashboardSkeleton";
import { CrmInsights } from "./CrmInsights";
import { CrmMetricCard } from "./CrmMetricCard";
import { CrmMovementChart } from "./CrmMovementChart";
import { CrmPerformanceChart, type MainChartMetric, type MainChartType } from "./CrmPerformanceChart";
import { CrmPortfolioHealth } from "./CrmPortfolioHealth";
import { CrmPrioritySessions } from "./CrmPrioritySessions";
import { CrmResponseChart } from "./CrmResponseChart";
import {
  formatDuration,
  formatMetricNumber,
  assignmentHistoryNote,
  generateCrmInsights,
  retainDashboardAfterRefreshError,
  selectCrmGreeting,
  type SessionFilter,
  validateCustomDateRange,
} from "./crmDashboardUtils";
import { CRM_CLOCK_TICK_MS, startCrmAutoRefresh } from "./crmRefresh";

function localToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function StateNotice({ children, tone = "amber" }: { children: React.ReactNode; tone?: "amber" | "red" }) {
  return <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${tone === "red" ? "border-red-200 bg-red-50 text-red-700" : "border-amber-200 bg-amber-50 text-amber-800"}`}>{children}</div>;
}

export function CrmDashboard() {
  const { session, user } = useAuth();
  const [dashboard, setDashboard] = useState<CrmDashboardResponse | null>(null);
  const [fetching, setFetching] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [clockNow, setClockNow] = useState(() => new Date());
  const [greetingMessage] = useState(selectCrmGreeting);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<CrmAnalyticsPeriodKey>("today");
  const [customFrom, setCustomFrom] = useState(localToday);
  const [customTo, setCustomTo] = useState(localToday);
  const [appliedCustom, setAppliedCustom] = useState<{ from: string; to: string } | null>(null);
  const [mainMetric, setMainMetric] = useState<MainChartMetric>("clientsServed");
  const [chartType, setChartType] = useState<MainChartType>("area");
  const [sessionFilter, setSessionFilter] = useState<SessionFilter>("all");
  const [sessionSearch, setSessionSearch] = useState("");
  const mountedRef = useRef(false);
  const requestInFlightRef = useRef(false);
  const pendingRequestRef = useRef<{ refresh: boolean } | null>(null);
  const initialRefreshDoneRef = useRef(false);
  const lastSyncAtRef = useRef<string | null>(null);
  const loadRef = useRef<(refresh: boolean) => Promise<void>>(async () => undefined);

  lastSyncAtRef.current = dashboard?.meta.lastSyncAt || null;

  const load = useCallback(async (refresh: boolean) => {
    if (!session?.access_token || (period === "custom" && !appliedCustom)) return;
    if (requestInFlightRef.current) {
      pendingRequestRef.current = {
        refresh: Boolean(pendingRequestRef.current?.refresh || refresh),
      };
      return;
    }
    requestInFlightRef.current = true;
    setFetching(true);
    setRefreshing(refresh);
    setError(null);
    try {
      const next = await getCrmDashboard(session.access_token, {
        period,
        from: appliedCustom?.from,
        to: appliedCustom?.to,
        refresh,
      });
      if (mountedRef.current) {
        setDashboard(next);
        if (refresh) initialRefreshDoneRef.current = true;
      }
    } catch (loadError) {
      if (mountedRef.current) {
        setDashboard((current) => retainDashboardAfterRefreshError(current));
        setError(loadError instanceof Error ? loadError.message : "Não foi possível atualizar os indicadores.");
      }
    } finally {
      requestInFlightRef.current = false;
      if (mountedRef.current) {
        setFetching(false);
        setRefreshing(false);
        const pending = pendingRequestRef.current;
        pendingRequestRef.current = null;
        if (pending) queueMicrotask(() => void loadRef.current(pending.refresh));
      }
    }
  }, [appliedCustom, period, session?.access_token]);

  useEffect(() => {
    loadRef.current = load;
  }, [load]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      pendingRequestRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (period === "custom" && !appliedCustom) return;
    void load(!initialRefreshDoneRef.current);
  }, [appliedCustom, load, period]);

  useEffect(() => {
    if (!session?.access_token) return;
    return startCrmAutoRefresh({
      refresh: () => void loadRef.current(true),
      getLastSyncAt: () => lastSyncAtRef.current,
    });
  }, [session?.access_token]);

  useEffect(() => {
    const timer = window.setInterval(() => setClockNow(new Date()), CRM_CLOCK_TICK_MS);
    return () => window.clearInterval(timer);
  }, []);

  const displayName = dashboard?.user?.name || String(user?.user_metadata?.name || "").trim() || user?.email?.split("@")[0] || "usuário";
  const insights = useMemo(() => dashboard ? generateCrmInsights(dashboard) : [], [dashboard]);
  const cards = useMemo(() => {
    if (!dashboard) return [];
    const summary = dashboard.analytics.periodSummary;
    const comparison = dashboard.analytics.comparison;
    const assignmentCoverage = dashboard.analytics.availability.assignmentCoverage
      ?? (summary.received === null || summary.transferred === null ? "NONE" : "FULL");
    const assignmentNote = assignmentHistoryNote(
      assignmentCoverage,
      dashboard.analytics.availability.assignmentHistoryStartAt,
    );
    return [
      { label: "Carteira atual", value: formatMetricNumber(dashboard.metrics.currentPortfolio), icon: BriefcaseBusiness, comparison: null, note: "Snapshot atual da sua carteira" },
      { label: "Recebidos", value: formatMetricNumber(summary.received), icon: ArrowDownToLine, comparison: comparison.received, sparkline: dashboard.analytics.dailySeries.map((item) => item.received), note: assignmentNote },
      { label: "Transferidos", value: formatMetricNumber(summary.transferred), icon: ArrowUpFromLine, comparison: comparison.transferred, sparkline: dashboard.analytics.dailySeries.map((item) => item.transferred), note: assignmentNote },
      { label: "Tempo médio de resposta", value: formatDuration(period === "today" ? dashboard.metrics.averageResponseSecondsToday : summary.averageResponseSeconds), icon: Clock3, comparison: comparison.averageResponseSeconds, lowerIsBetter: true, sparkline: dashboard.analytics.dailySeries.map((item) => item.averageResponseSeconds) },
    ];
  }, [dashboard, period]);

  function changePeriod(next: CrmAnalyticsPeriodKey) {
    setPeriod(next);
    if (next !== "custom") setAppliedCustom(null);
  }

  function applyCustom() {
    if (!validateCustomDateRange(customFrom, customTo)) {
      setPeriod("custom");
      setAppliedCustom({ from: customFrom, to: customTo });
    }
  }

  if (!dashboard && fetching) return <CrmDashboardSkeleton />;

  return (
    <section className="space-y-5" aria-labelledby="crm-dashboard-title">
      <div className="flex flex-col items-start gap-3 border-b border-slate-200/80 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <CrmDashboardHeader name={displayName} greeting={greetingMessage} status={error ? "SYNC_ERROR" : dashboard?.meta.integrationStatus || null} lastSyncAt={dashboard?.meta.lastSyncAt || null} refreshing={refreshing} busy={fetching} now={clockNow} onRefresh={() => void load(true)} />
        <CrmPeriodSelector period={period} onPeriodChange={changePeriod} customFrom={customFrom} customTo={customTo} onCustomFromChange={setCustomFrom} onCustomToChange={setCustomTo} onApplyCustom={applyCustom} now={clockNow} />
      </div>
      {error && <StateNotice tone="red"><span className="flex items-center gap-2"><AlertCircle className="h-4 w-4" />{error}{dashboard && " Os últimos dados permanecem visíveis."}</span></StateNotice>}
      {dashboard?.meta.integrationStatus === "NOT_CONFIGURED" && <StateNotice>Integração CRM ainda não configurada.</StateNotice>}
      {dashboard?.meta.integrationStatus === "UNLINKED" && <StateNotice>Seu usuário do CRM ainda não está vinculado ao GoodCredit Hub.</StateNotice>}
      {dashboard?.meta.integrationStatus === "SYNC_ERROR" && <StateNotice>O CRM está temporariamente indisponível. Exibindo o último estado sincronizado.</StateNotice>}
      {dashboard?.user && <>
        {dashboard.analytics.period.limitedByMetricsStartAt && <p className="rounded-lg bg-goodblue-50 px-4 py-2 text-xs font-medium text-goodblue-700">O período foi ajustado à data inicial disponível para análise.</p>}
        <div className={`grid gap-4 transition-opacity sm:grid-cols-2 xl:grid-cols-4 ${fetching ? "opacity-70" : "opacity-100"}`}>{cards.map((card) => <CrmMetricCard key={card.label} {...card} />)}</div>
        <div className="grid gap-5 xl:grid-cols-3"><CrmPerformanceChart data={dashboard.analytics.dailySeries} metric={mainMetric} chartType={chartType} onMetricChange={setMainMetric} onChartTypeChange={setChartType} /><CrmPortfolioHealth distribution={dashboard.analytics.portfolioDistribution} health={dashboard.analytics.portfolioHealth} /></div>
        <div className="grid gap-5 xl:grid-cols-2"><CrmMovementChart data={dashboard.analytics.dailySeries} /><CrmResponseChart data={dashboard.analytics.dailySeries} /></div>
        <CrmInsights insights={insights} />
        <CrmPrioritySessions sessions={dashboard.sessions} filter={sessionFilter} search={sessionSearch} onFilterChange={setSessionFilter} onSearchChange={setSessionSearch} />
      </>}
    </section>
  );
}
