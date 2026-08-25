import { afterEach, describe, expect, it, vi } from "vitest";
import { getCrmDashboard } from "./crmDashboardService";

afterEach(() => vi.unstubAllGlobals());

describe("crmDashboardService", () => {
  it("mapeia período, custom e refresh sem alterar a identidade", async () => {
    let requestedUrl = "";
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      requestedUrl = String(input);
      return new Response(JSON.stringify({ metrics: {}, sessions: [], analytics: {}, meta: {} }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }));

    await getCrmDashboard("token-sintetico", {
      period: "custom",
      from: "2026-08-05",
      to: "2026-08-20",
      refresh: true,
    });

    const url = new URL(requestedUrl, "https://hub.example");
    expect(url.pathname).toBe("/api/crm/dashboard");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      period: "custom",
      from: "2026-08-05",
      to: "2026-08-20",
      refresh: "1",
    });
    expect(url.searchParams.has("userId")).toBe(false);
    expect(fetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
      headers: { Authorization: "Bearer token-sintetico" },
    }));
  });

  it("preserva chamadas existentes sem opções", async () => {
    let requestedUrl = "";
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      requestedUrl = String(input);
      return new Response(JSON.stringify({ metrics: {}, sessions: [], analytics: {}, meta: {} }));
    }));
    await getCrmDashboard("token-sintetico");
    expect(requestedUrl).toBe("/api/crm/dashboard");
  });
});
