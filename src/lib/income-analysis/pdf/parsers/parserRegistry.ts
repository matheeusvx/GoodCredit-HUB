import { BankStatementParser, PdfBankCode, PdfParsingContext, ReconstructedPdfLine } from "../../../../types/pdfImport";
import { normalizeText } from "../../formatters";
import { PDF_BANK_MARKERS } from "../pdfConfig";
import { GenericBankStatementParser } from "./GenericBankStatementParser";
import { NubankStatementParser } from "./NubankStatementParser";

const PARSERS: BankStatementParser[] = [NubankStatementParser, GenericBankStatementParser];

export function detectPdfBank(text: string): PdfBankCode {
  const normalized = normalizeText(text);
  const scores = Object.entries(PDF_BANK_MARKERS).map(([bank, markers]) => {
    const score = markers.reduce((total, marker) => {
      const normalizedMarker = normalizeText(marker);
      let count = 0;
      let position = normalized.indexOf(normalizedMarker);
      while (position >= 0) { count += 1; position = normalized.indexOf(normalizedMarker, position + normalizedMarker.length); }
      return total + count;
    }, 0);
    return { bank: bank as PdfBankCode, score };
  }).sort((a, b) => b.score - a.score);
  return scores[0]?.score ? scores[0].bank : "AUTO";
}

export function selectStatementParser(context: PdfParsingContext, lines: ReconstructedPdfLine[]): BankStatementParser {
  const text = lines.slice(0, 300).map((line) => line.text).join(" ");
  return [...PARSERS].sort((a, b) => b.canHandle(context, text) - a.canHandle(context, text))[0];
}

export function getStatementParser(parserId: string): BankStatementParser | undefined {
  return PARSERS.find((parser) => parser.id === parserId);
}
