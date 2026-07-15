import { describe, expect, it } from "vitest";
import { BankTransaction } from "../../../types/incomeAnalysis";
import { PdfParsingContext, PdfTextItem, ReconstructedPdfLine } from "../../../types/pdfImport";
import { parsePdfDate } from "./pdfDateParser";
import { flagPdfDuplicates } from "./pdfDuplicateDetector";
import { reconstructPdfLines } from "./pdfLineReconstructor";
import { parsePdfTransactions } from "./pdfTransactionParser";
import { extractTransactionValue, parsePdfMoney } from "./pdfValueParser";

const context: PdfParsingContext = { bankCode: "AUTO", account: "12345-6", fallbackYear: 2026, source: "PDF_TEXT" };
const line = (text: string, pageNumber = 1, y = 100): ReconstructedPdfLine => ({ text, pageNumber, y, items: [] });

describe("normalização de valores do PDF", () => {
  it.each([
    ["R$ 1.500,00", 1500],
    ["1500.00", 1500],
    ["-1.500,00", -1500],
    ["1.500,00 C", 1500],
    ["1.500,00 D", 1500],
  ])("interpreta %s", (raw, expected) => expect(parsePdfMoney(raw)).toBe(expected));

  it("distingue sufixos de crédito e débito", () => {
    expect(extractTransactionValue("PIX 1.500,00 C")?.direction).toBe("CREDIT");
    expect(extractTransactionValue("BOLETO 450,00 D")?.direction).toBe("DEBIT");
  });
});

describe("normalização de datas do PDF", () => {
  it.each([
    ["10/07/2026", "2026-07-10"],
    ["10/07/26", "2026-07-10"],
    ["10/07", "2026-07-10"],
    ["2026-07-10", "2026-07-10"],
  ])("interpreta %s", (raw, expected) => expect(parsePdfDate(raw, 2026)?.date).toBe(expected));

  it("não inventa o ano quando não há contexto", () => expect(parsePdfDate("10/07")?.date).toBeNull());
});

describe("reconstrução por coordenadas", () => {
  it("agrupa itens pela linha e ordena colunas", () => {
    const items: PdfTextItem[] = [
      { text: "2.500,00 C", pageNumber: 1, x: 300, y: 500, width: 60, height: 10 },
      { text: "01/06/2026", pageNumber: 1, x: 10, y: 501, width: 55, height: 10 },
      { text: "PIX RECEBIDO", pageNumber: 1, x: 90, y: 500, width: 90, height: 10 },
    ];
    const result = reconstructPdfLines(items);
    expect(result).toHaveLength(1);
    expect(result[0].text).toContain("01/06/2026");
    expect(result[0].text.indexOf("PIX")).toBeLessThan(result[0].text.indexOf("2.500"));
  });
});

describe("parser genérico de extratos", () => {
  it("interpreta créditos, débitos e transferências sem definir renda", () => {
    const result = parsePdfTransactions([
      line("01/06/2026 PIX RECEBIDO CLIENTE A 2.500,00 C", 1, 300),
      line("02/06/2026 PAGAMENTO BOLETO 450,00 D", 1, 290),
      line("03/06/2026 TRANSFERÊNCIA ENTRE CONTAS 1.000,00 C", 1, 280),
    ], context);
    expect(result.transactions.map((item) => item.direction)).toEqual(["CREDIT", "DEBIT", "CREDIT"]);
    expect(result.transactions.every((item) => item.amount !== null)).toBe(true);
  });

  it("combina descrição quebrada e valor na linha seguinte", () => {
    const result = parsePdfTransactions([
      line("01/06/2026 PIX RECEBIDO", 1, 300),
      line("CLIENTE EMPRESA ABC", 1, 290),
      line("2.500,00 C", 1, 280),
    ], context);
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0].description).toContain("CLIENTE EMPRESA ABC");
    expect(result.transactions[0].amount).toBe(2500);
  });

  it("ignora saldos e totais", () => {
    const result = parsePdfTransactions([
      line("SALDO ANTERIOR 8.500,00", 1, 310),
      line("01/06/2026 PIX RECEBIDO 2.000,00 C", 1, 300),
      line("SALDO DO DIA 10.500,00", 1, 290),
      line("TOTAL DE CRÉDITOS 2.000,00", 1, 280),
    ], context);
    expect(result.transactions).toHaveLength(1);
    expect(result.ignoredLines).toHaveLength(3);
  });

  it("mantém linha sem valor para revisão com baixa confiança", () => {
    const result = parsePdfTransactions([line("01/06/2026 MOVIMENTAÇÃO SEM VALOR")], context);
    expect(result.transactions[0].amount).toBeNull();
    expect(result.transactions[0].confidence).toBeLessThan(0.6);
    expect(result.transactions[0].selected).toBe(false);
  });
});

describe("duplicidade", () => {
  it("sinaliza e desmarca uma possível movimentação já importada", () => {
    const existing: BankTransaction = { id: "existing-1", selected: false, date: "2026-06-01", competence: "2026-06", description: "PIX RECEBIDO CLIENTE A", payer: "", reference: "", type: "CREDIT", amount: 2500, account: "****3456", participant: "", classification: "REVIEW", reason: "GENERIC_DESCRIPTION", note: "", classificationSource: "SUGGESTED" };
    const parsed = parsePdfTransactions([line("01/06/2026 PIX RECEBIDO CLIENTE A 2.500,00 C")], context).transactions;
    const flagged = flagPdfDuplicates(parsed, [existing]);
    expect(flagged[0].duplicateOf).toBe("existing-1");
    expect(flagged[0].selected).toBe(false);
  });
});
