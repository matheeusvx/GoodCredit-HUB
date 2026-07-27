import { BankStatementParser, PdfBankCode, PdfParsingContext, ReconstructedPdfLine } from "../../../../types/pdfImport";
import { normalizeText } from "../../formatters";
import { PDF_BANK_MARKERS } from "../pdfConfig";
import { GenericBankStatementParser } from "./GenericBankStatementParser";
import { NubankStatementParser } from "./NubankStatementParser";
import { BradescoStatementParser } from "./BradescoStatementParser";
import { CaixaStatementParser } from "./CaixaStatementParser";
import { InterStatementParser } from "./InterStatementParser";
import { ItauStatementParser } from "./ItauStatementParser";
import { MercadoPagoStatementParser } from "./MercadoPagoStatementParser";
import { SantanderStatementParser } from "./SantanderStatementParser";

const PARSERS: BankStatementParser[] = [
  NubankStatementParser,
  BradescoStatementParser,
  MercadoPagoStatementParser,
  SantanderStatementParser,
  CaixaStatementParser,
  InterStatementParser,
  ItauStatementParser,
  GenericBankStatementParser,
];

export interface PdfBankDetection {
  bankCode: PdfBankCode;
  confidence: number;
  signals: string[];
  scores: Partial<Record<PdfBankCode, number>>;
}

const INSTITUTIONAL_PATTERNS: Partial<
  Record<PdfBankCode, Array<{ pattern: RegExp; label: string }>>
> = {
  NUBANK: [
    { pattern: /\bnu financeira(?: s\.?a\.?)?\b/, label: "Nu Financeira" },
    { pattern: /\bnu pagamentos(?: s\.?a\.?)?\b/, label: "Nu Pagamentos" },
    { pattern: /\bnubank\b/, label: "Nubank" }
  ],
  ITAU: [
    { pattern: /\bitau unibanco(?: s\.?a\.?)?\b/, label: "Itaú Unibanco" },
    { pattern: /^itau\b/, label: "Itaú" }
  ],
  BRADESCO: [{ pattern: /\bbradesco\b/, label: "Bradesco" }],
  SANTANDER: [{ pattern: /\bsantander\b/, label: "Santander" }],
  INTER: [
    { pattern: /\bbanco inter\b/, label: "Banco Inter" },
    { pattern: /\binter\.co\b/, label: "Inter" }
  ],
  CAIXA: [
    { pattern: /\bcaixa economica federal\b/, label: "CAIXA" },
    { pattern: /\bcaixa tem\b/, label: "CAIXA Tem" }
  ],
  MERCADO_PAGO: [
    { pattern: /\bmercado pago\b/, label: "Mercado Pago" }
  ],
  BANCO_DO_BRASIL: [
    { pattern: /\bbanco do brasil\b/, label: "Banco do Brasil" }
  ],
  C6: [{ pattern: /\bc6 bank\b/, label: "C6 Bank" }]
};

function incrementScore(
  scores: Partial<Record<PdfBankCode, number>>,
  bank: PdfBankCode,
  amount: number
) {
  scores[bank] = (scores[bank] || 0) + amount;
}

function countOccurrences(text: string, marker: string): number {
  let count = 0;
  let position = text.indexOf(marker);
  while (position >= 0) {
    count += 1;
    position = text.indexOf(marker, position + marker.length);
  }
  return count;
}

export function detectPdfBankDetailed(
  input: string | ReconstructedPdfLine[]
): PdfBankDetection {
  const lines = typeof input === "string" ? null : input;
  const normalizedText = normalizeText(
    typeof input === "string"
      ? input
      : input.map((line) => line.text).join(" ")
  );
  const scores: Partial<Record<PdfBankCode, number>> = {};
  const signals = new Set<string>();

  if (lines) {
    lines.forEach((line) => {
      const normalizedLine = normalizeText(line.text);
      const institutionalZone = line.y <= 120 || line.y >= 650;
      Object.entries(INSTITUTIONAL_PATTERNS).forEach(([bank, patterns]) => {
        patterns?.forEach(({ pattern, label }) => {
          if (!pattern.test(normalizedLine)) return;
          incrementScore(
            scores,
            bank as PdfBankCode,
            institutionalZone ? 14 : 1
          );
          if (institutionalZone) signals.add(`${bank}:${label}`);
        });
      });
    });
  } else {
    Object.entries(INSTITUTIONAL_PATTERNS).forEach(([bank, patterns]) => {
      patterns?.forEach(({ pattern, label }) => {
        const globalPattern = new RegExp(pattern.source, `${pattern.flags.replace("g", "")}g`);
        const occurrences = [...normalizedText.matchAll(globalPattern)].length;
        if (!occurrences) return;
        const strongNubankSignal =
          bank === "NUBANK" && /nu financeira|nu pagamentos/.test(label.toLowerCase());
        incrementScore(
          scores,
          bank as PdfBankCode,
          Math.min(occurrences, 4) * (strongNubankSignal ? 12 : 3)
        );
        signals.add(`${bank}:${label}`);
      });
    });
  }

  Object.entries(PDF_BANK_MARKERS).forEach(([bank, markers]) => {
    const markerScore = markers.reduce(
      (total, marker) =>
        total +
        Math.min(
          2,
          countOccurrences(normalizedText, normalizeText(marker))
        ),
      0
    );
    incrementScore(scores, bank as PdfBankCode, markerScore);
  });

  const nubankStructure = [
    ["movimentacoes", "estrutura de movimentações"],
    ["saldo final do periodo", "saldo final do período"],
    ["rendimento liquido", "rendimento líquido"],
    ["total de entradas", "total de entradas"],
    ["total de saidas", "total de saídas"]
  ] as const;
  const nubankStructureCount = nubankStructure.filter(([marker]) =>
    normalizedText.includes(marker)
  ).length;
  if (nubankStructureCount >= 3) {
    incrementScore(scores, "NUBANK", 10 + nubankStructureCount * 3);
    nubankStructure
      .filter(([marker]) => normalizedText.includes(marker))
      .forEach(([, label]) => signals.add(`NUBANK:${label}`));
  }

  const ranking = Object.entries(scores)
    .map(([bank, score]) => ({ bank: bank as PdfBankCode, score }))
    .sort((left, right) => right.score - left.score);
  const winner = ranking[0];
  const runnerUp = ranking[1];
  if (!winner?.score) {
    return { bankCode: "AUTO", confidence: 0, signals: [], scores };
  }
  const confidence = Math.min(
    1,
    winner.score / Math.max(1, winner.score + (runnerUp?.score || 0))
  );
  return {
    bankCode: winner.bank,
    confidence,
    signals: [...signals].filter((signal) => signal.startsWith(`${winner.bank}:`)),
    scores
  };
}

export function detectPdfBank(
  input: string | ReconstructedPdfLine[]
): PdfBankCode {
  return detectPdfBankDetailed(input).bankCode;
}

export function rankStatementParsers(
  context: PdfParsingContext,
  lines: ReconstructedPdfLine[],
  ignoreSelectedBank = false
) {
  const text = lines.slice(0, 300).map((line) => line.text).join(" ");
  const scoringContext = ignoreSelectedBank
    ? { ...context, bankCode: "AUTO" as const }
    : context;
  return PARSERS.map((parser) => ({
    parser,
    score: parser.canHandle(scoringContext, text)
  })).sort((left, right) => right.score - left.score);
}

export function selectStatementParser(context: PdfParsingContext, lines: ReconstructedPdfLine[]): BankStatementParser {
  return rankStatementParsers(context, lines)[0].parser;
}

export function getStatementParser(parserId: string): BankStatementParser | undefined {
  return PARSERS.find((parser) => parser.id === parserId);
}
