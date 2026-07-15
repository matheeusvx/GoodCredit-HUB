import { PdfImportSummary, PdfParseResult, PdfParsingContext, ReconstructedPdfLine } from "../../../types/pdfImport";
import { getStatementParser, selectStatementParser } from "./parsers/parserRegistry";

export function parsePdfTransactions(lines: ReconstructedPdfLine[], context: PdfParsingContext, parserId?: string): PdfParseResult {
  const parser = parserId ? getStatementParser(parserId) : selectStatementParser(context, lines);
  return (parser || selectStatementParser(context, lines)).parse(lines, context);
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
