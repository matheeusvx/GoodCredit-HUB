import type { ReconstructedPdfLine } from "../../types/pdfImport";
import type { StatementFileRecord } from "../../types/statementAnalysis";
import { detectPdfBankDetailed, getStatementParser } from "../income-analysis/pdf/parsers/parserRegistry";
import { detectPlatformDocument } from "../income-analysis/platforms/detectPlatformDocument";
import { getInstitution, INSTITUTION_CATALOG, normalizeInstitutionQuery, type InstitutionId, type InstitutionSelection } from "./institutionCatalog";

export interface InstitutionResolution {
  detectedInstitution: InstitutionId | null;
  institutionSelectionMethod: "AUTO" | "MANUAL";
  readingMethod: StatementFileRecord["readingMethod"];
  parserId: string | null;
  bankCode: ReturnType<typeof detectPdfBankDetailed>["bankCode"];
  selectionBlocked: boolean;
  incompatibilityWarnings: string[];
  warnings: string[];
}

function matchesAlias(text: string, alias: string) {
  const escaped = normalizeInstitutionQuery(alias).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:$|[^a-z0-9])`).test(text);
}

export function resolveInstitution(lines: ReconstructedPdfLine[], selected: InstitutionSelection = "AUTO"): InstitutionResolution {
  const text = normalizeInstitutionQuery(lines.map((line) => line.text).join(" "));
  const movementPages = new Set<number>();
  const headerLines: ReconstructedPdfLine[] = [];
  lines.forEach((line, index) => {
    const value = normalizeInstitutionQuery(line.text);
    if (/^\s*\d{2}[/-]\d{2}|^movimentac(?:ao|oes)|^data\s+.*(?:historico|descricao|lancamento|movimento)/.test(value)) movementPages.add(line.pageNumber);
    const header = !movementPages.has(line.pageNumber) && (line.y >= 650 || (line.pageNumber === 1 && index < 12));
    const officialFooter = line.y <= 120 && /https?:|www\.|\.com\.br|inter\.co/.test(value);
    if ((header || officialFooter) && !/pix|transferencia|ted|remetente|favorecido/.test(value)) headerLines.push(line);
  });
  const headers = normalizeInstitutionQuery(headerLines.map((line) => line.text).join(" "));
  const bank = detectPdfBankDetailed(lines);
  const platform = detectPlatformDocument(lines);
  const bankStructure = /(?:data\s+.*(?:historico|descricao|lancamento|movimento))|saldo (?:anterior|inicial|final do periodo)|conta corrente|extrato (?:bancario|de conta|conta)/.test(text);
  let detected = platform.platform ? INSTITUTION_CATALOG.find((entry) => entry.provider === platform.platform) : undefined;
  if (!detected && /extrato de pagamento|historico de creditos|beneficio/.test(text) && getInstitution("INSS")!.aliases.some((alias) => matchesAlias(headers, alias))) detected = getInstitution("INSS");
  const bankCandidate = getInstitution(bank.bankCode as InstitutionId);
  if (!detected && bank.confidence >= 0.65 && bankCandidate?.aliases.some((alias) => matchesAlias(headers, alias))) detected = bankCandidate;
  if (!detected) {
    const candidates = INSTITUTION_CATALOG.filter((entry) => entry.id !== "OTHER" && entry.aliases.some((alias) => matchesAlias(headers, alias))
      && (entry.category === "BANK" ? bankStructure : /comprovante|resumo de ganhos|extrato de pagamento|beneficio|historico de creditos|resumo fiscal/.test(text)));
    if (candidates.length === 1) detected = candidates[0];
  }
  if (detected?.id === "ITAU" && /poupanca/.test(headers)) detected = getInstitution("ITAU_POUPANCA");
  const choice = getInstitution(selected);
  const method = selected === "AUTO" ? "AUTO" : "MANUAL";
  const effective = choice || detected;
  const result: InstitutionResolution = { detectedInstitution: detected?.id || null, institutionSelectionMethod: method, readingMethod: null, parserId: null, bankCode: detected?.bankCode || bank.bankCode, selectionBlocked: false, incompatibilityWarnings: [], warnings: [] };
  const block = (warning: string) => ({ ...result, selectionBlocked: true, incompatibilityWarnings: [warning], warnings: [warning] });
  if (choice && detected && choice.id !== detected.id && !(choice.id === "OTHER" && detected.category === "BANK")) {
    return block(`Seleção incompatível: você escolheu ${choice.label}, mas o documento foi identificado como ${detected.label}. Revise a seleção deste arquivo antes de prosseguir.`);
  }
  if (effective?.capability === "UNSUPPORTED") return { ...block(`${effective.label}: documento ainda não suportado. Nenhum valor de renda foi extraído. Remova este arquivo ou revise sua seleção.`), readingMethod: "UNSUPPORTED" };
  if (choice?.capability === "SPECIFIC_PLATFORM" && platform.platform !== choice.provider) return block(`Não foi possível confirmar um comprovante ${choice.label} compatível. Revise a seleção ou o documento antes de prosseguir.`);
  if (effective?.capability === "SPECIFIC_PLATFORM") return { ...result, readingMethod: "PLATFORM", parserId: effective.parserId };
  if (effective?.capability === "GENERIC_BANK") {
    if (!bankStructure) return block(`O documento não apresenta estrutura bancária compatível com leitura genérica de ${effective.label}. Revise a seleção ou o arquivo.`);
    return { ...result, bankCode: effective.bankCode, readingMethod: "GENERIC_BANK", parserId: "generic", warnings: ["Leitura bancária genérica: confiança reduzida; revisão das movimentações e conciliação obrigatória.", ...(!detected && choice ? ["A instituição informada não pôde ser confirmada no documento."] : [])] };
  }
  if (choice?.capability === "SPECIFIC_BANK") {
    if (!detected) return block(`Não foi possível confirmar ${choice.label} de forma independente. Revise a seleção; detecção automática ou leitura genérica podem ser utilizadas quando compatíveis.`);
    const parser = getStatementParser(choice.parserId!);
    if (!parser || parser.canHandle({ bankCode: "AUTO", source: "PDF_TEXT", account: "" }, text) < 0.75) {
      if (!bankStructure) return block(`Layout incompatível com o parser ${choice.label}. Revise o documento antes de prosseguir.`);
      return { ...result, parserId: "generic", readingMethod: "GENERIC_BANK", warnings: [`Instituição ${choice.label} identificada, mas este layout não é compatível com seu parser específico. Leitura genérica com confiança reduzida e revisão necessária.`] };
    }
    return { ...result, parserId: choice.parserId, readingMethod: "SPECIFIC_BANK", bankCode: choice.bankCode };
  }
  // Automatic selection keeps the existing registry's independent parser ranking/fallback.
  return { ...result, readingMethod: "SPECIFIC_BANK" };
}

export function changeFileInstitution(files: StatementFileRecord[], id: string, selection: InstitutionSelection): StatementFileRecord[] {
  return files.map((file) => file.id !== id ? file : {
    ...file, selectedInstitution: selection, institutionSelectionMethod: selection === "AUTO" ? "AUTO" : "MANUAL",
    detectedInstitution: null, readingMethod: null, incompatibilityWarnings: [], selectionBlocked: false,
    status: "READY", bank: "AUTO", extractionMethod: null, transactions: [], platformDocument: null, parserId: "", warnings: [], contentKind: "UNKNOWN",
    periodStart: null, periodEnd: null,
    reconciliation: { status: "NO_SUMMARY", creditTotal: 0, debitTotal: 0, statementCreditTotal: null, statementDebitTotal: null, openingBalance: null, closingBalance: null, difference: null, method: "NOT_AVAILABLE", warnings: [] },
  });
}

export function fileInstitutionLabel(file: StatementFileRecord) {
  const detected = getInstitution(file.detectedInstitution);
  const selected = getInstitution(file.selectedInstitution);
  const legacy = file.selectedInstitution === undefined && file.detectedInstitution === undefined ? getInstitution(file.bank as InstitutionId)?.label : null;
  return detected?.label || (selected ? `${selected.label} (informada)` : legacy || "Instituição não identificada");
}
export function fileReadingLabel(file: StatementFileRecord) {
  if (!file.readingMethod && !file.parserId) return "Não processado";
  const method = file.readingMethod || (file.platformDocument ? "PLATFORM" : file.parserId === "generic" ? "GENERIC_BANK" : file.parserId === "spreadsheet-auto" ? "SPREADSHEET" : "SPECIFIC_BANK");
  return { SPECIFIC_BANK: "Parser bancário específico", GENERIC_BANK: "Leitura bancária genérica · revisão necessária", PLATFORM: "Comprovante de plataforma", SPREADSHEET: "Mapeamento de planilha", UNSUPPORTED: "Documento não suportado" }[method];
}
