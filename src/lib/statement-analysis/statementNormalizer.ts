import type { ParsedPdfTransaction, PdfBankCode } from "../../types/pdfImport";
import type { ExtractionMethod, NormalizedBankTransaction, SupportedBank } from "../../types/statementAnalysis";
import { normalizeText } from "../income-analysis/formatters";

export function supportedBank(bank: PdfBankCode): SupportedBank {
  return ["CAIXA", "BRADESCO", "ITAU", "SANTANDER", "INTER", "NUBANK", "MERCADO_PAGO"].includes(bank) ? bank as SupportedBank : "OTHER";
}

export function transactionFingerprint(transaction: Pick<NormalizedBankTransaction, "date" | "amount" | "direction" | "description" | "documentId">): string {
  const source = `${transaction.date}|${transaction.amount.toFixed(2)}|${transaction.direction}|${normalizeText(transaction.description).slice(0, 48)}|${transaction.documentId}`;
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) { hash ^= source.charCodeAt(index); hash = Math.imul(hash, 16777619); }
  return `tx-${(hash >>> 0).toString(16)}`;
}

export function normalizePdfTransactions(params: {
  sourceFileId: string;
  bank: PdfBankCode;
  holder: string;
  account: string;
  parserId: string;
  extractionMethod: ExtractionMethod;
  transactions: ParsedPdfTransaction[];
}): NormalizedBankTransaction[] {
  return params.transactions.flatMap((item, index) => {
    if (item.amount === null || item.direction === "UNKNOWN") return [];
    const base: NormalizedBankTransaction = {
      id: `${params.sourceFileId}-${index}`,
      sourceFileId: params.sourceFileId,
      bank: supportedBank(params.bank),
      accountHolder: params.holder,
      maskedAccount: params.account,
      date: item.date,
      time: null,
      competence: item.competence,
      description: item.description,
      counterparty: item.payer,
      amount: item.amount,
      direction: item.direction,
      balance: item.balance ?? null,
      documentId: "",
      sourcePage: item.pageNumber,
      sourceRow: null,
      parserId: params.parserId,
      extractionMethod: params.extractionMethod,
      extractionConfidence: item.confidence,
      classification: "PENDING_REVIEW",
      classificationReason: "Aguardando classificação automática.",
      classificationConfidence: 0,
      warnings: [...item.warnings],
      fingerprint: "",
    };
    if (item.classificationHint === "SAME_OWNERSHIP") {
      base.classification = "EXCLUDED_SAME_OWNER";
      base.classificationReason = "Possível transferência de mesma titularidade identificada no extrato.";
      base.classificationConfidence = 0.78;
    }
    base.fingerprint = transactionFingerprint(base);
    return [base];
  });
}
