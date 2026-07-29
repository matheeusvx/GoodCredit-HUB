import type { ReconstructedPdfLine } from "../../../types/pdfImport";
import type {
  PlatformDocumentDetection,
  PlatformProvider,
} from "../../../types/platformIncome";
import { normalizePlatformText } from "./platformUtils";

interface PlatformDetectionRule {
  provider: PlatformProvider;
  brandSignals: RegExp[];
  officialSignals: Array<{ pattern: RegExp; label: string }>;
}

const PLATFORM_DETECTION_RULES: PlatformDetectionRule[] = [
  {
    provider: "UBER",
    brandSignals: [/\buber\b/, /uber do brasil tecnologia/],
    officialSignals: [
      { pattern: /resumo fiscal/, label: "Resumo fiscal" },
      { pattern: /ganhos brutos totais/, label: "Ganhos brutos totais" },
      { pattern: /valor liquido do repasse de ganhos/, label: "Valor líquido do repasse" },
      { pattern: /como seus ganhos foram calculados/, label: "Como os ganhos foram calculados" },
      { pattern: /agradecemos por dirigir pela plataforma da uber/, label: "Mensagem institucional" },
      { pattern: /17\.?895\.?646\/0001-87/, label: "CNPJ institucional" },
    ],
  },
  {
    provider: "99",
    brandSignals: [/\b99(?:app| tecnologia)?\b/],
    officialSignals: [
      { pattern: /comprovante de repasse/, label: "Comprovante de repasse" },
      { pattern: /resumo de ganhos/, label: "Resumo de ganhos" },
    ],
  },
  {
    provider: "LALAMOVE",
    brandSignals: [/\blalamove\b/],
    officialSignals: [
      { pattern: /comprovante de repasse/, label: "Comprovante de repasse" },
      { pattern: /resumo de ganhos/, label: "Resumo de ganhos" },
    ],
  },
  {
    provider: "RAPPI",
    brandSignals: [/\brappi\b/],
    officialSignals: [
      { pattern: /comprovante de repasse/, label: "Comprovante de repasse" },
      { pattern: /resumo de ganhos/, label: "Resumo de ganhos" },
    ],
  },
];

export function detectPlatformDocument(
  input: string | ReconstructedPdfLine[]
): PlatformDocumentDetection {
  const text = normalizePlatformText(
    typeof input === "string"
      ? input
      : input.map((line) => line.text).join(" ")
  );
  const candidates = PLATFORM_DETECTION_RULES.map((rule) => {
    const hasBrand = rule.brandSignals.some((pattern) => pattern.test(text));
    const officialSignals = rule.officialSignals.filter(({ pattern }) => pattern.test(text));
    const requiredOfficialSignals = rule.provider === "UBER" ? 2 : 2;
    const confidence = hasBrand && officialSignals.length >= requiredOfficialSignals
      ? Math.min(1, 0.55 + officialSignals.length * 0.08)
      : 0;
    return {
      platform: rule.provider,
      confidence,
      signals: officialSignals.map(({ label }) => label),
    };
  }).sort((left, right) => right.confidence - left.confidence);

  const winner = candidates[0];
  return winner?.confidence
    ? winner
    : { platform: null, confidence: 0, signals: [] };
}
