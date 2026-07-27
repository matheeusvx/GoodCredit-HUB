import { describe, expect, it } from "vitest";
import type {
  PlatformDocumentDetection,
  PlatformIncomeDocument,
} from "../../../types/platformIncome";
import { detectPlatformDocument } from "./detectPlatformDocument";
import {
  UBER_ANNUAL_FIXTURE,
  UBER_MONTHLY_FIXTURES,
  createUberMonthlyFixture,
} from "./__fixtures__/uberIncomeFixtures";
import { parsePlatformIncomeDocument } from "./parsers/platformParserRegistry";
import { calculatePlatformIncomeResult } from "./rules/calculatePlatformIncome";
import { calculateAutomatedIncome } from "../../statement-analysis/statementAnalysis";

function parseFixture(
  lines: ReturnType<typeof createUberMonthlyFixture>,
  id: string
): PlatformIncomeDocument {
  const detection = detectPlatformDocument(lines);
  return parsePlatformIncomeDocument(lines, {
    id,
    fileName: `${id}.pdf`,
    extractionMethod: "PDF_TEXT",
    pageCount: 4,
  }, detection);
}

describe("comprovantes de rendimentos da Uber", () => {
  it("detecta o documento institucional mesmo com banco citado no conteúdo", () => {
    const detection = detectPlatformDocument(UBER_MONTHLY_FIXTURES[0]);
    expect(detection.platform).toBe("UBER");
    expect(detection.confidence).toBeGreaterThanOrEqual(0.75);
  });

  it("não confunde uma movimentação bancária isolada com comprovante da Uber", () => {
    const detection = detectPlatformDocument(
      "Transferência recebida UBER DO BRASIL via Itaú Unibanco"
    );
    expect(detection.platform).toBeNull();
  });

  it("extrai competência, período e renda bruta sem usar o valor líquido", () => {
    const march = parseFixture(UBER_MONTHLY_FIXTURES[0], "march");
    expect(march).toMatchObject({
      platform: "UBER",
      documentPeriod: "MONTHLY",
      competence: "2026-03",
      periodStart: "2026-03-01",
      periodEnd: "2026-03-31",
      grossIncome: 12018.45,
      isValidForIncomeCalculation: true,
    });
    expect(march.netIncome).not.toBe(march.grossIncome);
    expect(march.grossIncomeEvidence.length).toBeGreaterThanOrEqual(2);
  });

  it("extrai todas as competências e rendas brutas esperadas", () => {
    const parsed = UBER_MONTHLY_FIXTURES.map((fixture, index) =>
      parseFixture(fixture, `month-${index}`)
    );
    expect(parsed.map((document) => [document.competence, document.grossIncome])).toEqual([
      ["2026-03", 12018.45],
      ["2026-04", 5783.10],
      ["2026-05", 9234.20],
      ["2026-06", 930.93],
    ]);
  });

  it("reconhece o resumo anual, mas não o aceita como comprovante mensal", () => {
    const annual = parseFixture(UBER_ANNUAL_FIXTURE, "annual");
    expect(annual.documentPeriod).toBe("ANNUAL");
    expect(annual.grossIncome).toBe(112301.89);
    expect(annual.isValidForIncomeCalculation).toBe(false);
    expect(annual.invalidReason).toContain("anual");
  });

  it("usa o menor bruto dos quatro comprovantes mais recentes", () => {
    const documents = UBER_MONTHLY_FIXTURES.map((fixture, index) =>
      parseFixture(fixture, `month-${index}`)
    );
    const result = calculatePlatformIncomeResult(documents);
    expect(result).toMatchObject({
      status: "COMPLETE",
      consideredGrossIncome: 930.93,
      determiningCompetence: "2026-06",
      canSendToSimulation: true,
    });
    expect(result?.selectedDocuments.map((document) => document.competence)).toEqual([
      "2026-06",
      "2026-05",
      "2026-04",
      "2026-03",
    ]);
  });

  it("entrega a menor renda bruta ao resultado consolidado e à simulação", () => {
    const documents = UBER_MONTHLY_FIXTURES.map((fixture, index) =>
      parseFixture(fixture, `month-${index}`)
    );
    const platformResult = calculatePlatformIncomeResult(documents);
    expect(platformResult).not.toBeNull();
    const result = calculateAutomatedIncome(
      "Processo teste",
      [],
      [],
      platformResult
    );
    expect(result.analysisType).toBe("PLATFORM_INCOME");
    expect(result.confirmedMonthlyIncome).toBe(930.93);
    expect(result.confirmedIncomeTotal).toBe(930.93);
    expect(result.canSendToSimulation).toBe(true);
  });

  it("ignora o resumo anual e nunca divide o total por doze", () => {
    const documents = [
      ...UBER_MONTHLY_FIXTURES.map((fixture, index) =>
        parseFixture(fixture, `month-${index}`)
      ),
      parseFixture(UBER_ANNUAL_FIXTURE, "annual"),
    ];
    const result = calculatePlatformIncomeResult(documents);
    expect(result?.consideredGrossIncome).toBe(930.93);
    expect(result?.ignoredDocuments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ documentPeriod: "ANNUAL", grossIncome: 112301.89 }),
      ])
    );
  });

  it("usa apenas os quatro meses mais recentes quando há meses adicionais", () => {
    const documents = [
      parseFixture(createUberMonthlyFixture("Fevereiro", 28, 800), "february"),
      ...UBER_MONTHLY_FIXTURES.map((fixture, index) =>
        parseFixture(fixture, `month-${index}`)
      ),
    ];
    const result = calculatePlatformIncomeResult(documents);
    expect(result?.selectedDocuments.map((document) => document.competence)).toEqual([
      "2026-06",
      "2026-05",
      "2026-04",
      "2026-03",
    ]);
    expect(result?.consideredGrossIncome).toBe(930.93);
    expect(result?.ignoredDocuments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ competence: "2026-02" }),
      ])
    );
  });

  it("bloqueia menos de quatro comprovantes mensais", () => {
    const documents = UBER_MONTHLY_FIXTURES.slice(0, 3).map((fixture, index) =>
      parseFixture(fixture, `month-${index}`)
    );
    const result = calculatePlatformIncomeResult(documents);
    expect(result?.status).toBe("INSUFFICIENT_DOCUMENTS");
    expect(result?.canSendToSimulation).toBe(false);
  });

  it("deduplica a mesma competência com o mesmo valor", () => {
    const documents = UBER_MONTHLY_FIXTURES.map((fixture, index) =>
      parseFixture(fixture, `month-${index}`)
    );
    documents.push(parseFixture(UBER_MONTHLY_FIXTURES[3], "june-copy"));
    const result = calculatePlatformIncomeResult(documents);
    expect(result?.status).toBe("COMPLETE");
    expect(result?.selectedDocuments).toHaveLength(4);
    expect(result?.ignoredDocuments.some((document) =>
      document.invalidReason?.includes("duplicado")
    )).toBe(true);
  });

  it("bloqueia valores diferentes na mesma competência", () => {
    const documents = UBER_MONTHLY_FIXTURES.map((fixture, index) =>
      parseFixture(fixture, `month-${index}`)
    );
    documents.push(parseFixture(createUberMonthlyFixture("Junho", 30, 1000), "june-conflict"));
    const result = calculatePlatformIncomeResult(documents);
    expect(result?.status).toBe("DUPLICATE_COMPETENCE");
    expect(result?.canSendToSimulation).toBe(false);
  });

  it("bloqueia divergência interna entre os valores brutos do documento", () => {
    const divergent = createUberMonthlyFixture("Junho", 30, 930.93).map((line) =>
      line.text.includes("Ganhos brutos totais")
        ? { ...line, text: "Ganhos brutos totais R$ 1.000,00" }
        : line
    );
    const parsed = parseFixture(divergent, "divergent");
    expect(parsed.isValidForIncomeCalculation).toBe(false);
    expect(parsed.invalidReason).toContain("divergentes");
  });

  it("bloqueia titulares diferentes e conjuntos mistos", () => {
    const documents = UBER_MONTHLY_FIXTURES.map((fixture, index) =>
      parseFixture(fixture, `month-${index}`)
    );
    documents[3] = {
      ...documents[3],
      holderCpf: "11122233344",
      holderName: "OUTRO TITULAR",
    };
    expect(calculatePlatformIncomeResult(documents)?.status).toBe("HOLDER_MISMATCH");
    expect(calculatePlatformIncomeResult(documents.slice(0, 3), true)?.status).toBe(
      "REVIEW_REQUIRED"
    );
    const mixedPlatforms = documents.map((document, index) =>
      index === 0 ? { ...document, platform: "99" as const } : document
    );
    expect(calculatePlatformIncomeResult(mixedPlatforms)?.status).toBe("REVIEW_REQUIRED");
  });

  it("alerta quando as quatro competências não são consecutivas", () => {
    const documents = [
      parseFixture(createUberMonthlyFixture("Janeiro", 31, 4100), "january"),
      parseFixture(UBER_MONTHLY_FIXTURES[1], "april"),
      parseFixture(UBER_MONTHLY_FIXTURES[2], "may"),
      parseFixture(UBER_MONTHLY_FIXTURES[3], "june"),
    ];
    const result = calculatePlatformIncomeResult(documents);
    expect(result?.status).toBe("COMPLETE");
    expect(result?.warnings.join(" ")).toContain("não consecutivas");
  });

  it("mantém arquitetura de revisão para plataformas sem layout validado", () => {
    const detection: PlatformDocumentDetection = {
      platform: "99",
      confidence: 0.85,
      signals: ["Comprovante de repasse", "Resumo de ganhos"],
    };
    const parsed = parsePlatformIncomeDocument([], {
      id: "99-document",
      fileName: "99-document.pdf",
      extractionMethod: "PDF_TEXT",
      pageCount: 1,
    }, detection);
    expect(parsed.platform).toBe("99");
    expect(parsed.isValidForIncomeCalculation).toBe(false);
  });
});
