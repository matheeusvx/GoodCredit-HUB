import { ReconstructedPdfLine } from "../../../types/pdfImport";
import { PDF_STATEMENT_NOISE_PATTERNS } from "./pdfConfig";

export function isStatementNoise(value: string): boolean {
  const text = value.trim();
  if (!text) return true;
  return PDF_STATEMENT_NOISE_PATTERNS.some((pattern) => pattern.test(text));
}

export function splitNoiseLines(lines: ReconstructedPdfLine[]) {
  return lines.reduce<{ content: ReconstructedPdfLine[]; ignored: ReconstructedPdfLine[] }>((result, line) => {
    (isStatementNoise(line.text) ? result.ignored : result.content).push(line);
    return result;
  }, { content: [], ignored: [] });
}
