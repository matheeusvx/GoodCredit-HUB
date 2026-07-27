import { describe, expect, it } from "vitest";
import type { NormalizedBankTransaction, StatementFileRecord } from "../../types/statementAnalysis";
import { reconciliationFromPdf } from "../../types/statementAnalysis";
import { calculateAutomatedIncome } from "./statementAnalysis";
import { classifyTransactions } from "./transactionClassifier";
import { markDuplicateTransactions } from "./duplicateDetector";
import { matchInternalTransfers, markTransitoryPairs } from "./relatedTransferMatcher";

function tx(id: string, patch: Partial<NormalizedBankTransaction> = {}): NormalizedBankTransaction { return { id, sourceFileId: "file-a", bank: "NUBANK", accountHolder: "TITULAR TESTE", maskedAccount: "****1234", date: "2026-04-01", time: null, competence: "2026-04", description: "Pix recebido", counterparty: "CLIENTE ALFA", amount: 100, direction: "CREDIT", balance: null, documentId: "", sourcePage: 1, sourceRow: null, parserId: "fixture", extractionMethod: "PDF_TEXT", extractionConfidence: 0.95, classification: "PENDING_REVIEW", classificationReason: "", classificationConfidence: 0, warnings: [], fingerprint: `${id}-fp`, ...patch }; }

describe("análise consolidada sanitizada", () => {
  it("inclui salário e exclui reembolso e rendimento", () => { const result = classifyTransactions([tx("a", { description: "REMUNERACAO SALARIO" }), tx("b", { description: "Reembolso recebido" }), tx("c", { description: "Rendimento de aplicação" })]); expect(result.map((item) => item.classification)).toEqual(["INCLUDED_INCOME", "EXCLUDED_REFUND", "EXCLUDED_FINANCIAL_YIELD"]); });
  it("só usa pessoa relacionada após cadastro explícito", () => { const result = classifyTransactions([tx("a", { counterparty: "PESSOA BETA" })], [{ id: "r", name: "PESSOA BETA", relationship: "Familiar" }]); expect(result[0].classification).toBe("EXCLUDED_RELATED_PERSON"); });
  it("inclui recebimento externo recorrente em três meses", () => { const result = classifyTransactions([tx("a"), tx("b", { date: "2026-05-01", competence: "2026-05" }), tx("c", { date: "2026-06-01", competence: "2026-06" })]); expect(result.every((item) => item.classification === "INCLUDED_INCOME")).toBe(true); });
  it("marca duplicidades do mesmo lançamento em arquivos diferentes", () => { const result = markDuplicateTransactions([tx("a", { fingerprint: "same" }), tx("b", { sourceFileId: "file-b", fingerprint: "same" })]); expect(result[1].classification).toBe("EXCLUDED_DUPLICATE"); });
  it("preserva lançamentos legítimos repetidos dentro do mesmo PDF", () => { const result = markDuplicateTransactions([tx("a", { fingerprint: "same", amount: 135 }), tx("b", { fingerprint: "same", amount: 135 })]); expect(result.every((item) => item.classification === "PENDING_REVIEW")).toBe(true); });
  it("vincula transferências entre contas analisadas", () => { const result = matchInternalTransfers([tx("a"), tx("b", { sourceFileId: "file-b", direction: "DEBIT", maskedAccount: "****9999" })]); expect(result.every((item) => item.classification === "EXCLUDED_INTERNAL_TRANSFER")).toBe(true); expect(result[0].linkedTransactionId).toBe("b"); });
  it("vincula entrada e saída transitória da mesma contraparte", () => { const result = markTransitoryPairs([tx("a"), tx("b", { direction: "DEBIT" })]); expect(result.every((item) => item.classification === "EXCLUDED_TRANSITORY_MOVEMENT")).toBe(true); });
  it("não marca uma análise vazia como conciliada", () => {
    const reconciliation = reconciliationFromPdf({
      statementCreditTotal: 0,
      parsedCreditTotal: 0,
      creditDifference: 0,
      statementDebitTotal: 0,
      parsedDebitTotal: 0,
      debitDifference: 0,
      status: "MATCHED",
    }, 0);
    const file = {
      id: "empty",
      transactions: [],
      reconciliation,
    } as unknown as StatementFileRecord;
    const result = calculateAutomatedIncome("", [file], []);
    expect(reconciliation.status).toBe("NO_SUMMARY");
    expect(result.reconciliationStatus).toBe("NO_SUMMARY");
    expect(result.explanation.join(" ")).toContain("nenhuma movimentação");
  });
});
