import {
  BankStatementParser,
  ParsedPdfTransaction,
  PdfParsingContext,
  PdfReconciliation,
  ReconstructedPdfLine,
  TransactionDirection,
} from "../../../../types/pdfImport";
import { competenceFromDate, maskAccount, normalizeText } from "../../formatters";
import { parsePdfMoney } from "../pdfValueParser";

export const PORTUGUESE_MONTHS: Record<string, number> = {
  JAN: 1, FEV: 2, MAR: 3, ABR: 4, MAI: 5, JUN: 6,
  JUL: 7, AGO: 8, SET: 9, OUT: 10, NOV: 11, DEZ: 12,
};

const NUBANK_DATE_PATTERN = /^(\d{2})\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\s+(\d{4})\b/i;
const NUBANK_VALUE_AT_END_PATTERN = /([+-]?\s*(?:R\$\s*)?(?:\d{1,3}(?:\.\d{3})*|\d+),\d{2})\s*([CD])?\s*$/i;

export const NUBANK_NOISE_PATTERNS = [
  /^saldo\s+(inicial|final|do\s+dia|dispon[ií]vel)/i,
  /^total\s+de\s+(entradas|sa[ií]das)/i,
  /^valores\s+em\s+r\$/i,
  /^tem\s+alguma\s+d[uú]vida/i,
  /^extrato\s+gerado\s+dia/i,
  /^ouvidoria/i,
  /^capitais\s+e\s+regi[oõ]es/i,
  /^demais\s+localidades/i,
  /^0800\s+/i,
  /^\d{1,2}\s+de\s+\d{1,2}$/i,
  /^nu\s+(pagamentos|financeira)/i,
  /^nubank$/i,
  /^per[ií]odo\s+do\s+extrato/i,
] as const;

const NUBANK_TRANSACTION_START_PATTERNS = [
  /^transfer[eê]ncia\s+recebida\b/i,
  /^transfer[eê]ncia\s+recebida\s+pelo\s+pix\b/i,
  /^transfer[eê]ncia\s+enviada\s+pelo\s+pix\b/i,
  /^reembolso\s+recebido\s+pelo\s+pix\b/i,
  /^pagamento\s+de\s+boleto\s+efetuado\b/i,
  /^pagamento\s+da\s+fatura\b/i,
  /^pagamento\s+efetuado\b/i,
  /^dep[oó]sito\b/i,
  /^pix\s+(recebido|enviado)\b/i,
  /^compra(?:\s+no\s+d[eé]bito)?\b/i,
  /^saque\b/i,
  /^tarifa\b/i,
  /^recarga\b/i,
  /^estorno\b/i,
  /^rendimento\b/i,
] as const;

const CREDIT_DESCRIPTION_PATTERNS = [
  /^transfer[eê]ncia\s+recebida/i,
  /^reembolso\s+recebido/i,
  /^dep[oó]sito/i,
  /^pix\s+recebido/i,
  /^estorno/i,
  /^rendimento/i,
] as const;

const DEBIT_DESCRIPTION_PATTERNS = [
  /^transfer[eê]ncia\s+enviada/i,
  /^pagamento/i,
  /^compra/i,
  /^saque/i,
  /^tarifa/i,
  /^pix\s+enviado/i,
  /^recarga/i,
] as const;

interface PendingNubankTransaction {
  date: string | null;
  sectionDirection: TransactionDirection;
  descriptionDirection: TransactionDirection;
  descriptionParts: string[];
  rawLines: string[];
  amount: number | null;
  startPage: number;
  endPage: number;
  warnings: string[];
  explicitDirection: TransactionDirection;
}

function parseNubankDate(text: string): string | null {
  const match = text.trim().match(NUBANK_DATE_PATTERN);
  if (!match) return null;
  const month = PORTUGUESE_MONTHS[match[2].toUpperCase()];
  if (!month) return null;
  return `${match[3]}-${String(month).padStart(2, "0")}-${match[1]}`;
}

function isNubankNoise(text: string): boolean {
  return NUBANK_NOISE_PATTERNS.some((pattern) => pattern.test(text.trim()));
}

function isTransactionStart(text: string): boolean {
  return NUBANK_TRANSACTION_START_PATTERNS.some((pattern) => pattern.test(text.trim()));
}

function directionFromDescription(text: string): TransactionDirection {
  const trimmed = text.trim();
  if (CREDIT_DESCRIPTION_PATTERNS.some((pattern) => pattern.test(trimmed))) return "CREDIT";
  if (DEBIT_DESCRIPTION_PATTERNS.some((pattern) => pattern.test(trimmed))) return "DEBIT";
  return "UNKNOWN";
}

function extractAmountAtEnd(text: string): { amount: number; description: string; explicitDirection: TransactionDirection } | null {
  const match = text.match(NUBANK_VALUE_AT_END_PATTERN);
  if (!match || match.index === undefined) return null;
  const parsed = parsePdfMoney(match[1]);
  if (parsed === null) return null;
  const explicitDirection = match[2]?.toUpperCase() === "C" ? "CREDIT" : match[2]?.toUpperCase() === "D" || /^\s*-/.test(match[1]) ? "DEBIT" : "UNKNOWN";
  return { amount: Math.abs(parsed), description: text.slice(0, match.index).trim(), explicitDirection };
}

function sanitizeDescription(value: string): string {
  return value
    .replace(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, "***.***.***-**")
    .replace(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g, "**.***.***/****-**")
    .replace(/\/\d{4}-\d{2}\b/g, "/****-**")
    .replace(/(ag[eê]ncia\s*:?\s*)\d+/gi, "$1****")
    .replace(/(conta\s*:?\s*)([\d.\-]+)/gi, (_, prefix: string, account: string) => `${prefix}****${account.replace(/\D/g, "").slice(-4)}`)
    .replace(/\s+/g, " ")
    .trim();
}

function extractPayer(firstLine: string): string {
  const withoutPrefix = firstLine
    .replace(/^transfer[eê]ncia\s+recebida(?:\s+pelo\s+pix)?\s*/i, "")
    .replace(/^reembolso\s+recebido\s+pelo\s+pix\s*/i, "")
    .replace(/^pix\s+recebido\s*/i, "")
    .trim();
  if (withoutPrefix === firstLine.trim()) return "";
  return withoutPrefix
    .split(/\s+-\s+|\s+(?:CPF|CNPJ|NU\s+PAGAMENTOS|BANCO|AG[EÊ]NCIA)\b/i)[0]
    .replace(/[\d./-]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function holderNameFromHeader(lines: ReconstructedPdfLine[]): string {
  const beforeMovements = lines.slice(0, Math.max(0, lines.findIndex((line) => /^movimenta[cç][oõ]es$/i.test(line.text.trim()))));
  for (let index = 1; index < beforeMovements.length; index += 1) {
    if (!/(?:CPF|CNPJ)|\d{3}\.\d{3}\.\d{3}-\d{2}|\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/i.test(beforeMovements[index].text)) continue;
    const candidate = beforeMovements[index - 1].text.trim();
    if (/^[A-Za-zÀ-ÿ' ]{5,120}$/.test(candidate) && candidate.split(/\s+/).length >= 2) return candidate;
  }
  return "";
}

function isRelevantNameMatch(holderName: string, payer: string): boolean {
  if (!holderName || !payer) return false;
  const holderTokens = normalizeText(holderName).replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((token) => token.length > 2);
  const payerTokens = normalizeText(payer).replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((token) => token.length > 2);
  if (holderTokens.length < 2 || payerTokens.length < 2) return false;
  const common = payerTokens.filter((token) => holderTokens.includes(token));
  return common.length >= Math.min(2, holderTokens.length);
}

function buildReconciliation(statementCreditTotal: number | null, statementDebitTotal: number | null, transactions: ParsedPdfTransaction[]): PdfReconciliation {
  const parsedCreditTotal = transactions.filter((item) => item.direction === "CREDIT").reduce((sum, item) => sum + (item.amount || 0), 0);
  const parsedDebitTotal = transactions.filter((item) => item.direction === "DEBIT").reduce((sum, item) => sum + (item.amount || 0), 0);
  const creditDifference = statementCreditTotal === null ? null : parsedCreditTotal - statementCreditTotal;
  const debitDifference = statementDebitTotal === null ? null : parsedDebitTotal - statementDebitTotal;
  const available = statementCreditTotal !== null || statementDebitTotal !== null;
  const matched = available
    && (creditDifference === null || Math.abs(creditDifference) <= 0.01)
    && (debitDifference === null || Math.abs(debitDifference) <= 0.01);
  return { statementCreditTotal, parsedCreditTotal, creditDifference, statementDebitTotal, parsedDebitTotal, debitDifference, status: !available ? "NOT_AVAILABLE" : matched ? "MATCHED" : "DIVERGENT" };
}

export const NubankStatementParser: BankStatementParser = {
  id: "nubank",
  label: "Nubank",
  canHandle(context, documentText) {
    if (context.bankCode === "NUBANK") return 1;
    const normalized = normalizeText(documentText);
    const signals = ["nu pagamentos", "nubank", "nu financeira", "movimentacoes", "saldo do dia", "transferencia recebida", "transferencia recebida pelo pix", "transferencia enviada pelo pix"];
    const score = signals.filter((signal) => normalized.includes(signal)).length;
    return score >= 3 ? Math.min(0.99, 0.65 + score * 0.04) : 0;
  },
  parse(lines, context) {
    const transactions: ParsedPdfTransaction[] = [];
    const ignoredLines: ReconstructedPdfLine[] = [];
    const ambiguousLines: ReconstructedPdfLine[] = [];
    const holderName = holderNameFromHeader(lines);
    let currentDate: string | null = null;
    let currentDirection: TransactionDirection = "UNKNOWN";
    let pendingTransaction: PendingNubankTransaction | null = null;
    let insideTransactionsSection = false;
    let statementCreditTotal: number | null = null;
    let statementDebitTotal: number | null = null;

    const finishPending = () => {
      if (!pendingTransaction) return;
      const pending = pendingTransaction;
      const semanticDirection = pending.descriptionDirection !== "UNKNOWN" ? pending.descriptionDirection : pending.sectionDirection;
      const direction = semanticDirection !== "UNKNOWN" ? semanticDirection : pending.explicitDirection;
      if (pending.sectionDirection !== "UNKNOWN" && pending.descriptionDirection !== "UNKNOWN" && pending.sectionDirection !== pending.descriptionDirection) pending.warnings.push("A descrição diverge da seção de entrada/saída; revise a natureza.");
      if (semanticDirection !== "UNKNOWN" && pending.explicitDirection !== "UNKNOWN" && semanticDirection !== pending.explicitDirection) pending.warnings.push("O sinal do valor diverge da natureza indicada no extrato; a seção e a descrição foram priorizadas.");
      if (!pending.date) pending.warnings.push("Data não identificada para esta movimentação.");
      if (pending.amount === null) pending.warnings.push("Valor não identificado.");
      if (direction === "UNKNOWN") pending.warnings.push("Crédito ou débito não identificado.");
      const description = sanitizeDescription(pending.descriptionParts.filter(Boolean).join(" ")) || "Descrição não identificada";
      const payer = extractPayer(pending.descriptionParts[0] || "");
      const sameOwnership = isRelevantNameMatch(holderName, payer);
      if (sameOwnership) pending.warnings.push("Possível movimentação de mesma titularidade; confirme antes de classificar.");
      let confidence = 0.2 + (pending.date ? 0.25 : 0) + (pending.amount !== null ? 0.25 : 0) + (direction !== "UNKNOWN" ? 0.15 : 0) + (description ? 0.1 : 0);
      if (context.source === "PDF_OCR") confidence -= 0.15;
      const transaction: ParsedPdfTransaction = {
        id: `pdf-nubank-${pending.startPage}-${transactions.length}-${Date.now()}`,
        selected: Boolean(pending.date && pending.amount !== null),
        date: pending.date,
        competence: pending.date ? competenceFromDate(pending.date) : null,
        description,
        payer,
        amount: pending.amount,
        direction,
        account: maskAccount(context.account),
        pageNumber: pending.startPage,
        source: context.source,
        confidence: Math.max(0.1, Math.min(0.98, confidence)),
        rawText: pending.rawLines.join(" ").replace(/\s+/g, " ").trim(),
        warnings: pending.warnings,
        classificationHint: sameOwnership ? "SAME_OWNERSHIP" : undefined,
      };
      transactions.push(transaction);
      if (!transaction.date || transaction.amount === null || transaction.direction === "UNKNOWN" || transaction.warnings.length) {
        pending.rawLines.forEach((text, index) => ambiguousLines.push({ pageNumber: pending.startPage, y: -index, text, items: [] }));
      }
      pendingTransaction = null;
    };

    lines.forEach((line) => {
      const text = line.text.replace(/\s+/g, " ").trim();
      if (!text) return;

      if (!insideTransactionsSection) {
        if (/^movimenta[cç][oõ]es$/i.test(text)) { insideTransactionsSection = true; ignoredLines.push(line); return; }
        if (/total\s+de\s+entradas/i.test(text) && statementCreditTotal === null) statementCreditTotal = extractAmountAtEnd(text)?.amount ?? null;
        if (/total\s+de\s+sa[ií]das/i.test(text) && statementDebitTotal === null) statementDebitTotal = extractAmountAtEnd(text)?.amount ?? null;
        ignoredLines.push(line);
        return;
      }

      const date = parseNubankDate(text);
      if (date) {
        if (pendingTransaction) finishPending();
        currentDate = date;
        if (/total\s+de\s+entradas/i.test(text)) currentDirection = "CREDIT";
        else if (/total\s+de\s+sa[ií]das/i.test(text)) currentDirection = "DEBIT";
        ignoredLines.push(line);
        return;
      }

      if (/^total\s+de\s+entradas/i.test(text)) { if (pendingTransaction) finishPending(); currentDirection = "CREDIT"; ignoredLines.push(line); return; }
      if (/^total\s+de\s+sa[ií]das/i.test(text)) { if (pendingTransaction) finishPending(); currentDirection = "DEBIT"; ignoredLines.push(line); return; }
      if (isNubankNoise(text)) { ignoredLines.push(line); return; }

      if (isTransactionStart(text)) {
        if (pendingTransaction) finishPending();
        const amountAtEnd = extractAmountAtEnd(text);
        const firstDescription = amountAtEnd?.description || text;
        const descriptionDirection = directionFromDescription(firstDescription);
        pendingTransaction = { date: currentDate, sectionDirection: currentDirection, descriptionDirection, descriptionParts: [firstDescription], rawLines: [text], amount: amountAtEnd?.amount ?? null, startPage: line.pageNumber, endPage: line.pageNumber, warnings: [], explicitDirection: amountAtEnd?.explicitDirection ?? "UNKNOWN" };
        if (amountAtEnd) finishPending();
        return;
      }

      if (!pendingTransaction) { ignoredLines.push(line); return; }
      pendingTransaction.endPage = line.pageNumber;
      pendingTransaction.rawLines.push(text);
      const amountAtEnd = extractAmountAtEnd(text);
      if (amountAtEnd) {
        if (amountAtEnd.description) pendingTransaction.descriptionParts.push(amountAtEnd.description);
        pendingTransaction.amount = amountAtEnd.amount;
        if (amountAtEnd.explicitDirection !== "UNKNOWN") pendingTransaction.explicitDirection = amountAtEnd.explicitDirection;
        finishPending();
      } else pendingTransaction.descriptionParts.push(text);
    });
    finishPending();

    return {
      transactions,
      ignoredLines,
      ambiguousLines,
      parserId: "nubank",
      parserLabel: "Nubank",
      reconciliation: buildReconciliation(statementCreditTotal, statementDebitTotal, transactions),
    };
  },
};
