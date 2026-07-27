import { describe, expect, it } from "vitest";
import { resolveHubView } from "./hubNavigation";

describe("rotas internas do GoodCredit Hub", () => {
  it.each([
    ["/", "home"],
    ["/amortizacao", "amortization"],
    ["/simulacao-financiamento", "simulation"],
    ["/pro-soluto", "pro-soluto"],
    ["/registro", "registration"],
    ["/apuracao-renda", "income-analysis"],
    ["/checklist-documental", "checklist"],
    ["/checklist-conformidade", "compliance-checklist"],
    ["/checklist-conformidade/novo", "compliance-checklist"],
    [
      "/checklist-conformidade/204c98a5-6e4f-4b6c-920e-b443e18f6d5f",
      "compliance-checklist"
    ],
    ["/uso-fgts", "fgts"],
    ["/guia-de-uso", "usage-guide"],
    ["/faq", "faq"]
  ])("resolve %s", (pathname, expected) => {
    expect(resolveHubView(pathname)).toBe(expected);
  });

  it("envia rota desconhecida para a página interna 404", () => {
    expect(resolveHubView("/ferramenta-inexistente")).toBe("not-found");
  });
});
