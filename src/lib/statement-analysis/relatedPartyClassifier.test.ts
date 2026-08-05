import { describe, expect, it } from "vitest";
import type { IncomeAnalysisParties, NormalizedBankTransaction, SupportedBank } from "../../types/statementAnalysis";
import type { ReconstructedPdfLine } from "../../types/pdfImport";
import { calculateAutomatedIncome } from "./statementAnalysis";
import { classifyTransactions } from "./transactionClassifier";
import {
  createRelatedPartyIdentity,
  detectCounterpartyEntityType,
  extractAccountHolderIdentity,
  normalizePartyName,
} from "./relatedPartyClassifier";
import { BRADESCO_RELATED_PARTY_EXPECTED, BRADESCO_RELATED_PARTY_SANITIZED } from "./__fixtures__/bradescoRelatedPartySanitized";

const parties: IncomeAnalysisParties = {
  accountHolder: createRelatedPartyIdentity("MARIA HELENA SOUZA", "52998224725"),
  spouses: [createRelatedPartyIdentity("JOAO PEDRO SILVA", "11144477735")],
};

function transaction(id: string, description: string, amount = 100, patch: Partial<NormalizedBankTransaction> = {}): NormalizedBankTransaction {
  return {
    id,
    sourceFileId: "sanitized-bradesco",
    bank: "BRADESCO",
    accountHolder: "M**** H***** S****",
    maskedAccount: "****1234",
    date: "2026-04-01",
    time: null,
    competence: "2026-04",
    description,
    counterparty: "",
    amount,
    direction: "CREDIT",
    balance: null,
    documentId: "",
    sourcePage: 1,
    sourceRow: null,
    parserId: "bradesco",
    extractionMethod: "PDF_TEXT",
    extractionConfidence: 0.95,
    classification: "PENDING_REVIEW",
    classificationReason: "",
    classificationConfidence: 0,
    warnings: [],
    fingerprint: `fp-${id}`,
    ...patch,
  };
}

describe("classificação compartilhada de partes relacionadas", () => {
  it("prioriza o campo institucional Nome sobre texto genérico com Cliente", () => {
    const line = (text: string, y: number): ReconstructedPdfLine => ({ pageNumber: 1, y, text, items: [] });
    const identity = extractAccountHolderIdentity([
      line("Cliente Bradesco, consulte os canais de atendimento", 100),
      line("Nome: MARIA HELENA SOUZA", 90),
      line("Agência: 0001 Conta: 1234-5", 80),
    ]);
    expect(identity?.normalizedName).toBe("MARIA HELENA SOUZA");
  });

  it("normaliza acentos, prefixos e espaços sem remover ME", () => {
    expect(normalizePartyName("  Remet. Ângela   Paula Torteli  ")).toBe("ANGELA PAULA TORTELI");
    expect(normalizePartyName("Rem: Maria Helena Souza ME")).toBe("MARIA HELENA SOUZA ME");
  });

  it("encerra o remetente antes da próxima data ou movimentação concatenada", () => {
    const result = classifyTransactions([
      transaction("multiline", "PIX RECEBIDO REM: MARIA HELENA SOUZA 04/04/2026 PIX ENVIADO OUTRO DESTINATARIO"),
    ], parties);
    expect(result[0].counterpartyIdentity?.normalizedName).toBe("MARIA HELENA SOUZA");
    expect(result[0].classification).toBe("EXCLUDED_SAME_OWNER");
  });

  it("reconhece o nome completo no bloco quando o banco concatena colunas", () => {
    const result = classifyTransactions([
      transaction("block", "HISTORICO MARIA HELENA SOUZA DOCUMENTO 123 RECEBIMENTO TED D"),
    ], parties);
    expect(result[0].classification).toBe("EXCLUDED_SAME_OWNER");
    expect(result[0].relatedPartyClassification?.evidence).toContain("Nome completo do titular identificado no bloco da movimentação recebida.");
  });

  it("mantém empresa homônima no classificador mesmo quando o nome vem no bloco", () => {
    const result = classifyTransactions([
      transaction("company-block", "HISTORICO MARIA HELENA SOUZA ME DOCUMENTO 123 PIX RECEBIDO"),
    ], parties);
    expect(result[0].classification).toBe("PENDING_REVIEW");
    expect(result[0].relatedPartyClassification?.decision).toBe("CONTINUE_COMPANY_CLASSIFICATION");
  });

  it.each(["ME", "MEI", "EPP", "LTDA", "S/A", "SLU", "EIRELI", "TECNOLOGIA", "CORRETORA"])("detecta o indicador empresarial %s", (indicator) => {
    expect(detectCounterpartyEntityType({ documentType: "UNKNOWN", normalizedName: normalizePartyName(`EMPRESA EXEMPLO ${indicator}`) })).toBe("COMPANY");
  });

  it("não interpreta ME dentro de ALMEIDA", () => {
    expect(detectCounterpartyEntityType({ documentType: "UNKNOWN", normalizedName: normalizePartyName("MARIA ALMEIDA SOUZA") })).toBe("INDIVIDUAL");
  });

  it("aplica a fixture Bradesco sanitizada sem excluir empresas homônimas", () => {
    const result = classifyTransactions(BRADESCO_RELATED_PARTY_SANITIZED.map((item, index) => transaction(String(index), item.description, item.amount)), parties);
    expect(result[0].classification).toBe("EXCLUDED_SAME_OWNER");
    expect(result[1].classification).toBe("EXCLUDED_SAME_OWNER");
    expect(result[2].classification).toBe("EXCLUDED_SPOUSE");
    expect(result[3].relatedPartyClassification?.decision).toBe("CONTINUE_COMPANY_CLASSIFICATION");
    expect(result[4].relatedPartyClassification?.decision).toBe("CONTINUE_COMPANY_CLASSIFICATION");
    expect(result[5].relatedPartyClassification?.decision).toBe("CONTINUE_COMPANY_CLASSIFICATION");
    expect(result[6].classification).toBe("PENDING_REVIEW");
    expect(result.slice(0, 2).reduce((sum, item) => sum + item.amount, 0)).toBe(BRADESCO_RELATED_PARTY_EXPECTED.sameHolderAmount);
    expect(result[2].amount).toBe(BRADESCO_RELATED_PARTY_EXPECTED.spouseAmount);
  });

  it("usa CPF igual mesmo quando o nome do remetente é diferente", () => {
    const result = classifyTransactions([transaction("cpf", "PIX RECEBIDO REM: NOME ABREVIADO", 100, { counterpartyIdentity: { rawName: "NOME ABREVIADO", normalizedName: "NOME ABREVIADO", documentType: "CPF", documentNumber: "52998224725", entityType: "INDIVIDUAL", confidence: 0.99 } })], parties);
    expect(result[0].classification).toBe("EXCLUDED_SAME_OWNER");
  });

  it("dá precedência ao CNPJ sobre nome igual ao titular", () => {
    const result = classifyTransactions([transaction("cnpj", "PIX RECEBIDO REM: MARIA HELENA SOUZA", 100, { counterpartyIdentity: { rawName: "MARIA HELENA SOUZA", normalizedName: "MARIA HELENA SOUZA", documentType: "CNPJ", documentNumber: "11222333000181", entityType: "COMPANY", confidence: 0.99 }, classification: "EXCLUDED_SAME_OWNER" })], parties);
    expect(result[0].classification).toBe("PENDING_REVIEW");
    expect(result[0].relatedPartyClassification?.decision).toBe("CONTINUE_COMPANY_CLASSIFICATION");
  });

  it("não infere cônjuge sem informação explícita", () => {
    const withoutSpouse: IncomeAnalysisParties = { accountHolder: parties.accountHolder, spouses: [] };
    const result = classifyTransactions([transaction("spouse", "PIX RECEBIDO REM: JOAO PEDRO SILVA")], withoutSpouse);
    expect(result[0].classification).toBe("PENDING_REVIEW");
    expect(result[0].relatedPartyClassification?.relationship).toBe("THIRD_PARTY");
  });

  it("não usa sobrenome ou primeiro nome como prova de identidade", () => {
    const result = classifyTransactions([transaction("different", "PIX RECEBIDO REM: MARIA APARECIDA SOUZA")], parties);
    expect(result[0].classification).toBe("PENDING_REVIEW");
    expect(result[0].relatedPartyClassification?.relationship).toBe("THIRD_PARTY");
  });

  it("encaminha nome truncado sem cobertura suficiente para revisão", () => {
    const result = classifyTransactions([transaction("truncated", "PIX RECEBIDO REM: MARIA HELENA...")], parties);
    expect(result[0].classification).toBe("PENDING_REVIEW");
    expect(result[0].relatedPartyClassification?.decision).toBe("REVIEW_REQUIRED");
  });

  it("não promove revisão de parte relacionada por outra regra de renda", () => {
    const result = classifyTransactions([
      transaction("truncated-income", "REMUNERACAO PIX RECEBIDO REM: MARIA HELENA..."),
    ], parties);
    expect(result[0].classification).toBe("PENDING_REVIEW");
    expect(result[0].relatedPartyClassification?.decision).toBe("REVIEW_REQUIRED");
  });

  it("mantém exclusões no total bancário, mas fora da renda", () => {
    const classified = classifyTransactions(BRADESCO_RELATED_PARTY_SANITIZED.map((item, index) => transaction(String(index), item.description, item.amount)), parties);
    const result = calculateAutomatedIncome("Processo sanitizado", [], classified, null, parties);
    expect(result.totalCredits).toBeCloseTo(7153.12, 2);
    expect(result.totalExcluded).toBeCloseTo(2158, 2);
    expect(result.confirmedIncomeTotal).toBe(0);
    expect(result.relatedPartySummary.sameHolderAmount).toBe(1258);
    expect(result.relatedPartySummary.spouseAmount).toBe(900);
    expect(result.canSendToSimulation).toBe(false);
  });

  it.each<SupportedBank>(["BRADESCO", "NUBANK", "ITAU", "CAIXA", "SANTANDER", "INTER", "MERCADO_PAGO"])("aplica a regra central ao banco %s", (bank) => {
    const result = classifyTransactions([transaction(bank, "RECEBIMENTO TED D REMET. MARIA HELENA SOUZA", 500, { bank, parserId: bank.toLowerCase() })], parties);
    expect(result[0].classification).toBe("EXCLUDED_SAME_OWNER");
  });
});
