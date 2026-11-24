import { describe, expect, it, vi } from "vitest";
import type { StatementFileRecord } from "../../types/statementAnalysis";
import { reconciliationFromPdf } from "../../types/statementAnalysis";
import { SantanderStatementParser } from "../income-analysis/pdf/parsers/SantanderStatementParser";
import { santanderSynthetic, syntheticLine } from "../income-analysis/pdf/parsers/__fixtures__/santanderSynthetic";
import { normalizePdfTransactions } from "./statementNormalizer";
import { classifyTransactions } from "./transactionClassifier";
import { createRelatedPartyIdentity } from "./relatedPartyClassifier";
import { calculateAutomatedIncome } from "./statementAnalysis";
import { markDuplicateTransactions } from "./duplicateDetector";
import { reviewTransaction } from "./transactionReview";
import { generateStatementAnalysisPdf } from "./statementPdfReport";

function scenario(month: 2 | 3 | 4) {
  const parsed = SantanderStatementParser.parse(santanderSynthetic(month), { bankCode: "SANTANDER", account: "****0000", source: "PDF_TEXT" });
  const transactions = normalizePdfTransactions({ sourceFileId: `synthetic-${month}`, bank: "SANTANDER", holder: "PESSOA TITULAR TESTE", account: "****0000", parserId: "santander", extractionMethod: "PDF_TEXT", transactions: parsed.transactions });
  const file = { id: `synthetic-${month}`, bank: "SANTANDER", parserId: "santander", transactions, periodStart: parsed.statementMetadata?.periodStart, periodEnd: parsed.statementMetadata?.periodEnd, reconciliation: reconciliationFromPdf(parsed.reconciliation, transactions.length) } as StatementFileRecord;
  return { parsed, file, transactions };
}
const parties = { accountHolder: createRelatedPartyIdentity("PESSOA TITULAR TESTE"), spouses: [] };
const setup = () => { const scenarios = ([2, 3, 4] as const).map(scenario); return { files: scenarios.map((s) => s.file), transactions: classifyTransactions(scenarios.flatMap((s) => s.transactions), parties) }; };

describe("Santander: movimentação e renda independentes", () => {
  it("ignora uma cópia integral de página identificada pelo banco, preservando páginas distintas com pagamentos iguais", () => {
    const page = ["fevereiro/2026", "Conta Corrente", "Movimentação", "Data Descrição Nº Documento Movimento (R$) Saldo (R$)", "01/02 PIX RECEBIDO - 100,00", "PAGADOR SINTETICO", "Pagina: 1/3"].map((text) => syntheticLine(text));
    const copy = page.map((line) => ({ ...line, pageNumber: 2 }));
    const continuation = [syntheticLine("02/02 PIX RECEBIDO - 200,00", 3), syntheticLine("PAGADOR SINTETICO", 3), syntheticLine("SALDO EM 28/02 300,00", 3)];
    const context = { bankCode: "SANTANDER", source: "PDF_TEXT", account: "" } as const;
    const duplicated = SantanderStatementParser.parse([...page, ...copy, ...continuation], context);
    expect(duplicated.transactions.map((t) => t.amount)).toEqual([100, 200]);
    expect(duplicated.reconciliation?.warnings?.join(" ")).toContain("repetidas integralmente");
    const distinct = copy.map((line) => line.text === "Pagina: 1/3" ? { ...line, text: "Pagina: 2/3" } : line);
    expect(SantanderStatementParser.parse([...page, ...distinct, ...continuation], context).transactions.map((t) => t.amount)).toEqual([100, 100, 200]);
  });
  it("não troca a data de contabilização pela data impressa no detalhe de uma compra", () => {
    const parsed = SantanderStatementParser.parse([
      syntheticLine("fevereiro/2026"), syntheticLine("Conta Corrente"), syntheticLine("Movimentação"),
      syntheticLine("09/02 DEBITO VISA ELECTRON BRASIL 123456 50,00-"),
      syntheticLine("07/02 LOJA SINTETICA"), syntheticLine("PIX RECEBIDO - 5.000,00"),
      syntheticLine("PAGADOR SINTETICO"), syntheticLine("SALDO EM 28/02 4.950,00"),
    ], { bankCode: "SANTANDER", source: "PDF_TEXT", account: "" });
    expect(parsed.transactions[1]).toMatchObject({ date: "2026-02-09", amount: 5000, payer: "PAGADOR SINTETICO", description: "PIX RECEBIDO PAGADOR SINTETICO" });
    expect(parsed.transactions[0].description).toContain("LOJA SINTETICA");
  });
  it("exporta os mesmos totais normalizados e a trilha individual no PDF", async () => {
    const { files, transactions } = setup();
    const reviewed = transactions.map((t) => t.classification !== "PENDING_REVIEW" ? t : reviewTransaction(t, { classification: t.amount === 5000 || (t.competence === "2026-04" && t.amount === 166.32) ? "EXCLUDED_OTHER" : "INCLUDED_INCOME" }, "Decisão sintética documentada"));
    const result = calculateAutomatedIncome("TESTE", files, reviewed, null, parties, { "2026-04": 5490 });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Sem logo na fixture")));
    try {
      const pdf = await generateStatementAnalysisPdf(result, false);
      const output = pdf.output();
      expect(output).toContain("5.470,00");
      expect(output).toContain("5.490,00");
      expect(output).toContain("20,00");
      expect(output).toContain("2026-02-01");
      expect(output).toContain("5.000,00");
      expect(output).toContain("Revisão");
      expect(pdf.getNumberOfPages()).toBeGreaterThan(1);
    } finally { vi.unstubAllGlobals(); }
  });
  it("concilia créditos, débitos e saldos oficiais; preserva todas as competências e contrapartes", () => {
    const { files, transactions } = setup();
    const result = calculateAutomatedIncome("TESTE", files, transactions);
    expect(result.months.map((m) => m.depositTransferCredits)).toEqual([8346.32, 5266.32, 5636.32]);
    expect(result.months.map((m) => m.creditCount)).toEqual([14, 19, 20]);
    expect(result.months.map((m) => m.financialYield)).toEqual([0.24, 0.06, 0.07]);
    expect(result.completeMonths).toBe(3);
    expect(result.confirmedMonthlyIncome).toBe(0);
    expect(result.canSendToSimulation).toBe(false);
    expect(result.potentialMonthlyIncome).toBeCloseTo((8346.32 + 4266.32 + 5636.32) / 3);
    expect(files.every((file) => file.reconciliation.status === "RECONCILED" && file.reconciliation.difference === 0)).toBe(true);
    expect(transactions.filter((t) => t.direction === "CREDIT" && /PIX/.test(t.description))).toHaveLength(47);
    expect(transactions.find((t) => t.amount === 5000)).toMatchObject({ classification: "PENDING_REVIEW", counterparty: "PAGADOR SINTETICO A", sourcePage: 1 });
    expect(transactions.find((t) => t.amount === 5000)?.classificationReason).toContain("excepcional");
  });

  it("reproduz decisões justificadas de fevereiro/março e sinaliza R$20 em abril sem alterar R$280", () => {
    const { files, transactions } = setup();
    const reviewed = transactions.map((t) => t.classification !== "PENDING_REVIEW" ? t : reviewTransaction(t, { classification: t.amount === 5000 || (t.competence === "2026-04" && t.amount === 166.32) ? "EXCLUDED_OTHER" : "INCLUDED_INCOME" }, t.amount === 5000 ? "Crédito pontual sem comprovação profissional, excluído nesta simulação." : t.amount === 166.32 && t.competence === "2026-04" ? "Exclusão hipotética para comparar a planilha; contraparte recorrente ainda exige comprovação." : "Recebimento profissional comprovado nesta fixture sintética."));
    const result = calculateAutomatedIncome("TESTE", files, reviewed, null, parties, { "2026-02": 3346.32, "2026-03": 4266.32, "2026-04": 5490 });
    expect(result.months.map((m) => m.confirmedIncome)).toEqual([3346.32, 4266.32, 5470]);
    expect(result.months.map((m) => m.managerDifference)).toEqual([0, 0, 20]);
    expect(result.confirmedMonthlyIncome).toBeCloseTo(4360.88);
    expect(result.explanation.join(" ")).toMatch(/R\$\s20,00/);
    expect(reviewed.find((t) => t.competence === "2026-04" && t.amount === 280)?.amount).toBe(280);
    expect(classifyTransactions(reviewed, parties)).toEqual(reviewed);
    expect(result.months[1].sameOwnerCredits).toBe(1000);
  });

  it("não confirma PIX recorrente sem comprovação nem exclui crédito pelo valor", () => {
    const { transactions } = setup();
    expect(transactions.filter((t) => t.direction === "CREDIT" && t.classification !== "EXCLUDED_SAME_OWNER" && t.classification !== "EXCLUDED_FINANCIAL_YIELD").every((t) => t.classification === "PENDING_REVIEW")).toBe(true);
    const item = transactions[0];
    expect(() => reviewTransaction(item, { classification: "INCLUDED_INCOME" }, " ")).toThrow(/Justificativa/);
    const excluded = reviewTransaction(item, { classification: "EXCLUDED_OTHER" }, "Sem comprovação");
    const included = reviewTransaction(excluded, { classification: "INCLUDED_INCOME" }, "Comprovante apresentado");
    expect(included.reviewAudit).toHaveLength(2);
    expect(included.reviewAudit?.[1]).toMatchObject({ previousClassification: "EXCLUDED_OTHER", newClassification: "INCLUDED_INCOME", reason: "Comprovante apresentado" });
  });

  it("deduplica sobreposição por ocorrência, preservando pagamentos iguais e contas distintas", () => {
    const { transactions } = scenario(2);
    const a = { ...transactions[2], fingerprint: "same", sourceRow: 20 };
    const b = { ...a, id: "b", sourceRow: 21 };
    const copy = [a, b].map((t) => ({ ...t, id: `${t.id}-copy`, sourceFileId: "copy" }));
    const result = markDuplicateTransactions([a, b, ...copy, { ...a, id: "other-account", maskedAccount: "****9999", sourceFileId: "other" }]);
    expect(result.filter((t) => t.classification === "EXCLUDED_DUPLICATE")).toHaveLength(2);
    expect(result[2].linkedTransactionId).toBe(a.id);
    expect(result[3].linkedTransactionId).toBe(b.id);
    expect(result[4].classification).toBe("PENDING_REVIEW");
    const consolidated = calculateAutomatedIncome("TESTE", [scenario(2).file], markDuplicateTransactions([...transactions, ...transactions.map((t) => ({ ...t, id: `${t.id}-copy`, sourceFileId: "copy" }))]));
    expect(consolidated.totalCredits).toBeCloseTo(8346.56);
    expect(markDuplicateTransactions([a, { ...a, id: "same-position" }])[1].classification).toBe("EXCLUDED_DUPLICATE");
    expect(markDuplicateTransactions([{ ...a, documentId: "REFERENCE" }, { ...b, documentId: "REFERENCE", sourcePage: 2 }])[1].classification).toBe("EXCLUDED_DUPLICATE");
  });

  it("preserva continuação de página, ignora outras seções e sinaliza divergência oficial", () => {
    const lines = santanderSynthetic(4);
    lines.splice(lines.findIndex((l) => l.pageNumber === 2), 0, syntheticLine("Movimentação (continuação)", 2));
    const parsed = SantanderStatementParser.parse(lines, { bankCode: "SANTANDER", source: "PDF_OCR", account: "" });
    expect(parsed.transactions.filter((t) => t.direction === "CREDIT")).toHaveLength(20);
    const badSummary = lines.map((l) => l.text.includes("Total de Créditos") ? { ...l, text: "Total de Créditos 5.646,39" } : l);
    expect(SantanderStatementParser.parse(badSummary, { bankCode: "SANTANDER", source: "PDF_TEXT", account: "" }).reconciliation?.status).toBe("DIVERGENT");
    expect(reconciliationFromPdf({ statementCreditTotal: 110, parsedCreditTotal: 100, creditDifference: -10, statementDebitTotal: 60, parsedDebitTotal: 50, debitDifference: -10, balanceDifference: 0, status: "DIVERGENT" }).status).toBe("DIVERGENCE");
  });

  it("usa apenas meses completos com decisões concluídas para a média confirmada", () => {
    const { files, transactions } = setup();
    const reviewed = transactions.map((t) => t.competence === "2026-03" && t.classification === "PENDING_REVIEW" ? reviewTransaction(t, { classification: "INCLUDED_INCOME" }, "Comprovação sintética") : t);
    const result = calculateAutomatedIncome("TESTE", files, reviewed);
    expect(result.confirmedMonthlyIncome).toBe(4266.32);
    const partialFiles = files.map((f) => ({ ...f, periodStart: "2026-03-02" }));
    expect(calculateAutomatedIncome("TESTE", partialFiles, reviewed).confirmedMonthlyIncome).toBe(0);
  });
});
