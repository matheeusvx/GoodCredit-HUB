import { describe, expect, it, vi } from "vitest";
import { CRM_AUTO_REFRESH_MS, startCrmAutoRefresh } from "./crmRefresh";

describe("cadência automática do CRM", () => {
  it("atualiza a cada 15 minutos e ao retornar para aba com sync antigo", () => {
    const refresh = vi.fn();
    let intervalListener: () => void = () => undefined;
    let visibilityListener: () => void = () => undefined;
    const timer = { id: "timer" };
    const timerSource = {
      setInterval: vi.fn((listener: () => void, milliseconds: number) => {
        intervalListener = listener;
        expect(milliseconds).toBe(CRM_AUTO_REFRESH_MS);
        return timer;
      }),
      clearInterval: vi.fn(),
    };
    const visibilitySource = {
      visibilityState: "visible",
      addEventListener: vi.fn((_type: "visibilitychange", listener: () => void) => { visibilityListener = listener; }),
      removeEventListener: vi.fn(),
    };
    const cleanup = startCrmAutoRefresh({
      refresh,
      getLastSyncAt: () => "2026-08-25T12:00:00Z",
      visibilitySource,
      timerSource,
      now: () => new Date("2026-08-25T12:16:00Z"),
    });

    intervalListener();
    visibilityListener();
    expect(refresh).toHaveBeenCalledTimes(2);

    cleanup();
    expect(timerSource.clearInterval).toHaveBeenCalledWith(timer);
    expect(visibilitySource.removeEventListener).toHaveBeenCalledWith(
      "visibilitychange",
      visibilityListener
    );
  });

  it("não atualiza ao retornar antes de completar 15 minutos", () => {
    const refresh = vi.fn();
    let visibilityListener: () => void = () => undefined;
    const cleanup = startCrmAutoRefresh({
      refresh,
      getLastSyncAt: () => "2026-08-25T12:00:00Z",
      visibilitySource: {
        visibilityState: "visible",
        addEventListener: (_type, listener) => { visibilityListener = listener; },
        removeEventListener: () => undefined,
      },
      timerSource: {
        setInterval: () => 1,
        clearInterval: () => undefined,
      },
      now: () => new Date("2026-08-25T12:14:59Z"),
    });
    visibilityListener();
    expect(refresh).not.toHaveBeenCalled();
    cleanup();
  });
});
