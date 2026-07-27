import type { ReconstructedPdfLine } from "../../../../types/pdfImport";
import type {
  PlatformDocumentDetection,
  PlatformIncomeDocument,
  PlatformParserContext,
  PlatformProvider,
} from "../../../../types/platformIncome";
import { parseUberIncomeDocument } from "./uberParser";

type PlatformParser = (
  lines: ReconstructedPdfLine[],
  context: PlatformParserContext,
  detection: PlatformDocumentDetection
) => PlatformIncomeDocument;

const PLATFORM_PARSERS: Partial<Record<PlatformProvider, PlatformParser>> = {
  UBER: parseUberIncomeDocument,
};

export function parsePlatformIncomeDocument(
  lines: ReconstructedPdfLine[],
  context: PlatformParserContext,
  detection: PlatformDocumentDetection
): PlatformIncomeDocument {
  if (!detection.platform) {
    throw new Error("Plataforma não identificada.");
  }
  const parser = PLATFORM_PARSERS[detection.platform];
  if (parser) return parser(lines, context, detection);

  return {
    id: context.id,
    fileName: context.fileName,
    platform: detection.platform,
    documentPeriod: "UNKNOWN",
    holderName: null,
    holderCpf: null,
    competence: null,
    periodStart: null,
    periodEnd: null,
    grossIncome: null,
    netIncome: null,
    grossIncomeEvidence: [],
    documentConfidence: detection.confidence,
    extractionMethod: context.extractionMethod,
    parserId: `${detection.platform.toLowerCase()}-review`,
    pageCount: context.pageCount,
    isValidForIncomeCalculation: false,
    invalidReason: "O layout desta plataforma ainda precisa de validação documental.",
    warnings: ["Documento reconhecido, mas a extração automática exige revisão."],
  };
}
