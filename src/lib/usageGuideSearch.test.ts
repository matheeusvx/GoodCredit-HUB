import { describe, expect, it } from "vitest";
import { USAGE_GUIDES } from "../data/usageGuideData";
import { filterUsageGuides, normalizeUsageGuideSearch } from "./usageGuideSearch";

describe("usage guide data and search", () => {
  it("documents exactly the eight active modules", () => {
    expect(USAGE_GUIDES).toHaveLength(8);
    expect(new Set(USAGE_GUIDES.map((guide) => guide.id)).size).toBe(8);
    expect(new Set(USAGE_GUIDES.map((guide) => guide.anchor)).size).toBe(8);
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

  it("normalizes accents and duplicate spaces", () => {
    expect(normalizeUsageGuideSearch("  SIMULAÇÃO   de Crédito ")).toBe("simulacao de credito");
  });

  it("does not use forbidden guide names", () => {
    const serialized = JSON.stringify(USAGE_GUIDES);
    expect(serialized).not.toContain("Guia dos Módulos");
    expect(serialized).not.toContain("Manual dos Módulos");
  });
});
