import type { ReconstructedPdfLine } from "../../types/pdfImport";
import type {
  CounterpartyEntityType,
  CounterpartyIdentity,
  IncomeAnalysisParties,
  NormalizedBankTransaction,
  PartyDocumentType,
  RelatedPartyClassification,
  RelatedPartyExclusionSummary,
  RelatedPartyIdentity,
  RelatedPartyType,
} from "../../types/statementAnalysis";

const BANK_PREFIXES = /^(?:(?:REMETENTE|REMET|REM|FAVORECIDO|FAV|DESTINATARIO|DES)\s*:?[\s-]*)+/;
const BUSINESS_INDICATORS = [
  "ME", "MEI", "EPP", "LTDA", "LIMITADA", "S A", "SA", "EIRELI", "SLU", "EI",
  "EMPRESA INDIVIDUAL", "COMERCIO", "SERVICOS", "TECNOLOGIA", "CORRETORA",
  "INSTITUICAO", "PAGAMENTOS",
] as const;
const BUSINESS_PATTERN = new RegExp(`\\b(?:${BUSINESS_INDICATORS.join("|").replace(/ /g, "\\s+")})\\b`, "i");
const TRANSFER_PATTERN = /\b(?:TED|PIX|TRANSFERENCIA|TRANSF|ENTRE CONTAS|CREDITO EM CONTA)\b/;

function digits(value: string | null | undefined): string {
  return (value || "").replace(/\D/g, "");
}

function validCpf(value: string): boolean {
  const number = digits(value);
  if (number.length !== 11 || /^(\d)\1+$/.test(number)) return false;
  const digit = (length: number) => {
    const sum = number.slice(0, length).split("").reduce((total, item, index) => total + Number(item) * (length + 1 - index), 0);
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };
  return digit(9) === Number(number[9]) && digit(10) === Number(number[10]);
}

function validCnpj(value: string): boolean {
  const number = digits(value);
  if (number.length !== 14 || /^(\d)\1+$/.test(number)) return false;
  const calculate = (length: 12 | 13) => {
    const weights = length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = number.slice(0, length).split("").reduce((total, item, index) => total + Number(item) * weights[index], 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };
  return calculate(12) === Number(number[12]) && calculate(13) === Number(number[13]);
}

export function normalizePartyName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[./_,;()[\]{}]+/g, " ")
    .replace(/[^A-Z0-9&'\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(BANK_PREFIXES, "")
    .replace(/\s+/g, " ")
    .trim();
}

function documentFromText(text: string): { documentType: PartyDocumentType; documentNumber: string | null } {
  const cnpj = text.match(/(?:CNPJ\s*:?[\s-]*)?(\d{2}[.\s]?\d{3}[.\s]?\d{3}[\/\s]?\d{4}-?\d{2})/i)?.[1];
  if (cnpj && validCnpj(cnpj)) return { documentType: "CNPJ", documentNumber: digits(cnpj) };
  if (/\bCNPJ\b/i.test(text) && cnpj) return { documentType: "CNPJ", documentNumber: digits(cnpj) };
  const cpf = text.match(/(?:CPF\s*:?[\s-]*)?(\d{3}[.\s]?\d{3}[.\s]?\d{3}-?\d{2})/i)?.[1];
  if (cpf && validCpf(cpf)) return { documentType: "CPF", documentNumber: digits(cpf) };
  if (/\bCPF\b/i.test(text) && cpf) return { documentType: "CPF", documentNumber: digits(cpf) };
  return { documentType: "UNKNOWN", documentNumber: null };
}

export function createRelatedPartyIdentity(name: string, documentNumber = "", aliases: string[] = []): RelatedPartyIdentity {
  const normalizedName = normalizePartyName(name);
  const normalizedDocument = digits(documentNumber);
  const documentType: PartyDocumentType = validCnpj(normalizedDocument) ? "CNPJ" : validCpf(normalizedDocument) ? "CPF" : "UNKNOWN";
  return {
    name: name.trim(),
    normalizedName,
    documentType,
    documentNumber: documentType === "UNKNOWN" ? null : normalizedDocument,
    aliases: aliases.map(normalizePartyName).filter(Boolean),
  };
}

export function extractAccountHolderIdentity(lines: ReconstructedPdfLine[]): RelatedPartyIdentity | null {
  const header = lines.filter((line) => line.pageNumber === 1).slice(0, 80);
  const labelPatterns = [
    /^\s*(?:NOME(?:\s+DO\s+CLIENTE)?|TITULAR|CORRENTISTA)\s*:\s*(.+?)\s*$/i,
    /^\s*CLIENTE\s*:\s*(.+?)\s*$/i,
  ];
  for (const pattern of labelPatterns) {
    for (let index = 0; index < header.length; index += 1) {
      const candidate = (header[index].text.match(pattern)?.[1] || "").trim();
      const normalized = normalizePartyName(candidate);
      if (!normalized || normalized.split(" ").length < 2 || /\b(?:AGENCIA|CONTA|EXTRATO|PERIODO|CPF|CNPJ)\b/.test(normalized)) continue;
      const document = documentFromText(header.slice(index, index + 4).map((line) => line.text).join(" "));
      return { ...createRelatedPartyIdentity(candidate, document.documentNumber || ""), documentType: document.documentType };
    }
  }
  const standaloneLabel = /^\s*(?:NOME(?:\s+DO\s+CLIENTE)?|TITULAR|CORRENTISTA|CLIENTE)\s*:?\s*$/i;
  for (let index = 0; index < header.length - 1; index += 1) {
    if (!standaloneLabel.test(header[index].text)) continue;
    const candidate = header[index + 1].text.trim();
    const normalized = normalizePartyName(candidate);
    if (!normalized || normalized.split(" ").length < 2 || /\b(?:AGENCIA|CONTA|EXTRATO|PERIODO|CPF|CNPJ)\b/.test(normalized)) continue;
    const document = documentFromText(header.slice(index, index + 5).map((line) => line.text).join(" "));
    return { ...createRelatedPartyIdentity(candidate, document.documentNumber || ""), documentType: document.documentType };
  }
  return null;
}

function cleanCounterpartyCandidate(value: string): string {
  return value
    .replace(/(?:R\$\s*)?[+-]?\s*(?:\d{1,3}(?:\.\d{3})*|\d+),\d{2}.*$/i, "")
    .replace(/\s+(?:\d{2}[\/-]\d{2}(?:[\/-]\d{2,4})?|PIX\s+(?:RECEBIDO|ENVIADO)|RECEBIMENTO\s+TED|TRANSFERENCIA\s+(?:RECEBIDA|ENVIADA)|COMPRA(?:\s+NO\s+DEBITO)?|PAGAMENTO|APLICACAO|RESGATE|SALDO)\b.*$/i, "")
    .replace(/\b(?:CPF|CNPJ|AGENCIA|CONTA|BANCO|BCO)\b.*$/i, "")
    .replace(/\*{3,}[\d*./-]*/g, "")
    .replace(/\s+-\s+(?:\d|BANCO|BCO|AGENCIA|CONTA).*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractCounterpartyName(value: string): string | null {
  const compact = value.replace(/\s+/g, " ").trim();
  if (!compact) return null;
  const patterns = [
    /\b(?:REMETENTE|REMET\.?|REM\.?|FAVORECIDO|FAV\.?|DES\.?)\s*:?[\s-]*(.+)$/i,
    /\bTRANSFERENCIA\s+RECEBIDA(?:\s+PELO\s+PIX)?\s+(.+)$/i,
    /\bPIX\s+RECEBIDO(?:\s+DE)?\s+(.+)$/i,
    /\bRECEBIMENTO\s+TED(?:\s+[A-Z])?\s+(.+)$/i,
  ];
  for (const pattern of patterns) {
    const candidate = compact.match(pattern)?.[1];
    if (!candidate) continue;
    const cleaned = cleanCounterpartyCandidate(candidate);
    if (normalizePartyName(cleaned).split(" ").length >= 2) return cleaned;
  }
  return null;
}

function stripBusinessIndicators(value: string): string {
  let result = value;
  for (const indicator of BUSINESS_INDICATORS) {
    result = result.replace(new RegExp(`\\b${indicator.replace(/ /g, "\\s+")}\\b`, "g"), " ");
  }
  return result.replace(/\s+/g, " ").trim();
}

export function detectCounterpartyEntityType(identity: Pick<CounterpartyIdentity, "normalizedName" | "documentType">): CounterpartyEntityType {
  if (identity.documentType === "CNPJ") return "COMPANY";
  if (identity.normalizedName && BUSINESS_PATTERN.test(identity.normalizedName)) return "COMPANY";
  if (identity.documentType === "CPF") return "INDIVIDUAL";
  if (identity.normalizedName && identity.normalizedName.split(" ").filter(Boolean).length >= 2) return "INDIVIDUAL";
  return "UNKNOWN";
}

export function buildCounterpartyIdentity(transaction: NormalizedBankTransaction): CounterpartyIdentity {
  const source = `${transaction.counterparty} ${transaction.description}`.trim();
  const rawName = cleanCounterpartyCandidate(transaction.counterparty.trim()) || extractCounterpartyName(transaction.description);
  const extractedDocument = documentFromText(source);
  const storedDocumentType = transaction.counterpartyIdentity?.documentType;
  const storedDocumentNumber = transaction.counterpartyIdentity?.documentNumber || null;
  const storedDocumentIsValid = storedDocumentType === "CNPJ"
    ? validCnpj(storedDocumentNumber || "")
    : storedDocumentType === "CPF" && validCpf(storedDocumentNumber || "");
  const documentType: PartyDocumentType = storedDocumentIsValid && storedDocumentType
    ? storedDocumentType
    : extractedDocument.documentType;
  const documentNumber = storedDocumentIsValid ? digits(storedDocumentNumber) : extractedDocument.documentNumber;
  const normalizedName = rawName ? normalizePartyName(rawName) : null;
  const provisional = { rawName, normalizedName, documentType, documentNumber, entityType: "UNKNOWN" as const, confidence: rawName ? 0.82 : 0.35 };
  return { ...provisional, entityType: detectCounterpartyEntityType(provisional), confidence: documentType !== "UNKNOWN" ? 0.98 : BUSINESS_PATTERN.test(normalizedName || "") ? 0.94 : provisional.confidence };
}

type IdentityMatch = { status: "MATCH" | "AMBIGUOUS" | "NONE"; confidence: number; evidence: string[] };

function matchIdentity(counterparty: CounterpartyIdentity, party: RelatedPartyIdentity): IdentityMatch {
  if (counterparty.documentNumber && party.documentNumber && counterparty.documentType === party.documentType) {
    return counterparty.documentNumber === party.documentNumber
      ? { status: "MATCH", confidence: 1, evidence: [`${counterparty.documentType} correspondente.`] }
      : { status: "NONE", confidence: 1, evidence: ["Documentos identificados são diferentes."] };
  }
  const candidate = counterparty.normalizedName || "";
  const acceptedNames = [party.normalizedName, ...party.aliases].filter(Boolean);
  if (acceptedNames.includes(candidate)) return { status: "MATCH", confidence: 0.98, evidence: ["Nome completo normalizado correspondente."] };
  const originalShowsTruncation = Boolean(counterparty.rawName && /\.{2,}|…/.test(counterparty.rawName));
  for (const accepted of acceptedNames) {
    const candidateTokens = candidate.split(" ").filter(Boolean);
    const acceptedTokens = accepted.split(" ").filter(Boolean);
    if (candidateTokens.length < 2 || candidateTokens.length > acceptedTokens.length || candidateTokens[0] !== acceptedTokens[0]) continue;
    const tokensMatch = candidateTokens.every((token, index) => index === candidateTokens.length - 1 ? acceptedTokens[index]?.startsWith(token) : token === acceptedTokens[index]);
    if (!tokensMatch) continue;
    const coverage = candidate.replace(/\s/g, "").length / Math.max(1, accepted.replace(/\s/g, "").length);
    if (originalShowsTruncation && candidateTokens.length >= 3 && coverage >= 0.75) return { status: "MATCH", confidence: 0.9, evidence: ["Nome truncado com alta cobertura e sem conflito documental."] };
    if (coverage >= 0.55) return { status: "AMBIGUOUS", confidence: 0.62, evidence: ["Nome possivelmente truncado, sem evidência suficiente para exclusão automática."] };
  }
  return { status: "NONE", confidence: 0.92, evidence: ["Nome e documento não correspondem."] };
}

function companyRelationship(counterparty: CounterpartyIdentity, parties: IncomeAnalysisParties): RelatedPartyType {
  const baseName = stripBusinessIndicators(counterparty.normalizedName || "");
  if (baseName && parties.accountHolder && matchIdentity({ ...counterparty, normalizedName: baseName }, parties.accountHolder).status !== "NONE") return "ACCOUNT_HOLDER";
  if (baseName && parties.spouses.some((spouse) => matchIdentity({ ...counterparty, normalizedName: baseName }, spouse).status !== "NONE")) return "SPOUSE";
  return "THIRD_PARTY";
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function identityAppearsInText(text: string, party: RelatedPartyIdentity): boolean {
  return [party.normalizedName, ...party.aliases]
    .filter(Boolean)
    .some((name) => new RegExp(`\\b${escapeRegExp(name).replace(/\\ /g, "\\s+")}\\b`).test(text));
}

function businessIdentityAppearsInText(text: string, party: RelatedPartyIdentity): boolean {
  return [party.normalizedName, ...party.aliases]
    .filter(Boolean)
    .some((name) => new RegExp(`\\b${escapeRegExp(name).replace(/\\ /g, "\\s+")}\\s+(?:${BUSINESS_INDICATORS.join("|").replace(/ /g, "\\s+")})\\b`).test(text));
}

export function classifyRelatedPartyCredit(transaction: NormalizedBankTransaction, parties: IncomeAnalysisParties): RelatedPartyClassification {
  if (transaction.direction !== "CREDIT") return { relationship: "UNKNOWN", decision: "CONTINUE_THIRD_PARTY_CLASSIFICATION", reason: "Movimentação sem crédito recebido.", confidence: 1, evidence: [] };
  const counterparty = buildCounterpartyIdentity(transaction);
  const transactionText = normalizePartyName(`${transaction.description} ${transaction.counterparty}`);
  const transferLike = TRANSFER_PATTERN.test(transactionText);
  const holderCompanyInBlock = parties.accountHolder ? businessIdentityAppearsInText(transactionText, parties.accountHolder) : false;
  const spouseCompanyInBlock = parties.spouses.some((spouse) => businessIdentityAppearsInText(transactionText, spouse));
  if (holderCompanyInBlock || spouseCompanyInBlock) {
    const relationship = holderCompanyInBlock ? "ACCOUNT_HOLDER" : "SPOUSE";
    return { relationship, decision: "CONTINUE_COMPANY_CLASSIFICATION", reason: `Origem empresarial com nome semelhante ao ${relationship === "ACCOUNT_HOLDER" ? "titular" : "cônjuge"}; o crédito seguirá o classificador normal.`, confidence: 0.94, evidence: ["Indicador empresarial associado ao nome no bloco da movimentação."] };
  }
  if (counterparty.entityType === "COMPANY") {
    const relationship = companyRelationship(counterparty, parties);
    const similar = relationship === "ACCOUNT_HOLDER" ? "titular" : relationship === "SPOUSE" ? "cônjuge" : null;
    return { relationship, decision: "CONTINUE_COMPANY_CLASSIFICATION", reason: similar ? `Origem empresarial com nome semelhante ao ${similar}; o crédito seguirá o classificador normal.` : "Origem empresarial identificada; o crédito seguirá o classificador normal.", confidence: counterparty.confidence, evidence: [counterparty.documentType === "CNPJ" ? "CNPJ identificado." : "Indicador empresarial em token completo."] };
  }
  if (!transferLike) return { relationship: "THIRD_PARTY", decision: "CONTINUE_THIRD_PARTY_CLASSIFICATION", reason: "Crédito não identificado como TED, PIX ou transferência entre contas.", confidence: 0.8, evidence: [] };
  if (parties.accountHolder) {
    const holderMatch = matchIdentity(counterparty, parties.accountHolder);
    if (holderMatch.status === "MATCH") return { relationship: "ACCOUNT_HOLDER", decision: "EXCLUDE_SAME_HOLDER", reason: "Transferência de mesma titularidade.", confidence: holderMatch.confidence, evidence: holderMatch.evidence };
    if (holderMatch.status === "AMBIGUOUS") return { relationship: "UNKNOWN", decision: "REVIEW_REQUIRED", reason: "Possível transferência de mesma titularidade - nome do remetente incompleto.", confidence: holderMatch.confidence, evidence: holderMatch.evidence };
    if (identityAppearsInText(transactionText, parties.accountHolder)) return { relationship: "ACCOUNT_HOLDER", decision: "EXCLUDE_SAME_HOLDER", reason: "Transferência de mesma titularidade.", confidence: 0.93, evidence: ["Nome completo do titular identificado no bloco da movimentação recebida."] };
  }
  for (const spouse of parties.spouses) {
    const spouseMatch = matchIdentity(counterparty, spouse);
    if (spouseMatch.status === "MATCH") return { relationship: "SPOUSE", decision: "EXCLUDE_SPOUSE", reason: "Transferência recebida de cônjuge.", confidence: spouseMatch.confidence, evidence: spouseMatch.evidence };
    if (spouseMatch.status === "AMBIGUOUS") return { relationship: "UNKNOWN", decision: "REVIEW_REQUIRED", reason: "Possível transferência de cônjuge - nome do remetente incompleto.", confidence: spouseMatch.confidence, evidence: spouseMatch.evidence };
    if (identityAppearsInText(transactionText, spouse)) return { relationship: "SPOUSE", decision: "EXCLUDE_SPOUSE", reason: "Transferência recebida de cônjuge.", confidence: 0.93, evidence: ["Nome completo do cônjuge identificado no bloco da movimentação recebida."] };
  }
  return { relationship: counterparty.rawName ? "THIRD_PARTY" : "UNKNOWN", decision: "CONTINUE_THIRD_PARTY_CLASSIFICATION", reason: counterparty.rawName ? "Remetente diferente das partes relacionadas informadas." : "Remetente não identificado; seguir para revisão das demais regras.", confidence: counterparty.confidence, evidence: [] };
}

export function applyRelatedPartyIncomeRule(transaction: NormalizedBankTransaction, parties: IncomeAnalysisParties): NormalizedBankTransaction {
  const counterpartyIdentity = buildCounterpartyIdentity(transaction);
  const relatedPartyClassification = classifyRelatedPartyCredit(transaction, parties);
  const base = { ...transaction, counterparty: transaction.counterparty || counterpartyIdentity.rawName || "", counterpartyIdentity, relatedPartyClassification };
  if (relatedPartyClassification.decision === "EXCLUDE_SAME_HOLDER") return { ...base, classification: "EXCLUDED_SAME_OWNER", classificationReason: relatedPartyClassification.reason, classificationConfidence: relatedPartyClassification.confidence };
  if (relatedPartyClassification.decision === "EXCLUDE_SPOUSE") return { ...base, classification: "EXCLUDED_SPOUSE", classificationReason: relatedPartyClassification.reason, classificationConfidence: relatedPartyClassification.confidence };
  if (relatedPartyClassification.decision === "REVIEW_REQUIRED") return { ...base, classification: "PENDING_REVIEW", classificationReason: relatedPartyClassification.reason, classificationConfidence: relatedPartyClassification.confidence, warnings: [...base.warnings, relatedPartyClassification.reason] };
  if (relatedPartyClassification.decision === "CONTINUE_COMPANY_CLASSIFICATION" && ["EXCLUDED_SAME_OWNER", "EXCLUDED_SPOUSE", "EXCLUDED_RELATED_PERSON"].includes(base.classification)) {
    return { ...base, classification: "PENDING_REVIEW", classificationReason: relatedPartyClassification.reason, classificationConfidence: relatedPartyClassification.confidence };
  }
  if (relatedPartyClassification.decision === "CONTINUE_THIRD_PARTY_CLASSIFICATION" && base.classification === "EXCLUDED_SAME_OWNER") {
    return { ...base, classification: "PENDING_REVIEW", classificationReason: relatedPartyClassification.reason, classificationConfidence: relatedPartyClassification.confidence };
  }
  return base;
}

export function calculateRelatedPartyExclusions(transactions: NormalizedBankTransaction[], parties: IncomeAnalysisParties): RelatedPartyExclusionSummary {
  const credits = transactions.filter((item) => item.direction === "CREDIT");
  const sum = (predicate: (item: NormalizedBankTransaction) => boolean) => credits.filter(predicate).reduce((total, item) => total + item.amount, 0);
  return {
    sameHolderAmount: sum((item) => item.classification === "EXCLUDED_SAME_OWNER"),
    spouseAmount: sum((item) => item.classification === "EXCLUDED_SPOUSE"),
    homonymousCompanyAmount: sum((item) => item.relatedPartyClassification?.decision === "CONTINUE_COMPANY_CLASSIFICATION" && ["ACCOUNT_HOLDER", "SPOUSE"].includes(item.relatedPartyClassification.relationship)),
    reviewAmount: sum((item) => item.relatedPartyClassification?.decision === "REVIEW_REQUIRED"),
    spouseValidationApplied: parties.spouses.length > 0,
  };
}
