export const CRM_AUTO_REFRESH_MS = 15 * 60 * 1000;
export const CRM_STALE_AFTER_MS = 20 * 60 * 1000;
export const CRM_CLOCK_TICK_MS = 60 * 1000;

interface VisibilitySource {
  visibilityState: string;
  addEventListener: (type: "visibilitychange", listener: () => void) => void;
  removeEventListener: (type: "visibilitychange", listener: () => void) => void;
}

interface TimerSource {
  setInterval: (listener: () => void, milliseconds: number) => unknown;
  clearInterval: (timer: unknown) => void;
}

export function isSyncOlderThan(
  lastSyncAt: string | null,
  thresholdMs: number,
  now = new Date()
): boolean {
  if (!lastSyncAt) return true;
  const timestamp = new Date(lastSyncAt).getTime();
  return !Number.isFinite(timestamp) || now.getTime() - timestamp > thresholdMs;
}

export function startCrmAutoRefresh(options: {
  refresh: () => void;
  getLastSyncAt: () => string | null;
  visibilitySource?: VisibilitySource;
  timerSource?: TimerSource;
  now?: () => Date;
}): () => void {
  const visibilitySource = options.visibilitySource || document;
  const timerSource = options.timerSource || {
    setInterval: (listener, milliseconds) => window.setInterval(listener, milliseconds),
    clearInterval: (timer) => window.clearInterval(timer as number),
  };
  const now = options.now || (() => new Date());
  const timer = timerSource.setInterval(options.refresh, CRM_AUTO_REFRESH_MS);
  const onVisibilityChange = () => {
    if (
      visibilitySource.visibilityState === "visible"
      && isSyncOlderThan(options.getLastSyncAt(), CRM_AUTO_REFRESH_MS, now())
    ) {
      options.refresh();
    }
  };
  visibilitySource.addEventListener("visibilitychange", onVisibilityChange);
  return () => {
    timerSource.clearInterval(timer);
    visibilitySource.removeEventListener("visibilitychange", onVisibilityChange);
  };
}
