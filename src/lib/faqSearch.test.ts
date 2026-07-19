import { describe, expect, it } from "vitest";
import { FAQ_ITEMS } from "../data/faqData";
import { filterFaqItems, normalizeSearchText } from "./faqSearch";

describe("FAQ content integrity", () => {
  it("contains exactly 50 numbered, unique and complete items", () => {
    expect(FAQ_ITEMS).toHaveLength(50);
    expect(FAQ_ITEMS.map((item) => item.number)).toEqual(Array.from({ length: 50 }, (_, index) => index + 1));
    expect(new Set(FAQ_ITEMS.map((item) => item.id)).size).toBe(50);
    expect(new Set(FAQ_ITEMS.map((item) => item.question)).size).toBe(50);
    expect(FAQ_ITEMS.every((item) => item.answer.trim().length > 0)).toBe(true);
    expect(FAQ_ITEMS.every((item) => item.sourcePage >= 2 && item.sourcePage <= 13)).toBe(true);
  });
});

describe("FAQ search", () => {
  it("normalizes accents, case and duplicated spaces", () => {
    expect(normalizeSearchText("  CRÉDITO   Imobiliário ")).toBe("credito imobiliario");
  });

  it.each(["FGTS", "renda informal", "construcao", "CRÉDITO REPROVADO"])(
    "finds related items for %s",
    (query) => {
      expect(filterFaqItems(FAQ_ITEMS, query, "ALL").length).toBeGreaterThan(0);
    }
  );

  it("filters by category", () => {
    const results = filterFaqItems(FAQ_ITEMS, "", "CONSTRUCTION");
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((item) => item.category === "CONSTRUCTION")).toBe(true);
  });

  it("combines category and text search", () => {
    const results = filterFaqItems(FAQ_ITEMS, "terreno", "CONSTRUCTION");
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((item) => item.category === "CONSTRUCTION")).toBe(true);
  });

  it("restores all items after clearing the search", () => {
    expect(filterFaqItems(FAQ_ITEMS, "", "ALL")).toHaveLength(50);
  });

  it("finds an item by its original number", () => {
    const results = filterFaqItems(FAQ_ITEMS, "50", "ALL");
    expect(results.some((item) => item.number === 50)).toBe(true);
  });
});
