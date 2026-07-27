import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getComplianceChecklistMetrics,
  listComplianceChecklistAnalysts,
  listComplianceChecklists
} from "../services/complianceChecklistService";
import type {
  ComplianceChecklistListFilters,
  ComplianceChecklistMetrics,
  ComplianceChecklistRecord
} from "../types/complianceChecklist";
import { useDebouncedValue } from "./useDebouncedValue";

const EMPTY_METRICS: ComplianceChecklistMetrics = {
  active: 0,
  inProgress: 0,
  hasIssues: 0,
  completed: 0,
  archived: 0
};

export function useComplianceChecklists(filters: ComplianceChecklistListFilters) {
  const debouncedSearch = useDebouncedValue(filters.search, 400);
  const [records, setRecords] = useState<ComplianceChecklistRecord[]>([]);
  const [metrics, setMetrics] = useState(EMPTY_METRICS);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [analysts, setAnalysts] = useState<string[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const queryFilters = useMemo(
    () => ({ ...filters, search: debouncedSearch }),
    [debouncedSearch, filters]
  );

  const refresh = useCallback(() => setRefreshKey((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    void Promise.all([
      listComplianceChecklists(queryFilters),
      getComplianceChecklistMetrics(),
      listComplianceChecklistAnalysts()
    ])
      .then(([list, nextMetrics, nextAnalysts]) => {
        if (!active) return;
        setRecords(list.records);
        setTotal(list.total);
        setMetrics(nextMetrics);
        setAnalysts(nextAnalysts);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setError(
          reason instanceof Error
            ? reason.message
            : "Não foi possível carregar os checklists."
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [queryFilters, refreshKey]);

  return { records, metrics, analysts, total, loading, error, refresh };
}
