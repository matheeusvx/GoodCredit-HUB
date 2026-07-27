import { describe, expect, it } from "vitest";
import {
  buildLoginPath,
  getReturnPath,
  isPublicAuthPath,
  sanitizeInternalDestination
} from "./authNavigation";

describe("navegação de autenticação", () => {
  it("mantém públicas somente as rotas de autenticação", () => {
    expect(isPublicAuthPath("/login")).toBe(true);
    expect(isPublicAuthPath("/forgot-password")).toBe(true);
    expect(isPublicAuthPath("/reset-password")).toBe(true);
    expect(isPublicAuthPath("/auth/callback")).toBe(true);
    expect(isPublicAuthPath("/")).toBe(false);
    expect(isPublicAuthPath("/registro")).toBe(false);
    expect(isPublicAuthPath("/faq")).toBe(false);
    expect(isPublicAuthPath("/checklist-conformidade")).toBe(false);
  });

  it("preserva uma rota interna solicitada", () => {
    expect(getReturnPath("?returnTo=%2Fregistro")).toBe("/registro");
    expect(
      getReturnPath(
        "?returnTo=%2Fchecklist-conformidade%2F204c98a5-6e4f-4b6c-920e-b443e18f6d5f"
      )
    ).toBe(
      "/checklist-conformidade/204c98a5-6e4f-4b6c-920e-b443e18f6d5f"
    );
  });

  it("usa o Início para destinos ausentes, públicos ou externos", () => {
    expect(sanitizeInternalDestination(null)).toBe("/");
    expect(sanitizeInternalDestination("//example.com/roubo")).toBe("/");
    expect(sanitizeInternalDestination("https://example.com/roubo")).toBe("/");
    expect(sanitizeInternalDestination("/login")).toBe("/");
  });

  it("monta o redirecionamento de sessão expirada", () => {
    expect(buildLoginPath("/faq", "session-expired")).toBe(
      "/login?returnTo=%2Ffaq&reason=session-expired"
    );
  });
});

