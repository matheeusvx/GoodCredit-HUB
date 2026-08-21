import { describe, expect, it } from "vitest";
import type {
  PlatformIncomeDocument,
  PlatformProvider,
} from "../../../../types/platformIncome";
import { calculateAutomatedIncome } from "../../../statement-analysis/statementAnalysis";
import {
  calculatePlatformIncomeResult,
  getPlatformIncomeMethod,
} from "./calculatePlatformIncome";

function document(
  platform: PlatformProvider,
  competence: string,
  grossIncome: number
): PlatformIncomeDocument {
  return {
    id: `${platform}-${competence}`,
    fileName: `${competence}.pdf`,
    platform,
    documentPeriod: "MONTHLY",
    holderName: "TITULAR TESTE",
    holderCpf: "00000000000",
    competence,
    periodStart: `${competence}-01`,
    periodEnd: `${competence}-28`,
    grossIncome,
    netIncome: null,
    grossIncomeEvidence: [],
    documentConfidence: 0.95,
    extractionMethod: "PDF_TEXT",
    parserId: "test-fixture",
    pageCount: 1,
    isValidForIncomeCalculation: true,
    invalidReason: null,
    warnings: [],
  };
}

function documents(
  platform: PlatformProvider,
  values: number[]
): PlatformIncomeDocument[] {
  return values.map((value, index) =>
    document(platform, `2026-${String(index + 1).padStart(2, "0")}`, value)
  );
}

describe("regra de renda dos comprovantes de plataforma", () => {
  it.each(["UBER", "99", "RAPPI"] as const)(
    "%s usa a média aritmética das quatro rendas brutas",
    (platform) => {
      const result = calculatePlatformIncomeResult(
        documents(platform, [4000, 5000, 3500, 4500])
      );

      expect(result).toMatchObject({
        status: "COMPLETE",
        consideredGrossIncome: 4250,
        determiningCompetence: null,
        calculationMethod: "FOUR_MONTH_AVERAGE",
        canSendToSimulation: true,
      });
    }
  );

  it("calcula corretamente quatro rendas iguais", () => {
    expect(
      calculatePlatformIncomeResult(documents("UBER", [1000, 1000, 1000, 1000]))
        ?.consideredGrossIncome
    ).toBe(1000);
  });

  it("mantém precisão monetária na média de valores com centavos", () => {
    expect(
      calculatePlatformIncomeResult(
        documents("UBER", [2500.5, 3100.75, 2800.25, 3600.5])
      )?.consideredGrossIncome
    ).toBe(3000.5);
  });

  it("seleciona somente os quatro comprovantes mais recentes", () => {
    const result = calculatePlatformIncomeResult(
      documents("UBER", [1000, 2000, 3000, 4000, 5000])
    );

    expect(result?.selectedDocuments.map((item) => item.competence)).toEqual([
      "2026-05",
      "2026-04",
      "2026-03",
      "2026-02",
    ]);
    expect(result?.consideredGrossIncome).toBe(3500);
    expect(result?.ignoredDocuments).toEqual(
      expect.arrayContaining([expect.objectContaining({ competence: "2026-01" })])
    );
  });

  it("não define renda definitiva com apenas três documentos", () => {
    const result = calculatePlatformIncomeResult(
      documents("UBER", [4000, 5000, 3500])
    );

    expect(result).toMatchObject({
      status: "INSUFFICIENT_DOCUMENTS",
      consideredGrossIncome: null,
      canSendToSimulation: false,
    });
  });

  it("propaga a média uma única vez para o resultado e para a simulação", () => {
    const platformResult = calculatePlatformIncomeResult(
      documents("UBER", [4000, 5000, 3500, 4500])
    );
    expect(platformResult).not.toBeNull();

    const result = calculateAutomatedIncome("Teste", [], [], platformResult);

    expect(result.confirmedIncomeTotal).toBe(4250);
    expect(result.potentialIncomeTotal).toBe(4250);
    expect(result.confirmedMonthlyIncome).toBe(4250);
    expect(result.potentialMonthlyIncome).toBe(4250);
    expect(result.explanation).toEqual(
      expect.arrayContaining([
        "Total das rendas brutas: R$ 17.000,00.",
        "Renda considerada: R$ 4.250,00.",
        "Conforme a regra aplicável, a renda considerada corresponde à média aritmética das quatro rendas brutas.",
      ])
    );
  });

  it("prepara iFood para a média sem declarar suporte documental", () => {
    expect(getPlatformIncomeMethod("IFOOD")).toMatchObject({
      calculationMethod: "FOUR_MONTH_AVERAGE",
    });
  });

  it("preserva a regra anterior da Lalamove", () => {
    const result = calculatePlatformIncomeResult(
      documents("LALAMOVE", [4000, 5000, 3500, 4500])
    );

    expect(result).toMatchObject({
      consideredGrossIncome: 3500,
      determiningCompetence: "2026-03",
      calculationMethod: "LOWEST_GROSS_INCOME",
    });
  });
});
