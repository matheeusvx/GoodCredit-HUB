import { PdfImportSummary, PdfParseResult, PdfParsingContext, ReconstructedPdfLine } from "../../../types/pdfImport";
import { getStatementParser, rankStatementParsers, selectStatementParser } from "./parsers/parserRegistry";

export function parsePdfTransactions(lines: ReconstructedPdfLine[], context: PdfParsingContext, parserId?: string): PdfParseResult {
  const parser = parserId ? getStatementParser(parserId) : selectStatementParser(context, lines);
  const selectedParser = parser || selectStatementParser(context, lines);
  const documentText = lines.slice(0, 300).map((line) => line.text).join(" ");
  const selectedScore = selectedParser.canHandle(context, documentText);
  const primaryResult = selectedParser.parse(lines, context);
  const validPrimaryTransactions = primaryResult.transactions.filter(
    (transaction) => transaction.date && transaction.amount !== null && transaction.direction !== "UNKNOWN"
  );

  if (parserId || validPrimaryTransactions.length > 0) {
    return withParserAudit(primaryResult, context, selectedParser.id, selectedScore);
  }

  const fallbackCandidate = rankStatementParsers(context, lines, true)
    .find(({ parser: candidate, score }) =>
      candidate.id !== selectedParser.id
      && candidate.id !== "generic"
      && score >= 0.75
    );
  if (!fallbackCandidate) {
    return withParserAudit(primaryResult, context, selectedParser.id, selectedScore);
  }

  const fallbackBank = bankCodeFromParserId(fallbackCandidate.parser.id, "AUTO");
  const fallbackResult = fallbackCandidate.parser.parse(lines, {
    ...context,
    bankCode: fallbackBank,
  });
  const validFallbackTransactions = fallbackResult.transactions.filter(
    (transaction) => transaction.date && transaction.amount !== null && transaction.direction !== "UNKNOWN"
  );
  if (!validFallbackTransactions.length) {
    return withParserAudit(primaryResult, context, selectedParser.id, selectedScore);
  }

  return {
    ...fallbackResult,
    bankCode: fallbackBank,
    parserAudit: {
      requestedBank: context.bankCode,
      selectedParserId: selectedParser.id,
      selectedParserScore: selectedScore,
      fallbackParserId: fallbackCandidate.parser.id,
      fallbackReason: "O parser inicialmente selecionado não identificou movimentações válidas.",
    },
  };
}

function withParserAudit(
  result: PdfParseResult,
  context: PdfParsingContext,
  parserId: string,
  parserScore: number
): PdfParseResult {
  return {
    ...result,
    bankCode: bankCodeFromParserId(parserId, context.bankCode),
    parserAudit: {
      requestedBank: context.bankCode,
      selectedParserId: parserId,
      selectedParserScore: parserScore,
    },
  };
}

function bankCodeFromParserId(
  parserId: string,
  fallback: PdfParsingContext["bankCode"]
): PdfParsingContext["bankCode"] {
  const parserBanks: Record<string, PdfParsingContext["bankCode"]> = {
    nubank: "NUBANK",
    bradesco: "BRADESCO",
    caixa: "CAIXA",
    inter: "INTER",
    itau: "ITAU",
    "mercado-pago": "MERCADO_PAGO",
    santander: "SANTANDER",
  };
  return parserBanks[parserId] || fallback;
}

export function summarizePdfParse(result: PdfParseResult, lineCount: number): PdfImportSummary {
  return result.transactions.reduce<PdfImportSummary>((summary, transaction) => {
    summary.transactionCount += 1;
    if (transaction.direction === "CREDIT") {
      summary.credits += 1;
      summary.creditTotal += transaction.amount || 0;
    } else if (transaction.direction === "DEBIT") {
      summary.debits += 1;
      summary.debitTotal += transaction.amount || 0;
    } else summary.ambiguous += 1;
    return summary;
  }, {
    lineCount,
    transactionCount: 0,
    credits: 0,
    debits: 0,
    ambiguous: 0,
    creditTotal: 0,
    debitTotal: 0,
    ignoredLineCount: result.ignoredLines.length,
    parserLabel: result.parserLabel,
    reconciliation: result.reconciliation,
  });
}
