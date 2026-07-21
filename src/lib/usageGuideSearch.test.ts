import { describe, expect, it } from "vitest";
import { USAGE_GUIDES } from "../data/usageGuideData";
import { filterUsageGuides, normalizeUsageGuideSearch } from "./usageGuideSearch";
import { buildUsageGuideInstructions } from "./usageGuideInstructions";

describe("usage guide data and search", () => {
  it("documents exactly the nine active modules in navigation order", () => {
    expect(USAGE_GUIDES).toHaveLength(9);
    expect(new Set(USAGE_GUIDES.map((guide) => guide.id)).size).toBe(9);
    expect(new Set(USAGE_GUIDES.map((guide) => guide.anchor)).size).toBe(9);
    expect(USAGE_GUIDES.map((guide) => guide.id)).toEqual([
      "home",
      "amortization",
      "financing-simulation",
      "pro-soluto",
      "registration",
      "income-analysis",
      "document-checklist",
      "fgts",
      "faq"
    ]);
  });

  it.each([
    ["FGTS", "fgts"],
    ["amortizacao", "amortization"],
    ["PRÓ-SOLUTO", "pro-soluto"],
    ["extrato", "income-analysis"],
    ["documentos", "document-checklist"]
  ])("finds %s without case or accent sensitivity", (query, expectedId) => {
    expect(filterUsageGuides(USAGE_GUIDES, query).some((guide) => guide.id === expectedId)).toBe(true);
  });

  it.each(["Registro", "ITBI", "SBC", "Diadema", "custas", "cartório", "Santo Andre", "Sao Paulo", "Guarulhos", "Maua", "aliquota", "deducao", "em desenvolvimento"])(
    "finds the Registration guide using %s",
    (query) => {
      expect(filterUsageGuides(USAGE_GUIDES, query).map((guide) => guide.id)).toContain("registration");
    }
  );

  it("defines the Registration anchor, destination and copied instructions", () => {
    const guide = USAGE_GUIDES.find((item) => item.id === "registration");
    expect(guide).toMatchObject({ anchor: "registro", destination: "registration", icon: "registration" });
    expect(guide).toBeDefined();

    const instructions = buildUsageGuideInstructions(guide!);
    expect(instructions).toContain("Cidades disponíveis: São Bernardo do Campo e Diadema.");
    expect(instructions).toContain("Passo a passo:");
    expect(instructions).toContain("Principais cuidados:");
    expect(instructions).toContain("A Simulação de Custas está em desenvolvimento");
  });

  it("normalizes accents and duplicate spaces", () => {
    expect(normalizeUsageGuideSearch("  SIMULAÇÃO   de Crédito ")).toBe("simulacao de credito");
  });

  it("does not use forbidden guide names", () => {
    const serialized = JSON.stringify(USAGE_GUIDES);
    expect(serialized).not.toContain("Guia dos Módulos");
    expect(serialized).not.toContain("Manual dos Módulos");
  });
});
