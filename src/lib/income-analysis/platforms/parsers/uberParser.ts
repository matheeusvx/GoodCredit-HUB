import type { ReconstructedPdfLine } from "../../../../types/pdfImport";
import type {
  PlatformDocumentDetection,
  PlatformIncomeDocument,
  PlatformParserContext,
  PlatformValueEvidence,
} from "../../../../types/platformIncome";
import {
  normalizeCpf,
  normalizePlatformText,
  parsePlatformMoney,
  PLATFORM_MONTHS,
} from "../platformUtils";

const MONTH_PATTERN = "(janeiro|fevereiro|marco|mar|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)";
const MONTHLY_PERIOD_PATTERN = new RegExp(
  `\\b(0?1)\\s*[-–]\\s*(28|29|30|31)\\s+${MONTH_PATTERN}\\s+(\\d{4})\\b`,
  "i"
);
const ANNUAL_PERIOD_PATTERN = /\bresumo fiscal\s*-\s*(\d{4})\b/i;
const MONEY_CAPTURE = "((?:\\d{1,3}(?:\\.\\d{3})*|\\d+),\\d{2})";

function pageTexts(lines: ReconstructedPdfLine[]) {
  const pages = new Map<number, string[]>();
  lines.forEach((line) => {
    const values = pages.get(line.pageNumber) || [];
    values.push(line.text);
    pages.set(line.pageNumber, values);
  });
  return [...pages.entries()].map(([pageNumber, values]) => ({
    pageNumber,
    original: values.join("\n"),
    normalized: normalizePlatformText(values.join(" ")),
  }));
}

function extractEvidence(
  lines: ReconstructedPdfLine[],
  label: string,
  labelPattern: string,
  priority: number
): PlatformValueEvidence[] {
  const pattern = new RegExp(`${labelPattern}\\s*(?:r\\$\\s*)?${MONEY_CAPTURE}`, "gi");
  return pageTexts(lines).flatMap(({ pageNumber, normalized }) =>
    [...normalized.matchAll(pattern)].flatMap((match) => {
      const value = parsePlatformMoney(match[1]);
      return value === null ? [] : [{ label, value, pageNumber, priority }];
    })
  );
}

function extractHolderName(text: string): string | null {
  const compact = text.replace(/\s+/g, " ");
  const match = compact.match(
    /agradecemos por dirigir pela plataforma da uber,\s*([^!]{4,140})!/i
  );
  return match?.[1].replace(/\s+/g, " ").trim() || null;
}

function extractCpf(text: string): string | null {
  const match = text.match(/\bCPF\s*:?\s*(\d{3}\.?\d{3}\.?\d{3}-?\d{2})\b/i);
  return normalizeCpf(match?.[1] || null);
}

function detectPeriod(text: string) {
  const normalized = normalizePlatformText(text);
  const monthly = normalized.match(MONTHLY_PERIOD_PATTERN);
  if (monthly) {
    const month = PLATFORM_MONTHS[monthly[3]];
    const year = Number(monthly[4]);
    const startDay = Number(monthly[1]);
    const endDay = Number(monthly[2]);
    if (month && year) {
      const monthText = String(month).padStart(2, "0");
      return {
        documentPeriod: "MONTHLY" as const,
        competence: `${year}-${monthText}`,
        periodStart: `${year}-${monthText}-${String(startDay).padStart(2, "0")}`,
        periodEnd: `${year}-${monthText}-${String(endDay).padStart(2, "0")}`,
      };
    }
  }
  const annual = normalized.match(ANNUAL_PERIOD_PATTERN);
  if (annual) {
    const year = Number(annual[1]);
    return {
      documentPeriod: "ANNUAL" as const,
      competence: null,
      periodStart: `${year}-01-01`,
      periodEnd: `${year}-12-31`,
    };
  }
  return {
    documentPeriod: "UNKNOWN" as const,
    competence: null,
    periodStart: null,
    periodEnd: null,
  };
}

function distinctValues(evidence: PlatformValueEvidence[]): number[] {
  return [...new Set(evidence.map((item) => Math.round(item.value * 100)))].map(
    (value) => value / 100
  );
}

export function parseUberIncomeDocument(
  lines: ReconstructedPdfLine[],
  context: PlatformParserContext,
  detection: PlatformDocumentDetection
): PlatformIncomeDocument {
  const text = lines.map((line) => line.text).join("\n");
  const period = detectPeriod(text);
  const canonicalGross = extractEvidence(
    lines,
    "Ganhos brutos totais",
    "ganhos brutos totais",
    1
  );
  const summaryGross = extractEvidence(
    lines,
    "Ganhos Brutos",
    "ganhos brutos(?! totais)",
    2
  );
  const grossEvidence = [...canonicalGross, ...summaryGross];
  const uniqueGrossValues = distinctValues(grossEvidence);
  const preferredEvidence = [...grossEvidence].sort(
    (left, right) => left.priority - right.priority || left.pageNumber - right.pageNumber
  )[0];
  const netEvidence = [
    ...extractEvidence(
      lines,
      "Valor líquido do repasse de ganhos",
      "valor liquido do repasse de ganhos",
      1
    ),
    ...extractEvidence(lines, "Ganhos líquidos totais", "ganhos liquidos totais", 2),
  ];
  const holderName = extractHolderName(text);
  const holderCpf = extractCpf(text);
  const valueDivergence = uniqueGrossValues.length > 1;
  const warnings: string[] = [];

  if (valueDivergence) {
    warnings.push("Foram encontrados valores brutos divergentes no mesmo documento.");
  }
  if (!holderCpf && !holderName) {
    warnings.push("O titular do comprovante não foi identificado com segurança.");
  }
  if (!period.competence && period.documentPeriod === "MONTHLY") {
    warnings.push("A competência mensal não foi identificada.");
  }

  let invalidReason: string | null = null;
  if (period.documentPeriod === "ANNUAL") {
    invalidReason = "Documento anual não substitui comprovante mensal.";
  } else if (period.documentPeriod !== "MONTHLY") {
    invalidReason = "Não foi possível confirmar que o documento é um comprovante mensal.";
  } else if (!preferredEvidence) {
    invalidReason = "O valor de ganhos brutos não foi identificado.";
  } else if (valueDivergence) {
    invalidReason = "Existem valores brutos divergentes no mesmo documento.";
  } else if (!period.competence) {
    invalidReason = "A competência mensal não foi identificada.";
  } else if (!holderCpf && !holderName) {
    invalidReason = "O titular do comprovante não foi identificado.";
  } else if (detection.confidence < 0.75) {
    invalidReason = "A identificação institucional da plataforma exige revisão.";
  }

  const completenessScore = [
    period.documentPeriod !== "UNKNOWN",
    Boolean(preferredEvidence),
    Boolean(holderCpf || holderName),
    detection.confidence >= 0.75,
    !valueDivergence,
  ].filter(Boolean).length;
  const documentConfidence = Math.min(
    0.99,
    detection.confidence * 0.55 + (completenessScore / 5) * 0.45
  );

  return {
    id: context.id,
    fileName: context.fileName,
    platform: "UBER",
    documentPeriod: period.documentPeriod,
    holderName,
    holderCpf,
    competence: period.competence,
    periodStart: period.periodStart,
    periodEnd: period.periodEnd,
    grossIncome: preferredEvidence?.value ?? null,
    netIncome: netEvidence[0]?.value ?? null,
    grossIncomeEvidence: grossEvidence,
    documentConfidence,
    extractionMethod: context.extractionMethod,
    parserId: "uber-income-v1",
    pageCount: context.pageCount,
    isValidForIncomeCalculation: invalidReason === null,
    invalidReason,
    warnings,
  };
}
