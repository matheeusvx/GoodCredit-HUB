import type { IncomeAnalysisParties, NormalizedBankTransaction } from "../../types/statementAnalysis";
import { normalizeText } from "../income-analysis/formatters";
import { applyRelatedPartyIncomeRule, createRelatedPartyIdentity } from "./relatedPartyClassifier";

type Decision = Pick<NormalizedBankTransaction, "classification" | "classificationReason" | "classificationConfidence">;
const decision = (classification: Decision["classification"], classificationReason: string, classificationConfidence: number): Decision => ({ classification, classificationReason, classificationConfidence });

export function classifyTransaction(transaction: NormalizedBankTransaction): Decision {
  if (transaction.direction === "DEBIT") return decision("EXCLUDED_OTHER", "Débito identificado; não compõe renda.", 1);
  if (transaction.classification !== "PENDING_REVIEW") return decision(transaction.classification, transaction.classificationReason, transaction.classificationConfidence);
  const text = normalizeText(`${transaction.description} ${transaction.counterparty}`);
  if (/rendimento|rend pago aplic|juros|correcao monetaria|rentabilidade/.test(text)) return decision("EXCLUDED_FINANCIAL_YIELD", "Rendimento financeiro não operacional.", 0.96);
  if (/resgate|aplicacao|investimento|baixa de investimento/.test(text)) return decision("EXCLUDED_INVESTMENT_REDEMPTION", "Resgate ou baixa de investimento.", 0.94);
  if (/reembolso/.test(text)) return decision("EXCLUDED_REFUND", "Reembolso identificado.", 0.95);
  if (/estorno|devolucao|pix enviado devolvido/.test(text)) return decision("EXCLUDED_REVERSAL", "Estorno ou devolução identificada.", 0.96);
  if (/emprestimo|credito pessoal|credito contratado|capital de giro/.test(text)) return decision("EXCLUDED_LOAN", "Crédito contratado ou empréstimo.", 0.94);
  if (/venda de (veiculo|imovel|bem)|alienacao/.test(text)) return decision("EXCLUDED_ASSET_SALE", "Possível venda pontual de bem.", 0.78);
  if (/aporte|capital proprio/.test(text)) return decision("EXCLUDED_TRANSITORY_MOVEMENT", "Possível aporte de capital próprio.", 0.8);
  if (/salario|remuneracao|pro[- ]?labore|benef inss|comissao|honorarios|receita profissional/.test(text)) return decision("INCLUDED_INCOME", "Renda profissional ou remuneração identificada.", 0.94);
  if (/pagamento recebido|cobranca recebida|recebimento de cliente/.test(text)) return decision("INCLUDED_INCOME", "Recebimento profissional identificado.", 0.87);
  if (
    transaction.parserId === "nubank"
    && /^(credito em conta|transferencia recebida)/.test(normalizeText(transaction.description))
  ) {
    return decision(
      "INCLUDED_INCOME",
      "Entrada bancária recebida considerada na apuração; não caracteriza salário automaticamente.",
      0.82
    );
  }
  if (transaction.extractionConfidence < 0.65) return decision("PENDING_REVIEW", "Extração com baixa confiança.", transaction.extractionConfidence);
  return decision("PENDING_REVIEW", "Crédito sem origem recorrente confirmada.", 0.48);
}

function effectiveParties(transactions: NormalizedBankTransaction[], parties?: IncomeAnalysisParties): IncomeAnalysisParties {
  if (parties?.accountHolder || parties?.spouses.length) return parties;
  const holder = transactions.map((item) => item.accountHolder).find((value) => value && !value.includes("*") && normalizeText(value) !== "nao identificado");
  return { accountHolder: holder ? createRelatedPartyIdentity(holder) : null, spouses: parties?.spouses || [] };
}

export function classifyTransactions(transactions: NormalizedBankTransaction[], parties?: IncomeAnalysisParties): NormalizedBankTransaction[] {
  const analysisParties = effectiveParties(transactions, parties);
  const initially = transactions.map((item) => {
    const relatedPartyResult = applyRelatedPartyIncomeRule(item, analysisParties);
    if (relatedPartyResult.relatedPartyClassification?.decision === "REVIEW_REQUIRED") return relatedPartyResult;
    return { ...relatedPartyResult, ...classifyTransaction(relatedPartyResult) };
  });
  const recurrence = new Map<string, Set<string>>();
  initially.filter((item) => item.direction === "CREDIT" && item.counterparty && item.competence && ["INCLUDED_INCOME", "PENDING_REVIEW"].includes(item.classification) && item.relatedPartyClassification?.decision !== "REVIEW_REQUIRED").forEach((item) => {
    const key = normalizeText(item.counterparty); const months = recurrence.get(key) || new Set<string>(); months.add(item.competence!); recurrence.set(key, months);
  });
  return initially.map((item) => {
    if (item.classification !== "PENDING_REVIEW" || !item.counterparty || item.relatedPartyClassification?.decision === "REVIEW_REQUIRED") return item;
    const months = recurrence.get(normalizeText(item.counterparty))?.size || 0;
    if (months >= 3) return { ...item, classification: "INCLUDED_INCOME" as const, classificationReason: `Recebimento externo recorrente em ${months} competências.`, classificationConfidence: 0.82 };
    return item;
  });
}
