import { describe, expect, it } from "vitest";
import type { PdfTextItem, ReconstructedPdfLine } from "../../../../types/pdfImport";
import { BradescoStatementParser } from "./BradescoStatementParser";
import { CaixaStatementParser } from "./CaixaStatementParser";
import { InterStatementParser } from "./InterStatementParser";
import { ItauStatementParser } from "./ItauStatementParser";
import { MercadoPagoStatementParser } from "./MercadoPagoStatementParser";
import { SantanderStatementParser } from "./SantanderStatementParser";

function item(text: string, x: number, pageNumber = 1): PdfTextItem { return { text, x, y: 700, width: 40, height: 10, pageNumber }; }
function line(text: string, pageNumber = 1, items: PdfTextItem[] = []): ReconstructedPdfLine { return { text, pageNumber, y: 700, items }; }
const context = (bankCode: "BRADESCO" | "MERCADO_PAGO" | "SANTANDER" | "INTER" | "ITAU" | "CAIXA", source: "PDF_TEXT" | "PDF_OCR" = "PDF_TEXT") => ({ bankCode, account: "000123-4", source, fallbackYear: 2026 } as const);

describe("parsers bancários sanitizados", () => {
  it("interpreta colunas de crédito e débito do Bradesco", () => {
    const lines = [line("Data Histórico Documento Crédito Débito Saldo", 1, [item("Crédito", 420), item("Débito", 490), item("Saldo", 550)]), line("01/04/2026 PIX RECEBIDO 100,00 150,00", 1, [item("01/04/2026", 30), item("PIX RECEBIDO", 100), item("100,00", 420), item("150,00", 550)]), line("02/04/2026 COMPRA -25,00 125,00", 1, [item("02/04/2026", 30), item("COMPRA", 100), item("-25,00", 490), item("125,00", 550)])];
    const result = BradescoStatementParser.parse(lines, context("BRADESCO")); expect(result.transactions).toHaveLength(2); expect(result.transactions.map((value) => value.direction)).toEqual(["CREDIT", "DEBIT"]);
  });

  it("usa sinal do Mercado Pago e ignora saldo", () => {
    const lines = [line("Data Descrição ID da operação Valor Saldo"), line("01-04-2026 Pagamento recebido OP100 250,00 300,00"), line("02-04-2026 Pagamento efetuado OP101 -75,00 225,00")];
    const result = MercadoPagoStatementParser.parse(lines, context("MERCADO_PAGO")); expect(result.transactions.map((value) => [value.direction, value.amount])).toEqual([["CREDIT", 250], ["DEBIT", 75]]);
  });

  it("classifica rendimento do Mercado Pago para revisão explicável", () => {
    const result = MercadoPagoStatementParser.parse([line("01-04-2026 Rendimentos 2,50 102,50")], context("MERCADO_PAGO")); expect(result.transactions[0].warnings.join(" ")).toMatch(/rendimento financeiro/i);
  });

  it("seleciona a coluna de movimentação do Santander", () => {
    const lines = [line("Conta Corrente - Movimentação"), line("01/04 PIX RECEBIDO 120,00 300,00", 1, [item("01/04", 34), item("PIX RECEBIDO", 70), item("120,00", 440), item("300,00", 524)]), line("02/04 PIX ENVIADO 40,00- 260,00", 1, [item("02/04", 34), item("PIX ENVIADO", 70), item("40,00-", 440), item("260,00", 524)]), line("SALDO EM 02/04/2026", 2)];
    const result = SantanderStatementParser.parse(lines, context("SANTANDER")); expect(result.transactions.map((value) => [value.direction, value.amount])).toEqual([["CREDIT", 120], ["DEBIT", 40]]);
  });

  it("herda data por extenso e separa movimento e saldo no Inter", () => {
    const lines = [line("7 de Fevereiro de 2026"), line('Pix recebido: "Cp :00000000-CLIENTE ALFA" R$ 50,00 R$ 101,01'), line('Pix enviado: "Cp :00000000-FORNECEDOR BETA" -R$ 35,00 R$ 66,01'), line("Saldo do dia: R$ 66,01")];
    const result = InterStatementParser.parse(lines, context("INTER")); expect(result.transactions).toHaveLength(2); expect(result.transactions[0].date).toBe("2026-02-07"); expect(result.transactions.map((value) => value.direction)).toEqual(["CREDIT", "DEBIT"]); expect(result.transactions[0].balance).toBe(101.01);
  });

  it("marca devolução do Inter com alerta", () => {
    const result = InterStatementParser.parse([line("8 de Fevereiro de 2026"), line("Pix enviado devolvido R$ 25,00 R$ 91,01")], context("INTER")); expect(result.transactions[0].warnings.join(" ")).toMatch(/devolução/i);
  });

  it("ignora rodapé e saldo diário do Inter", () => {
    const result = InterStatementParser.parse([line("8 de Fevereiro de 2026"), line("Saldo do dia: R$ 91,01"), line("Fale com a gente 0800 000 000")], context("INTER")); expect(result.transactions).toHaveLength(0);
  });

  it("interpreta salário, débito e saldo do Itaú pelas coordenadas", () => {
    const header = line("Data Lançamentos Valor Saldo", 1, [item("Data", 30), item("Lançamentos", 90), item("Valor", 400), item("Saldo", 500)]);
    const salary = line("01/04/2026 REMUNERACAO/SALARIO 1.500,00 1.700,00", 1, [item("01/04/2026", 30), item("REMUNERACAO/SALARIO", 90), item("1.500,00", 400), item("1.700,00", 500)]);
    const debit = line("02/04/2026 PAGAMENTO -100,00 1.600,00", 1, [item("02/04/2026", 30), item("PAGAMENTO", 90), item("-100,00", 400), item("1.600,00", 500)]);
    const result = ItauStatementParser.parse([header, salary, debit, line("02/04/2026 SALDO DO DIA 1.600,00")], context("ITAU")); expect(result.transactions).toHaveLength(2); expect(result.transactions.map((value) => value.direction)).toEqual(["CREDIT", "DEBIT"]);
  });

  it("alerta rendimento e estorno no Itaú", () => {
    const header = line("Data Lançamentos Valor Saldo", 1, [item("Valor", 400), item("Saldo", 500)]);
    const yieldLine = line("01/04/2026 REND PAGO APLIC AUT MAIS 3,00", 1, [item("01/04/2026", 30), item("REND PAGO APLIC AUT MAIS", 80), item("3,00", 400)]);
    const reversal = line("02/04/2026 ESTORNO 20,00", 1, [item("02/04/2026", 30), item("ESTORNO", 80), item("20,00", 400)]);
    const result = ItauStatementParser.parse([header, yieldLine, reversal], context("ITAU")); expect(result.transactions[0].warnings.join(" ")).toMatch(/rendimento/i); expect(result.transactions[1].warnings.join(" ")).toMatch(/estorno/i);
  });

  it("usa C e D no OCR sanitizado da Caixa e ignora SALDO DIA", () => {
    const lines = [line("01/04/2026 PIX RECEBIDO 100,00 C"), line("01/04/2026 PIX ENVIADO 25,00 D"), line("01/04/2026 SALDO DIA 75,00 C")];
    const result = CaixaStatementParser.parse(lines, context("CAIXA", "PDF_OCR")); expect(result.transactions.map((value) => value.direction)).toEqual(["CREDIT", "DEBIT"]); expect(result.transactions).toHaveLength(2);
  });
});
