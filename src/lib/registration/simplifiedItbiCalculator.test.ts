import { describe, expect, it } from "vitest";
import type { RegistrationCity } from "../../types/registration";
import { calculateSimplifiedItbi } from "./simplifiedItbiCalculator";

describe("calculateSimplifiedItbi - São Bernardo do Campo", () => {
  it("calcula R$ 230.000,00 com alíquota e dedução corretas", () => {
    const result = calculateSimplifiedItbi({ city: "SAO_BERNARDO_DO_CAMPO", purchasePrice: 230000 });
    expect(result).toMatchObject({ status: "CALCULATED", rate: 0.025, grossTax: 5750, fixedDeduction: 2250, estimatedItbi: 3500 });
  });

  it.each([200000, 150000])("não aplica a regra ao valor %s", (purchasePrice) => {
    const result = calculateSimplifiedItbi({ city: "SAO_BERNARDO_DO_CAMPO", purchasePrice });
    expect(result.status).toBe("RULE_NOT_APPLICABLE");
    expect(result.rate).toBeNull();
    expect(result.grossTax).toBeNull();
    expect(result.estimatedItbi).toBeNull();
    expect(result.fixedDeduction).toBe(0);
  });

  it("aplica a regra a partir de R$ 200.000,01", () => {
    const result = calculateSimplifiedItbi({ city: "SAO_BERNARDO_DO_CAMPO", purchasePrice: 200000.01 });
    expect(result.status).toBe("CALCULATED");
    expect(result.rate).toBe(0.025);
    expect(result.estimatedItbi).toBe(2750);
  });
});

describe("calculateSimplifiedItbi - Diadema", () => {
  it.each([
    [50000, 0.005, 250, "Até R$ 50.000,00"],
    [50000.01, 0.01, 500, "De R$ 50.000,01 até R$ 100.000,00"],
    [75000, 0.01, 750, "De R$ 50.000,01 até R$ 100.000,00"],
    [100000, 0.01, 1000, "De R$ 50.000,01 até R$ 100.000,00"],
    [100000.01, 0.015, 1500, "De R$ 100.000,01 até R$ 150.000,00"],
    [120000, 0.015, 1800, "De R$ 100.000,01 até R$ 150.000,00"],
    [150000, 0.015, 2250, "De R$ 100.000,01 até R$ 150.000,00"],
    [150000.01, 0.025, 3750, "Acima de R$ 150.000,00"],
    [180000, 0.025, 4500, "Acima de R$ 150.000,00"]
  ])("seleciona a faixa de %s corretamente", (purchasePrice, rate, estimatedItbi, rangeLabel) => {
    const result = calculateSimplifiedItbi({ city: "DIADEMA", purchasePrice: Number(purchasePrice) });
    expect(result).toMatchObject({ status: "CALCULATED", rate, estimatedItbi, rangeLabel });
    expect(result.fixedDeduction).toBe(0);
  });
});

describe("calculateSimplifiedItbi - validações", () => {
  it.each<RegistrationCity>(["SANTO_ANDRE", "SAO_PAULO", "GUARULHOS", "MAUA"])("não calcula a cidade %s", (city) => {
    const result = calculateSimplifiedItbi({ city, purchasePrice: 250000 });
    expect(result.status).toBe("IN_DEVELOPMENT");
    expect(result.estimatedItbi).toBeNull();
    expect(result.rate).toBeNull();
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])("rejeita o valor inválido %s", (purchasePrice) => {
    const result = calculateSimplifiedItbi({ city: "DIADEMA", purchasePrice });
    expect(result.status).toBe("INVALID_INPUT");
    expect(result.estimatedItbi).toBeNull();
  });
});
