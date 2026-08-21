import type {
  BankStatementParser,
  PdfParseResult,
  ReconstructedPdfLine,
  TransactionDirection,
} from "../../../../types/pdfImport";
import { normalizeDate, normalizeText } from "../../formatters";
import {
  moneyTokens,
  sanitizeBankText,
  transaction,
} from "./parserUtils";

export const SHOPEE_PAY_PARSER_ID = "shopee-pay";

type ShopeePayMetadata = NonNullable<PdfParseResult["statementMetadata"]>;

interface PendingTransaction {
  date: string;
  time: string | null;
  pageNumber: number;
  lines: ReconstructedPdfLine[];
}

function valueAfterLabel(lines: ReconstructedPdfLine[], label: RegExp): string | null {
  for (const line of lines.filter((item) => item.pageNumber === 1).slice(0, 40)) {
    const match = line.text.match(label);
    if (!match?.[1]) continue;
    return match[1]
      .split(/\s{2,}(?=(?:CPF|AG[EÊ]NCIA|CONTA|PER[IÍ]ODO)\s*:)/i)[0]
      .trim();
  }
  return null;
}

export function extractShopeePayStatementMetadata(
  lines: ReconstructedPdfLine[]
): ShopeePayMetadata {
  const text = lines.map((line) => line.text).join("\n");
  const period = text.match(
    /PER[IÍ]ODO\s+EXTRATO[\s\S]{0,160}?(\d{2}\/\d{2}\/\d{4})\s+A\s+(\d{2}\/\d{2}\/\d{4})/i
  );
  return {
    holderName: valueAfterLabel(lines, /\bNOME\s*:\s*(.+)$/i),
    holderCpf: valueAfterLabel(lines, /\bCPF\s*:\s*([\d.-]+)/i),
    agency: valueAfterLabel(lines, /\bAG[EÊ]NCIA\s*:\s*([\d.-]+)/i),
    account: valueAfterLabel(lines, /\bCONTA\s*:\s*([\d.-]+)/i),
    periodStart: period ? normalizeDate(period[1]) : null,
    periodEnd: period ? normalizeDate(period[2]) : null,
  };
}

function shopeePaySignals(documentText: string) {
  const text = normalizeText(documentText);
  const institutional = [
    "shpp brasil instituicao de pagamento e servicos de pagamentos ltda",
    "38.372.267/0001-82",
  ].filter((signal) => text.includes(signal)).length;
  const structure = [
    "periodo extrato",
    "tipo de transacao",
    "valor transacao",
    "saldo creditado",
  ].filter((signal) => text.includes(signal)).length;
  return { institutional, structure };
}

function semanticDirection(text: string): TransactionDirection {
  const normalized = normalizeText(text);
  if (/\bsaldo creditado\b/.test(normalized)) return "CREDIT";
  if (/\btransferencia pix enviada para\b/.test(normalized)) return "DEBIT";
  const value = moneyTokens(text).at(-1);
  return value?.direction ?? "UNKNOWN";
}

function semanticDescription(text: string): string {
  const normalized = normalizeText(text);
  if (/\bsaldo creditado\b/.test(normalized)) return "Saldo creditado";
  if (/\btransferencia pix enviada para\b/.test(normalized)) {
    return "Transferência Pix Enviada Para";
  }
  const lastValue = moneyTokens(text).at(-1);
  const withoutValue = lastValue
    ? text.slice(0, lastValue.startIndex)
    : text;
  return sanitizeBankText(
    withoutValue
      .replace(/^\s*\d{2}[-/]\d{2}[-/]\d{4}\s*/, "")
      .replace(/^\s*\d{2}:\d{2}:\d{2}\s*/, "")
  );
}

export const ShopeePayStatementParser: BankStatementParser = {
  id: SHOPEE_PAY_PARSER_ID,
  label: "ShopeePay",
  canHandle(context, documentText) {
    if (context.bankCode === "SHOPEE_PAY") return 1;
    const signals = shopeePaySignals(documentText);
    return signals.institutional >= 1 && signals.structure >= 3
      ? Math.min(0.99, 0.82 + signals.institutional * 0.05 + signals.structure * 0.02)
      : 0;
  },
  parse(lines, context) {
    const transactions = [] as PdfParseResult["transactions"];
    const ignoredLines: ReconstructedPdfLine[] = [];
    const ambiguousLines: ReconstructedPdfLine[] = [];
    const seen = new Set<string>();
    let pending: PendingTransaction | null = null;
    let detachedDescription: ReconstructedPdfLine | null = null;

    const flush = () => {
      if (!pending) return;
      const current = pending;
      pending = null;
      const rawText = current.lines.map((line) => line.text).join(" ").replace(/\s+/g, " ").trim();
      const value = moneyTokens(rawText).at(-1);
      const direction = semanticDirection(rawText);
      const description = semanticDescription(rawText);
      if (!value || direction === "UNKNOWN") {
        ambiguousLines.push(...current.lines);
        return;
      }
      const signature = [
        current.date,
        current.time || "",
        normalizeText(description),
        value.amount.toFixed(2),
        direction,
      ].join("|");
      if (seen.has(signature)) {
        ignoredLines.push(...current.lines);
        return;
      }
      seen.add(signature);
      transactions.push(transaction({
        parserId: SHOPEE_PAY_PARSER_ID,
        context,
        index: transactions.length,
        page: current.pageNumber,
        date: current.date,
        time: current.time,
        description,
        amount: value.amount,
        direction,
        confidence: /^(Saldo creditado|Transferência Pix Enviada Para)$/.test(description)
          ? 0.99
          : 0.75,
      }));
    };

    for (const line of lines) {
      const text = line.text.replace(/\s+/g, " ").trim();
      const start = text.match(
        /^\s*(\d{2}[-/]\d{2}[-/]\d{4})(?:\s+(\d{2}:\d{2}:\d{2}))?\s*(.*)$/
      );
      if (start) {
        flush();
        pending = {
          date: normalizeDate(start[1]),
          time: start[2] || null,
          pageNumber: line.pageNumber,
          lines: detachedDescription ? [detachedDescription, line] : [line],
        };
        detachedDescription = null;
        if (moneyTokens(text).length) flush();
        continue;
      }
      if (!pending) {
        if (/\btransferencia pix enviada para\b/.test(normalizeText(text))) {
          detachedDescription = line;
          continue;
        }
        ignoredLines.push(line);
        continue;
      }
      pending.lines.push(line);
      const combined = pending.lines.map((item) => item.text).join(" ");
      if (moneyTokens(combined).length) flush();
    }
    flush();

    return {
      transactions,
      ignoredLines,
      ambiguousLines,
      parserId: SHOPEE_PAY_PARSER_ID,
      parserLabel: "ShopeePay",
      bankCode: "SHOPEE_PAY",
      statementMetadata: extractShopeePayStatementMetadata(lines),
    };
  },
};
