import { describe, expect, it } from "vitest";
import { PdfParsingContext, ReconstructedPdfLine } from "../../../../types/pdfImport";
import { NubankStatementParser } from "./NubankStatementParser";

const context: PdfParsingContext = { bankCode: "NUBANK", account: "12345-6", source: "PDF_TEXT" };
const line = (text: string, pageNumber = 1, y = 100): ReconstructedPdfLine => ({ text, pageNumber, y, items: [] });

const sanitizedFixture = [
  line("Resumo do período", 1, 500),
  line("TITULAR EXEMPLO", 1, 490),
  line("CPF 000.000.000-00", 1, 480),
  line("Total de entradas + 2.550,00", 1, 470),
  line("Total de saídas - 25,00", 1, 460),
  line("Movimentações", 1, 450),
  line("01 ABR 2026 Total de entradas + 2.550,00", 1, 440),
  line("Transferência Recebida EMPRESA ALFA LTDA", 1, 430),
  line("/0001-00 - NU PAGAMENTOS - IP", 1, 420),
  line("Agência: 1 Conta: 12345-6", 1, 410),
  line("2.500,00", 1, 400),
  line("Transferência recebida pelo Pix CLIENTE BETA", 1, 390),
  line("BANCO EXEMPLO 50,00", 1, 380),
  line("Total de saídas - 25,00", 1, 370),
  line("Transferência enviada pelo Pix DESTINATÁRIO GAMA", 1, 360),
  line("BANCO EXEMPLO", 1, 350),
  line("25,00", 1, 340),
  line("Saldo do dia 2.525,00", 1, 330),
];

describe("NubankStatementParser", () => {
  it("detecta Nubank com alta confiança", () => {
    expect(NubankStatementParser.canHandle({ ...context, bankCode: "AUTO" }, "NU PAGAMENTOS Nubank Movimentações Saldo do dia")).toBeGreaterThan(0.8);
    expect(NubankStatementParser.canHandle(context, "")).toBe(1);
  });

  it("herda a data em português e separa entradas e saídas", () => {
    const result = NubankStatementParser.parse(sanitizedFixture, context);
    expect(result.transactions).toHaveLength(3);
    expect(result.transactions.map((item) => item.date)).toEqual(["2026-04-01", "2026-04-01", "2026-04-01"]);
    expect(result.transactions.map((item) => item.direction)).toEqual(["CREDIT", "CREDIT", "DEBIT"]);
  });

  it("combina descrição multilinha, mascara conta e lê valor isolado", () => {
    const result = NubankStatementParser.parse(sanitizedFixture, context);
    const transaction = result.transactions[0];
    expect(transaction.amount).toBe(2500);
    expect(transaction.description).toContain("EMPRESA ALFA LTDA");
    expect(transaction.description).toContain("Conta: ****3456");
    expect(transaction.description).not.toContain("12345-6");
  });

  it("lê valor no final da própria linha", () => {
    const result = NubankStatementParser.parse(sanitizedFixture, context);
    expect(result.transactions[1].amount).toBe(50);
    expect(result.transactions[1].description).not.toContain("50,00");
  });

  it("ignora saldos e totais e reconcilia o resumo", () => {
    const result = NubankStatementParser.parse(sanitizedFixture, context);
    expect(result.transactions.some((item) => /saldo|total de/i.test(item.description))).toBe(false);
    expect(result.reconciliation).toMatchObject({
      statementCreditTotal: 2550,
      parsedCreditTotal: 2550,
      creditDifference: 0,
      statementDebitTotal: 25,
      parsedDebitTotal: 25,
      debitDifference: 0,
      status: "MATCHED",
    });
  });

  it("mantém uma movimentação aberta entre páginas e ignora o novo cabeçalho", () => {
    const fixture = [
      line("Total de entradas + 100,00", 1, 500),
      line("Total de saídas - 0,00", 1, 490),
      line("Movimentações", 1, 480),
      line("06 MAI 2026 Total de entradas + 100,00", 1, 470),
      line("Transferência Recebida EMPRESA DELTA", 1, 10),
      line("Nubank", 2, 500),
      line("2 de 2", 2, 490),
      line("BANCO EXEMPLO", 2, 480),
      line("100,00", 2, 470),
    ];
    const result = NubankStatementParser.parse(fixture, context);
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0]).toMatchObject({ pageNumber: 1, amount: 100, date: "2026-05-06" });
    expect(result.transactions[0].description).toContain("BANCO EXEMPLO");
    expect(result.transactions[0].description).not.toContain("2 de 2");
  });

  it("classifica reembolso como crédito e boleto como débito", () => {
    const fixture = [
      line("Movimentações"),
      line("01 JUN 2026 Total de entradas + 30,00"),
      line("Reembolso recebido pelo Pix LOJA EXEMPLO 30,00"),
      line("Total de saídas - 91,17"),
      line("Pagamento de boleto efetuado EMPRESA EXEMPLO 91,17"),
    ];
    const result = NubankStatementParser.parse(fixture, context);
    expect(result.transactions.map((item) => [item.direction, item.amount])).toEqual([["CREDIT", 30], ["DEBIT", 91.17]]);
  });

  it("sugere mesma titularidade sem excluir automaticamente", () => {
    const fixture = [
      line("TITULAR EXEMPLO"),
      line("CPF 000.000.000-00"),
      line("Movimentações"),
      line("01 JUN 2026 Total de entradas + 100,00"),
      line("Transferência Recebida TITULAR EXEMPLO - BANCO EXEMPLO"),
      line("100,00"),
    ];
    const transaction = NubankStatementParser.parse(fixture, context).transactions[0];
    expect(transaction.classificationHint).toBe("SAME_OWNERSHIP");
    expect(transaction.selected).toBe(true);
    expect(transaction.warnings.join(" ")).toContain("mesma titularidade");
  });

  it("envia movimentação sem valor para revisão", () => {
    const fixture = [
      line("Movimentações"),
      line("01 JUN 2026 Total de entradas + 150,00"),
      line("Transferência Recebida EMPRESA SEM VALOR"),
      line("Transferência recebida pelo Pix CLIENTE COM VALOR 150,00"),
    ];
    const result = NubankStatementParser.parse(fixture, context);
    expect(result.transactions).toHaveLength(2);
    expect(result.transactions[0].amount).toBeNull();
    expect(result.transactions[0].selected).toBe(false);
    expect(result.ambiguousLines.length).toBeGreaterThan(0);
  });
});
