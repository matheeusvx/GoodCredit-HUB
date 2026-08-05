import { describe, expect, it } from "vitest";
import type { StatementFileRecord } from "../../types/statementAnalysis";
import { parsePdfTransactions } from "../income-analysis/pdf/pdfTransactionParser";
import {
  detectPdfBank,
  detectPdfBankDetailed,
  selectStatementParser,
} from "../income-analysis/pdf/parsers/parserRegistry";
import {
  NUBANK_JUNE_2026_EXPECTED,
  NUBANK_JUNE_2026_SANITIZED_LINES,
} from "../income-analysis/pdf/parsers/__fixtures__/nubankJune2026Sanitized";
import { normalizePdfTransactions } from "./statementNormalizer";
import { classifyTransactions } from "./transactionClassifier";
import { calculateAutomatedIncome } from "./statementAnalysis";
import { reconciliationFromPdf } from "../../types/statementAnalysis";

const context = {
  bankCode: "NUBANK",
  account: "****0000",
  source: "PDF_TEXT",
} as const;

function parseSanitizedFixture() {
  const parsed = parsePdfTransactions(NUBANK_JUNE_2026_SANITIZED_LINES, context);
  const normalized = normalizePdfTransactions({
    sourceFileId: "sanitized-nubank-june-2026",
    bank: parsed.bankCode || "NUBANK",
    holder: "CLIENTE TESTE",
    account: "****0000",
    parserId: parsed.parserId || "nubank",
    extractionMethod: "PDF_TEXT",
    transactions: parsed.transactions,
  });
  return { parsed, normalized, classified: classifyTransactions(normalized) };
}

function amountByClassification(
  transactions: ReturnType<typeof parseSanitizedFixture>["classified"],
  classification: typeof transactions[number]["classification"]
) {
  return transactions
    .filter((transaction) => transaction.classification === classification)
    .reduce((sum, transaction) => sum + transaction.amount, 0);
}

function statementFile(
  transactions: ReturnType<typeof parseSanitizedFixture>["classified"],
  parsed: ReturnType<typeof parseSanitizedFixture>["parsed"]
): StatementFileRecord {
  return {
    id: "sanitized-nubank-june-2026",
    file: new File(["fixture sanitizada"], "nubank-sanitizado.pdf", { type: "application/pdf" }),
    name: "nubank-sanitizado.pdf",
    size: 19,
    format: "PDF",
    pageCount: 2,
    bank: "NUBANK",
    holderMasked: "C****** T****",
    holderIdentity: null,
    accountMasked: "****0000",
    periodStart: NUBANK_JUNE_2026_EXPECTED.periodStart,
    periodEnd: NUBANK_JUNE_2026_EXPECTED.periodEnd,
    documentType: "TEXT",
    needsOcr: false,
    status: "COMPLETED",
    parserId: "nubank",
    extractionMethod: "PDF_TEXT",
    transactions,
    reconciliation: reconciliationFromPdf(parsed.reconciliation, transactions.length),
    warnings: [],
    contentKind: "BANK_STATEMENT",
    platformDocument: null,
  };
}

describe("pipeline Nubank com fixture sanitizada de junho de 2026", () => {
  it("prioriza o emissor Nubank mesmo com bancos terceiros nas movimentações", () => {
    const detection = detectPdfBankDetailed(NUBANK_JUNE_2026_SANITIZED_LINES);
    expect(detection.bankCode).toBe("NUBANK");
    expect(detection.scores.NUBANK).toBeGreaterThan(detection.scores.ITAU || 0);
    expect(detectPdfBank(NUBANK_JUNE_2026_SANITIZED_LINES)).toBe("NUBANK");
    expect(selectStatementParser(context, NUBANK_JUNE_2026_SANITIZED_LINES).id).toBe("nubank");
  });

  it("preserva a identificação de um extrato realmente emitido pelo Itaú", () => {
    const lines = [
      { text: "Itaú Unibanco S.A.", pageNumber: 1, y: 760, items: [] },
      { text: "Extrato de conta corrente", pageNumber: 1, y: 738, items: [] },
      { text: "01/06/2026 PIX RECEBIDO - NU PAGAMENTOS 100,00", pageNumber: 1, y: 420, items: [] },
      { text: "02/06/2026 PIX ENVIADO - BANCO INTER 25,00", pageNumber: 1, y: 398, items: [] },
    ];
    expect(detectPdfBank(lines)).toBe("ITAU");
  });

  it("reconhece período, competência, descrições multilinhas e totais bancários", () => {
    const { parsed, normalized } = parseSanitizedFixture();
    const dates = normalized.map((transaction) => transaction.date).filter(Boolean).sort();
    const credits = normalized.filter((transaction) => transaction.direction === "CREDIT");

    expect(dates[0]).toBe(NUBANK_JUNE_2026_EXPECTED.periodStart);
    expect(dates.at(-1)).toBe(NUBANK_JUNE_2026_EXPECTED.periodEnd);
    expect(new Set(normalized.map((transaction) => transaction.competence))).toEqual(
      new Set([NUBANK_JUNE_2026_EXPECTED.competence])
    );
    expect(credits.reduce((sum, transaction) => sum + transaction.amount, 0)).toBeCloseTo(
      NUBANK_JUNE_2026_EXPECTED.bankCreditTotal,
      2
    );
    expect(parsed.reconciliation?.status).toBe("MATCHED");
    expect(parsed.transactions.some((transaction) => /total de entradas/i.test(transaction.description))).toBe(false);
    expect(parsed.transactions.some((transaction) => transaction.amount === 11_111_111)).toBe(false);
    expect(parsed.transactions.find((transaction) => transaction.amount === 4_500)?.description).toContain("BCO C6");
  });

  it("apura nove entradas e exclui resgates, reembolso e estorno", () => {
    const { classified } = parseSanitizedFixture();
    const included = classified.filter((transaction) => transaction.classification === "INCLUDED_INCOME");

    expect(included).toHaveLength(NUBANK_JUNE_2026_EXPECTED.validIncomeCount);
    expect(included.reduce((sum, transaction) => sum + transaction.amount, 0)).toBeCloseTo(
      NUBANK_JUNE_2026_EXPECTED.confirmedIncome,
      2
    );
    expect(amountByClassification(classified, "EXCLUDED_INVESTMENT_REDEMPTION")).toBeCloseTo(
      NUBANK_JUNE_2026_EXPECTED.rdbRedemptionTotal,
      2
    );
    expect(amountByClassification(classified, "EXCLUDED_REFUND")).toBeCloseTo(
      NUBANK_JUNE_2026_EXPECTED.refundTotal,
      2
    );
    expect(amountByClassification(classified, "EXCLUDED_REVERSAL")).toBeCloseTo(
      NUBANK_JUNE_2026_EXPECTED.reversalTotal,
      2
    );
  });

  it("gera junho como mês completo e mantém renda separada da conciliação bancária", () => {
    const { parsed, classified } = parseSanitizedFixture();
    const file = statementFile(classified, parsed);
    const result = calculateAutomatedIncome("CLIENTE TESTE", [file], classified);

    expect(result.months).toHaveLength(1);
    expect(result.months[0]).toMatchObject({
      competence: NUBANK_JUNE_2026_EXPECTED.competence,
      complete: true,
      reconciliationStatus: "RECONCILED",
    });
    expect(result.totalCredits).toBeCloseTo(NUBANK_JUNE_2026_EXPECTED.bankCreditTotal, 2);
    expect(result.confirmedMonthlyIncome).toBeCloseTo(NUBANK_JUNE_2026_EXPECTED.confirmedIncome, 2);
    expect(result.reconciliationStatus).toBe("RECONCILED");
  });

  it("aciona fallback controlado quando um parser incorreto retorna vazio", () => {
    const result = parsePdfTransactions(NUBANK_JUNE_2026_SANITIZED_LINES, {
      ...context,
      bankCode: "ITAU",
    });
    expect(result.parserId).toBe("nubank");
    expect(result.bankCode).toBe("NUBANK");
    expect(result.parserAudit).toMatchObject({
      requestedBank: "ITAU",
      selectedParserId: "itau",
      fallbackParserId: "nubank",
    });
  });
});
