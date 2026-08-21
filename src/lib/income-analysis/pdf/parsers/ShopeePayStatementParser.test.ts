import { describe, expect, it } from "vitest";
import type { PdfParsingContext } from "../../../../types/pdfImport";
import type { StatementFileRecord } from "../../../../types/statementAnalysis";
import { calculatePlatformIncomeResult } from "../../platforms/rules/calculatePlatformIncome";
import { normalizePdfTransactions } from "../../../statement-analysis/statementNormalizer";
import { markDuplicateTransactions } from "../../../statement-analysis/duplicateDetector";
import { markTransitoryPairs } from "../../../statement-analysis/relatedTransferMatcher";
import { classifyTransactions } from "../../../statement-analysis/transactionClassifier";
import { calculateAutomatedIncome } from "../../../statement-analysis/statementAnalysis";
import { createRelatedPartyIdentity } from "../../../statement-analysis/relatedPartyClassifier";
import { getBankLabel, getParserLabel } from "../../../statement-analysis/presentationLabels";
import { detectPdfBankDetailed } from "./parserRegistry";
import { ShopeePayStatementParser } from "./ShopeePayStatementParser";
import { SHOPEE_PAY_STATEMENT_SANITIZED } from "./__fixtures__/shopeePayStatementSanitized";

const context: PdfParsingContext = {
  bankCode: "SHOPEE_PAY",
  account: "000000000000",
  source: "PDF_TEXT",
};

function parsedAndClassified() {
  const parsed = ShopeePayStatementParser.parse(
    SHOPEE_PAY_STATEMENT_SANITIZED,
    context
  );
  let transactions = normalizePdfTransactions({
    sourceFileId: "shopee-file",
    bank: "SHOPEE_PAY",
    holder: "C***** T**** S*****",
    account: "****0000",
    parserId: "shopee-pay",
    extractionMethod: "PDF_TEXT",
    transactions: parsed.transactions,
  });
  transactions = markDuplicateTransactions(transactions);
  transactions = markTransitoryPairs(transactions);
  transactions = classifyTransactions(transactions);
  return { parsed, transactions };
}

function file(): StatementFileRecord {
  return {
    id: "shopee-file",
    file: {} as File,
    name: "shopee-sanitizado.pdf",
    size: 1000,
    format: "PDF",
    pageCount: 2,
    bank: "SHOPEE_PAY",
    holderMasked: "C***** T**** S*****",
    holderIdentity: createRelatedPartyIdentity("CLIENTE TESTE SHOPEE"),
    accountMasked: "****0000",
    periodStart: "2026-02-27",
    periodEnd: "2026-05-28",
    documentType: "TEXT",
    needsOcr: false,
    status: "COMPLETED",
    parserId: "shopee-pay",
    extractionMethod: "PDF_TEXT",
    transactions: [],
    reconciliation: {
      status: "NO_SUMMARY",
      creditTotal: 0,
      debitTotal: 0,
      statementCreditTotal: null,
      statementDebitTotal: null,
      openingBalance: null,
      closingBalance: null,
      difference: null,
      method: "NOT_AVAILABLE",
      warnings: [],
    },
    warnings: [],
    contentKind: "BANK_STATEMENT",
    platformDocument: null,
  };
}

describe("ShopeePayStatementParser", () => {
  it("detecta somente a combinação institucional e estrutural do ShopeePay", () => {
    expect(detectPdfBankDetailed(SHOPEE_PAY_STATEMENT_SANITIZED)).toMatchObject({
      bankCode: "SHOPEE_PAY",
      confidence: expect.any(Number),
    });
    expect(
      detectPdfBankDetailed(
        "Pedido Shopee confirmado. Nota fiscal e etiqueta de envio disponíveis."
      ).bankCode
    ).not.toBe("SHOPEE_PAY");
  });

  it("extrai titular, CPF, conta e período do extrato", () => {
    const metadata = ShopeePayStatementParser.parse(
      SHOPEE_PAY_STATEMENT_SANITIZED,
      context
    ).statementMetadata;

    expect(metadata).toEqual({
      holderName: "CLIENTE TESTE SHOPEE",
      holderCpf: "000.000.000-00",
      agency: "0001",
      account: "000000000000",
      periodStart: "2026-02-27",
      periodEnd: "2026-05-28",
    });
  });

  it("extrai créditos, débitos, horários e valores monetários", () => {
    const parsed = ShopeePayStatementParser.parse(
      SHOPEE_PAY_STATEMENT_SANITIZED,
      context
    );
    const credit = parsed.transactions.find((item) => item.amount === 1075 && item.direction === "CREDIT");
    const debit = parsed.transactions.find((item) => item.amount === 1075 && item.direction === "DEBIT");
    const cents = parsed.transactions.find((item) => item.amount === 2357.01);

    expect(credit).toMatchObject({
      date: "2026-03-12",
      time: "11:53:33",
      description: "Saldo creditado",
    });
    expect(debit).toMatchObject({
      date: "2026-03-12",
      time: "20:37:49",
      description: "Transferência Pix Enviada Para",
    });
    expect(cents?.amount).toBe(2357.01);
    expect(parsed.transactions).toHaveLength(24);
  });

  it("preserva o padrão no OCR e elimina uma movimentação repetida", () => {
    const duplicated = [
      ...SHOPEE_PAY_STATEMENT_SANITIZED,
      {
        text: "05-03-2026 13:51:47 Saldo creditado R$810,00",
        pageNumber: 2,
        y: 30,
        items: [],
      },
    ];
    const parsed = ShopeePayStatementParser.parse(duplicated, {
      ...context,
      source: "PDF_OCR",
    });

    expect(parsed.transactions).toHaveLength(24);
    expect(parsed.transactions.every((item) => item.source === "PDF_OCR")).toBe(true);
    expect(parsed.transactions.every((item) => item.confidence <= 0.81)).toBe(true);
  });

  it("expõe os rótulos amigáveis do emissor e do parser", () => {
    expect(getBankLabel("SHOPEE_PAY")).toBe("ShopeePay");
    expect(getParserLabel("shopee-pay")).toBe("ShopeePay");
  });

  it("não transforma o par crédito/Pix em renda líquida ou movimento transitório", () => {
    const { transactions } = parsedAndClassified();
    const credits = transactions.filter((item) => item.direction === "CREDIT");
    const debits = transactions.filter((item) => item.direction === "DEBIT");

    expect(credits).toHaveLength(12);
    expect(credits.every((item) => item.classification === "INCLUDED_INCOME")).toBe(true);
    expect(credits.every((item) => item.classificationReason.includes("ShopeePay"))).toBe(true);
    expect(debits).toHaveLength(12);
    expect(debits.every((item) => item.classification === "EXCLUDED_OTHER")).toBe(true);
  });

  it("não duplica a renda quando o mesmo extrato é enviado duas vezes", () => {
    const parsed = ShopeePayStatementParser.parse(
      SHOPEE_PAY_STATEMENT_SANITIZED,
      context
    );
    const normalizeFile = (sourceFileId: string) => normalizePdfTransactions({
      sourceFileId,
      bank: "SHOPEE_PAY",
      holder: "C***** T**** S*****",
      account: "****0000",
      parserId: "shopee-pay",
      extractionMethod: "PDF_TEXT",
      transactions: parsed.transactions,
    });
    const transactions = classifyTransactions(markDuplicateTransactions([
      ...normalizeFile("shopee-file-a"),
      ...normalizeFile("shopee-file-b"),
    ]));
    const result = calculateAutomatedIncome(
      "Processo Shopee",
      [
        { ...file(), id: "shopee-file-a", transactions },
        { ...file(), id: "shopee-file-b", transactions },
      ],
      transactions
    );

    expect(transactions.filter((item) => item.classification === "EXCLUDED_DUPLICATE")).toHaveLength(24);
    expect(result.confirmedIncomeTotal).toBe(20488.33);
    expect(result.confirmedMonthlyIncome).toBe(6829.44);
  });

  it("apura os três meses completos sem aplicar a heurística bancária de bordas", () => {
    const { transactions } = parsedAndClassified();
    const result = calculateAutomatedIncome(
      "Processo Shopee",
      [{ ...file(), transactions }],
      transactions
    );

    expect(result.analysisType).toBe("SHOPEE_PAY");
    expect(result.months.map((month) => [month.competence, month.confirmedIncome])).toEqual([
      ["2026-03", 7347.01],
      ["2026-04", 6250.11],
      ["2026-05", 6891.21],
    ]);
    expect(result.months.every((month) => month.complete)).toBe(true);
    expect(result.months.some((month) => month.competence === "2026-02")).toBe(false);
    expect(result.confirmedIncomeTotal).toBe(20488.33);
    expect(result.confirmedMonthlyIncome).toBe(6829.44);
    expect(result.potentialMonthlyIncome).toBe(6829.44);
    expect(result.canSendToSimulation).toBe(true);
    expect(result.totalDebits).toBeGreaterThan(0);
    expect(result.explanation.join(" ")).toContain("não foram consideradas como renda nem subtraídas");
  });

  it("exige três competências e usa somente as três mais recentes", () => {
    const { transactions } = parsedAndClassified();
    const withoutMay = transactions.filter((item) => item.competence !== "2026-05");
    const incomplete = calculateAutomatedIncome(
      "Processo Shopee",
      [{ ...file(), status: "REVIEW_REQUIRED", transactions: withoutMay }],
      withoutMay
    );
    expect(incomplete.canSendToSimulation).toBe(false);
    expect(incomplete.confirmedMonthlyIncome).toBe(0);

    const february = {
      ...transactions[0],
      id: "february-credit",
      date: "2026-02-05",
      competence: "2026-02",
      amount: 999,
      fingerprint: "february-credit",
    };
    const latest = calculateAutomatedIncome(
      "Processo Shopee",
      [{ ...file(), transactions: [...transactions, february] }],
      [...transactions, february]
    );
    expect(latest.months.map((month) => month.competence)).toEqual([
      "2026-03",
      "2026-04",
      "2026-05",
    ]);
  });

  it("não mistura ShopeePay com comprovante mensal de outra plataforma", () => {
    const { transactions } = parsedAndClassified();
    const platformResult = calculatePlatformIncomeResult([], true);
    expect(platformResult).toBeNull();

    const mixedPlatformResult = calculatePlatformIncomeResult([
      {
        id: "uber",
        fileName: "uber.pdf",
        platform: "UBER",
        documentPeriod: "MONTHLY",
        holderName: "CLIENTE TESTE",
        holderCpf: "00000000000",
        competence: "2026-05",
        periodStart: "2026-05-01",
        periodEnd: "2026-05-31",
        grossIncome: 1000,
        netIncome: null,
        grossIncomeEvidence: [],
        documentConfidence: 0.9,
        extractionMethod: "PDF_TEXT",
        parserId: "uber",
        pageCount: 1,
        isValidForIncomeCalculation: true,
        invalidReason: null,
        warnings: [],
      },
    ], transactions.length > 0);
    expect(mixedPlatformResult?.status).toBe("REVIEW_REQUIRED");
    expect(mixedPlatformResult?.canSendToSimulation).toBe(false);
  });
});
