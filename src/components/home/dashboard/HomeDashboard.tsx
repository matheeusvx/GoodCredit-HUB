import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { buildMonthlyBuckets, buildStatusBuckets, buildWeekdayBuckets, type ProductivitySource } from "../../../lib/home/productivity";
import { getProductivitySource } from "../../../services/homeDashboardService";
import { selectCrmGreeting } from "../crm/crmDashboardUtils";
import { MonthlyBoxesChart } from "./MonthlyBoxesChart";
import { StatusRingChart } from "./StatusRingChart";
import { WeekdayColumnsChart } from "./WeekdayColumnsChart";

const WEEK_WINDOW_DAYS = 90;

export function HomeDashboard() {
  const { user } = useAuth();
  const [greeting] = useState(selectCrmGreeting);
  const [source, setSource] = useState<ProductivitySource | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setSource(await getProductivitySource());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível carregar seus dados.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const displayName = String(user?.user_metadata?.name || "").trim() || user?.email?.split("@")[0] || "usuário";
  const charts = useMemo(() => {
    if (!source) return null;
    const now = new Date();
    return {
      months: buildMonthlyBuckets(source, 12, now),
      statuses: buildStatusBuckets(source),
      days: buildWeekdayBuckets(source, WEEK_WINDOW_DAYS, now)
    };
  }, [source]);

  return (
    <section className="flex flex-col gap-5" aria-labelledby="crm-dashboard-title">
      <header className="min-w-0 py-1">
        <h1 id="crm-dashboard-title" className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Olá, {displayName}
        </h1>
        <p className="mt-1 text-sm text-slate-500">{greeting}</p>
      </header>

      {error && !charts ? (
        <div className="surface flex flex-col items-start gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ink-soft">{error}</p>
          <button type="button" className="btn-muted" onClick={() => void load()}>
            <RefreshCw className="h-4 w-4" /> Tentar novamente
          </button>
        </div>
      ) : loading && !charts ? (
        <DashboardSkeleton />
      ) : charts ? (
        <div className="stagger grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="xl:col-span-2">
            <MonthlyBoxesChart months={charts.months} />
          </div>
          <StatusRingChart buckets={charts.statuses} />
          <WeekdayColumnsChart days={charts.days} windowDays={WEEK_WINDOW_DAYS} />
        </div>
      ) : null}
    </section>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-5 xl:grid-cols-2" aria-label="Carregando painel" aria-busy="true">
      <div className="surface h-[340px] animate-pulse xl:col-span-2" />
      <div className="surface h-[440px] animate-pulse" />
      <div className="surface h-[440px] animate-pulse" />
    </div>
  );
}
