import type { ReconstructedPdfLine } from "../../../types/pdfImport";
import type {
  CtpsAlert,
  CtpsAnalysis,
  CtpsConfidence,
  CtpsContractRecord,
  CtpsContractType,
  CtpsEmployment,
  CtpsEmploymentEvent,
  CtpsEventType,
  CtpsSalaryPeriodicity,
  CtpsSalaryRecord,
} from "../../../types/ctpsAnalysis";

export interface CtpsParseOptions {
  pageCount?: number;
  textCharacters?: number;
  analysisDate?: Date | string;
  extractionMethod?: CtpsAnalysis["document"]["extractionMethod"];
}

interface TextLine {
  text: string;
  pageNumber: number;
}

const DATE_SOURCE = "(\\d{2}\\/\\d{2}\\/\\d{4})";
const CONTRACT_PERIOD = new RegExp(`^${DATE_SOURCE}\\s*[-–—]\\s*(Aberto|${DATE_SOURCE})$`, "i");
const MONEY = /R\$?\s*(-?\s*\d{1,3}(?:\.\d{3})*(?:,\d{2})|-?\s*\d+(?:,\d{2}))/i;

function normalized(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}

function cleanValue(value: string): string | null {
  const cleaned = value.replace(/^[:\-–—\s]+/, "").trim();
  return cleaned || null;
}

export function parseCtpsDate(value: string | null | undefined): string | null {
  const match = value?.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!match) return null;
  const iso = `${match[3]}-${match[2]}-${match[1]}`;
  const date = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== iso ? null : iso;
}

export function parseCtpsMoney(value: string | null | undefined): number | null {
  const match = value?.match(MONEY);
  if (!match) return null;
  const cents = Number(match[1].replace(/\s/g, "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(cents) ? Math.round(Math.abs(cents) * 100) / 100 : null;
}

function isoAnalysisDate(value: Date | string | undefined): string {
  const date = value instanceof Date ? value : value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function lineValue(lines: TextLine[], label: RegExp): string | null {
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].text.match(label);
    if (!match) continue;
    const inline = cleanValue(match[1] || "");
    if (inline) return inline;
    const next = lines[index + 1]?.text;
    if (next && !/:\s*$/.test(next)) return cleanValue(next);
  }
  return null;
}

function findDateField(lines: TextLine[], label: RegExp): string | null {
  return parseCtpsDate(lineValue(lines, label));
}

function inferEmployerName(lines: TextLine[]): string | null {
  const explicit = lineValue(lines, /^\s*Empregador\s*:?[\s]*(.*)$/i);
  if (explicit && !/^(cnpj|cpf|estabelecimento)$/i.test(explicit)) return explicit;
  const cnpjIndex = lines.findIndex((line) => /CNPJ\s*(?:raiz)?\s*:/i.test(line.text));
  if (cnpjIndex > 0) {
    const candidate = lines[cnpjIndex - 1].text.trim();
    if (!/^(empregador|contrato de trabalho|dados do contrato)$/i.test(candidate)) return candidate;
  }
  return null;
}

function parseCnpjs(lines: TextLine[]): string[] {
  return lines.flatMap((line) => line.text.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g) || []);
}

function parseContractType(text: string | null | undefined): CtpsContractType {
  const value = normalized(text || "");
  if (/indeterminado/.test(value)) return "INDEFINITE";
  if (/determinado|prazo fixo/.test(value)) return "FIXED_TERM";
  return "UNKNOWN";
}

function parsePeriodicity(text: string): CtpsSalaryPeriodicity {
  const value = normalized(text);
  if (/por hora|horario|hora\b/.test(value)) return "HOURLY";
  if (/por dia|diario|dia\b/.test(value)) return "DAILY";
  if (/mensal|por mes|mes\b/.test(value)) return "MONTHLY";
  return "MONTHLY";
}

function eventType(text: string): CtpsEventType {
  const value = normalized(text);
  if (/rescis|desligamento|termino do contrato/.test(value)) return "TERMINATION";
  if (/salario/.test(value)) return "SALARY_CHANGE";
  if (/\bcargo\b|ocupacao/.test(value)) return "POSITION_CHANGE";
  if (/\bcbo\b/.test(value)) return "CBO_CHANGE";
  if (/estabelecimento/.test(value)) return "ESTABLISHMENT_CHANGE";
  if (/ferias/.test(value)) return "VACATION";
  if (/tipo de contrato|prazo determinado|prazo indeterminado|contrato alterado/.test(value)) return "CONTRACT_CHANGE";
  if (/relacao de trabalho/.test(value)) return "EMPLOYMENT_RELATION_CHANGE";
  if (/admissao|admitido/.test(value)) return "ADMISSION";
  return "OTHER";
}

function effectiveDate(text: string): string | null {
  const match = text.match(/(?:efeito(?:\s+a\s+partir\s+de|\s+em)?|a\s+partir\s+de|vig[eê]ncia(?:\s+em)?|desde)\s*:?[\s]*(\d{2}\/\d{2}\/\d{4})/i);
  return parseCtpsDate(match?.[1]);
}

function positionFromEvent(text: string): string {
  return cleanValue(
    text
      .replace(/^\d{2}\/\d{2}\/\d{4}\s*[-–—:]?\s*/, "")
      .replace(/^.*?(?:cargo|ocupa[cç][aã]o)(?:\s+(?:alterado|definido))?\s+(?:para)?/i, "")
      .replace(/\s+(?:com efeito|a partir|vig[eê]ncia|desde)\b.*$/i, ""),
  ) || "Cargo não identificado";
}

function cboFromEvent(text: string): string | null {
  return text.match(/CBO(?:\s+(?:alterado|definido))?\s*(?:para)?\s*:?[\s]*(\d[\d.-]*)/i)?.[1] || null;
}

function parseAnnotationEvents(lines: TextLine[]): CtpsEmploymentEvent[] {
  const annotationIndex = lines.findIndex((line) => /^(anota[cç][oõ]es|hist[oó]rico de anota[cç][oõ]es|eventos)$/i.test(line.text.trim()));
  const source = annotationIndex >= 0 ? lines.slice(annotationIndex + 1) : lines;
  const groups: TextLine[][] = [];
  let current: TextLine[] = [];
  source.forEach((line) => {
    if (/^\d{2}\/\d{2}\/\d{4}\b/.test(line.text)) {
      if (current.length) groups.push(current);
      current = [line];
    } else if (current.length && !CONTRACT_PERIOD.test(line.text.trim())) {
      current.push(line);
    }
  });
  if (current.length) groups.push(current);
  return groups.map((group) => {
    const originalText = group.map((line) => line.text.trim()).join(" ").replace(/\s+/g, " ");
    const recordedAt = parseCtpsDate(originalText);
    const withoutLeadingDate = originalText.replace(/^\d{2}\/\d{2}\/\d{4}\s*[-–—:]?\s*/, "");
    return {
      type: eventType(withoutLeadingDate),
      recordedAt,
      effectiveFrom: effectiveDate(withoutLeadingDate) || recordedAt,
      originalText,
      pageNumber: group[0].pageNumber,
    };
  });
}

function salaryFromEvent(event: CtpsEmploymentEvent): CtpsSalaryRecord | null {
  if (event.type !== "SALARY_CHANGE") return null;
  const amount = parseCtpsMoney(event.originalText);
  if (amount === null) return null;
  return {
    amount,
    recordedAt: event.recordedAt,
    effectiveFrom: event.effectiveFrom,
    periodicity: parsePeriodicity(event.originalText),
    confidence: "HIGH",
    source: "HISTORY",
    originalText: event.originalText,
  };
}

function byEffectiveDate<T extends { effectiveFrom?: string | null; recordedAt?: string | null }>(a: T, b: T): number {
  return (a.effectiveFrom || a.recordedAt || "").localeCompare(b.effectiveFrom || b.recordedAt || "");
}

function parseContractHistory(events: CtpsEmploymentEvent[], initialType: CtpsContractType, admissionDate: string | null, raw: string): CtpsContractRecord[] {
  const records: CtpsContractRecord[] = [];
  if (initialType !== "UNKNOWN") records.push({ type: initialType, from: admissionDate, to: null, originalText: raw });
  events.filter((event) => event.type === "CONTRACT_CHANGE").forEach((event) => {
    const type = parseContractType(event.originalText);
    if (type !== "UNKNOWN") records.push({ type, from: event.effectiveFrom, to: null, originalText: event.originalText });
  });
  records.sort((a, b) => (a.from || "").localeCompare(b.from || ""));
  return records.map((record, index) => ({ ...record, to: records[index + 1]?.from || record.to }));
}

function employmentId(index: number, cnpj: string | null, admissionDate: string | null): string {
  return `ctps-${index + 1}-${(cnpj || "sem-cnpj").replace(/\D/g, "")}-${admissionDate || "sem-data"}`;
}

function parseEmployment(lines: TextLine[], index: number, alerts: CtpsAlert[]): CtpsEmployment {
  const periodLine = lines.find((line) => CONTRACT_PERIOD.test(line.text.trim()));
  const period = periodLine?.text.trim().match(CONTRACT_PERIOD);
  const admissionDate = parseCtpsDate(period?.[1]);
  let terminationDate = period?.[2] && !/^aberto$/i.test(period[2]) ? parseCtpsDate(period[2]) : null;
  const cnpjs = parseCnpjs(lines);
  const employer = { name: inferEmployerName(lines), cnpj: cnpjs[0] || null };
  const establishmentName = lineValue(lines, /^\s*Estabelecimento\s*:?[\s]*(.*)$/i);
  const establishment = { name: establishmentName, cnpj: cnpjs[1] || cnpjs[0] || null };
  const positionField = lineValue(lines, /^\s*(?:Cargo|Ocupa[cç][aã]o)\s*:?[\s]*(.*)$/i);
  const cboField = lineValue(lines, /^\s*CBO\s*:?[\s]*(.*)$/i);
  const contractField = lineValue(lines, /^\s*Tipo\s+de\s+contrato\s*:?[\s]*(.*)$/i);
  const employmentRelation = lineValue(lines, /^\s*Rela[cç][aã]o\s+de\s+trabalho\s*:?[\s]*(.*)$/i);
  const admissionType = lineValue(lines, /^\s*Tipo\s+de\s+admiss[aã]o\s*:?[\s]*(.*)$/i);
  const events = parseAnnotationEvents(lines);
  const termination = events.filter((event) => event.type === "TERMINATION").sort((a, b) => byEffectiveDate(a, b)).at(-1);
  if (termination) terminationDate = termination.effectiveFrom || termination.recordedAt || terminationDate;
  const salaryHistory = events.flatMap((event) => salaryFromEvent(event) || []).sort(byEffectiveDate);
  const contractualSalaryLine = lines.find((line) => /sal[aá]rio\s+contratual/i.test(line.text));
  const contractualAmount = parseCtpsMoney(contractualSalaryLine?.text);
  const contractualSalary: CtpsSalaryRecord | null = contractualAmount === null ? null : {
    amount: contractualAmount,
    recordedAt: null,
    effectiveFrom: admissionDate,
    periodicity: parsePeriodicity(contractualSalaryLine?.text || ""),
    confidence: salaryHistory.length ? "HIGH" : "MEDIUM",
    source: "CONTRACTUAL_FIELD",
    originalText: contractualSalaryLine?.text || "Salário contratual",
  };
  const latestHistory = salaryHistory.at(-1) || null;
  const id = employmentId(index, employer.cnpj, admissionDate);
  let currentSalary = contractualSalary || (latestHistory ? { ...latestHistory, confidence: "MEDIUM" as const } : null);
  if (contractualSalary && latestHistory && Math.abs(contractualSalary.amount - latestHistory.amount) >= 0.01) {
    currentSalary = { ...contractualSalary, confidence: "LOW" };
    alerts.push({ code: "SALARY_CONFLICT", severity: "WARNING", employmentId: id, message: `O salário contratual diverge da última anotação salarial em ${employer.name || "um vínculo"}. O campo contratual foi mantido para revisão.` });
  }
  if (!admissionDate) alerts.push({ code: "MISSING_ADMISSION_DATE", severity: "CRITICAL", employmentId: id, message: `Vínculo de ${employer.name || "empregador não identificado"} sem data de admissão.` });
  const status = terminationDate ? "TERMINATED" as const : "ACTIVE" as const;
  if (status === "ACTIVE" && !currentSalary) alerts.push({ code: "MISSING_ACTIVE_SALARY", severity: "WARNING", employmentId: id, message: `Contrato aberto de ${employer.name || "empregador não identificado"} sem salário identificado.` });
  if (/transfer[eê]ncia|sucess[aã]o|incorpora[cç][aã]o|cis[aã]o|fus[aã]o/i.test(admissionType || "")) {
    alerts.push({ code: "TRANSFER_OR_SUCCESSION", severity: "INFO", employmentId: id, message: `Tipo de admissão preservado para revisão: ${admissionType}.` });
  }
  events.filter((event) => event.type === "OTHER").forEach((event) => alerts.push({ code: "UNRECOGNIZED_EVENT", severity: "INFO", employmentId: id, message: `Anotação não classificada automaticamente: ${event.originalText}` }));
  const positionHistory = events.filter((event) => event.type === "POSITION_CHANGE").map((event) => {
    const title = positionFromEvent(event.originalText);
    return { title, cbo: cboFromEvent(event.originalText), from: event.effectiveFrom, to: null, originalText: event.originalText };
  }).sort((a, b) => (a.from || "").localeCompare(b.from || "")).map((record, recordIndex, records) => ({ ...record, to: records[recordIndex + 1]?.from || null }));
  const cboEvents = events.filter((event) => event.type === "CBO_CHANGE");
  const currentCbo = cboFromEvent(cboEvents.at(-1)?.originalText || "") || positionHistory.at(-1)?.cbo || cboField;
  const contractHistory = parseContractHistory(events, parseContractType(contractField), admissionDate, contractField || "");
  const contractType = contractHistory.at(-1)?.type || parseContractType(contractField);
  const vacations = events.filter((event) => event.type === "VACATION").map((event) => {
    const dates = event.originalText.match(/\d{2}\/\d{2}\/\d{4}/g) || [];
    return { startDate: parseCtpsDate(dates[1] || dates[0]), endDate: parseCtpsDate(dates[2]), recordedAt: event.recordedAt, originalText: event.originalText };
  });
  let confidence: CtpsConfidence = "HIGH";
  if (!admissionDate || !employer.name || !currentSalary || currentSalary.confidence === "LOW") confidence = "LOW";
  else if (!employer.cnpj || !positionField || !contractField || currentSalary.confidence === "MEDIUM") confidence = "MEDIUM";
  return {
    id,
    status,
    admissionDate,
    terminationDate,
    employer,
    establishment,
    currentPosition: positionHistory.at(-1)?.title || positionField,
    currentCbo,
    contractType,
    employmentRelation,
    admissionType,
    currentSalary,
    salaryHistory,
    positionHistory,
    contractHistory,
    vacations,
    events: [{ type: "ADMISSION", recordedAt: admissionDate, effectiveFrom: admissionDate, originalText: periodLine?.text || "Admissão", pageNumber: periodLine?.pageNumber || lines[0]?.pageNumber || 1 }, ...events],
    confidence,
  };
}

function splitEmploymentBlocks(lines: TextLine[]): TextLine[][] {
  const periodIndexes = lines.flatMap((line, index) => CONTRACT_PERIOD.test(line.text.trim()) ? [index] : []);
  if (periodIndexes.length) {
    return periodIndexes.map((start, index) => lines.slice(start, periodIndexes[index + 1] ?? lines.length));
  }
  const markerIndexes = lines.flatMap((line, index) => /^(?:contrato de trabalho|v[ií]nculo empregat[ií]cio)(?:\s+\d+)?$/i.test(line.text.trim()) ? [index] : []);
  return markerIndexes.map((start, index) => lines.slice(start, markerIndexes[index + 1] ?? lines.length));
}

function detectionScore(text: string): number {
  const signals = [
    /carteira de trabalho digital/i,
    /contratos? de trabalho/i,
    /dados pessoais/i,
    /sal[aá]rio contratual/i,
    /CNPJ\s*(?:raiz)?/i,
    /tipo de admiss[aã]o/i,
  ];
  return signals.filter((signal) => signal.test(text)).length;
}

export function parseCtpsDigital(linesInput: ReconstructedPdfLine[], options: CtpsParseOptions = {}): CtpsAnalysis {
  const lines = linesInput.map((line) => ({ text: line.text.replace(/\s+/g, " ").trim(), pageNumber: line.pageNumber })).filter((line) => line.text);
  const text = lines.map((line) => line.text).join("\n");
  const score = detectionScore(text);
  const alerts: CtpsAlert[] = [];
  const analysisDate = isoAnalysisDate(options.analysisDate);
  const headerEnd = lines.findIndex((line) => CONTRACT_PERIOD.test(line.text.trim()));
  const header = headerEnd >= 0 ? lines.slice(0, headerEnd) : lines.slice(0, 80);
  const holder = {
    name: lineValue(header, /^\s*Nome\s*:?[\s]*(.*)$/i),
    cpf: lineValue(header, /^\s*CPF\s*:?[\s]*(.*)$/i)?.match(/\d{3}\.\d{3}\.\d{3}-\d{2}|\d{11}/)?.[0] || null,
    birthDate: findDateField(header, /^\s*Data\s+de\s+nascimento\s*:?[\s]*(.*)$/i),
    nationality: lineValue(header, /^\s*Nacionalidade\s*:?[\s]*(.*)$/i),
    sex: lineValue(header, /^\s*Sexo\s*:?[\s]*(.*)$/i),
    motherName: lineValue(header, /^\s*Nome\s+da\s+m[aã]e\s*:?[\s]*(.*)$/i),
  };
  if (score < 2) alerts.push({ code: "DOCUMENT_NOT_RECOGNIZED", severity: "CRITICAL", message: "O arquivo não apresenta sinais suficientes de uma Carteira de Trabalho Digital." });
  const blocks = score >= 2 ? splitEmploymentBlocks(lines) : [];
  const employments = blocks.map((block, index) => parseEmployment(block, index, alerts));
  if (score >= 2 && !employments.length) alerts.push({ code: "EMPLOYMENTS_NOT_FOUND", severity: "CRITICAL", message: "O documento foi reconhecido, mas nenhum vínculo pôde ser estruturado." });
  const active = employments.filter((employment) => employment.status === "ACTIVE");
  const incomeCents = active.reduce((sum, employment) => sum + (employment.currentSalary ? Math.round(employment.currentSalary.amount * 100) : 0), 0);
  const unrecognizedEventCount = employments.reduce((sum, employment) => sum + employment.events.filter((event) => event.type === "OTHER").length, 0);
  const lowEmployment = employments.some((employment) => employment.confidence === "LOW");
  const critical = alerts.some((alert) => alert.severity === "CRITICAL");
  const warning = alerts.some((alert) => alert.severity === "WARNING");
  const documentConfidence: CtpsConfidence = score < 2 || critical || lowEmployment ? "LOW" : score >= 4 && !warning ? "HIGH" : "MEDIUM";
  const parseStatus = score < 2 || !employments.length ? "UNRECOGNIZED" as const : critical || warning || lowEmployment ? "REVIEW_REQUIRED" as const : "COMPLETE" as const;
  return {
    document: {
      type: "CTPS_DIGITAL",
      issuer: /minist[eé]rio do trabalho/i.test(text) ? "Ministério do Trabalho e Emprego" : "Carteira de Trabalho Digital",
      ctpsIssuedAt: findDateField(header, /^\s*(?:Data\s+de\s+emiss[aã]o|CTPS\s+emitida\s+em)\s*:?[\s]*(.*)$/i),
      documentSignedAt: findDateField(lines, /^\s*(?:Documento\s+assinado\s+em|Assinado\s+digitalmente\s+em)\s*:?[\s]*(.*)$/i),
      analysisDate,
      pageCount: options.pageCount || Math.max(0, ...lines.map((line) => line.pageNumber)),
      extractionMethod: options.extractionMethod || "PDF_TEXT",
      parseStatus,
      confidence: documentConfidence,
    },
    holder,
    employments,
    summary: {
      activeEmploymentCount: active.length,
      terminatedEmploymentCount: employments.length - active.length,
      currentContractualIncome: incomeCents / 100,
      oldestActiveAdmissionDate: active.map((employment) => employment.admissionDate).filter((value): value is string => Boolean(value)).sort()[0] || null,
    },
    alerts,
    quality: {
      confidence: documentConfidence,
      textCharacters: options.textCharacters ?? text.length,
      pageCount: options.pageCount || Math.max(0, ...lines.map((line) => line.pageNumber)),
      recognizedEventCount: employments.reduce((sum, employment) => sum + employment.events.filter((event) => event.type !== "OTHER").length, 0),
      unrecognizedEventCount,
    },
  };
}
