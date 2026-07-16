import type { NormalizedBankTransaction, StatementFileFormat, SupportedBank } from "../../types/statementAnalysis";
import { normalizeDate, normalizeText, parseNumberBR } from "../income-analysis/formatters";
import { transactionFingerprint } from "./statementNormalizer";

const ALIASES = {
  date: ["data", "date", "data lancamento"],
  description: ["descricao", "historico", "lancamento", "memo"],
  amount: ["valor", "amount", "valor lancamento"],
  credit: ["credito", "credit", "entrada"],
  debit: ["debito", "debit", "saida"],
  balance: ["saldo", "balance"],
  holder: ["titular", "participante", "nome"],
  account: ["conta", "account"],
  document: ["documento", "id", "identificador", "id operacao"],
};

function findColumn(headers: string[], aliases: string[]) { return headers.findIndex((header) => aliases.some((alias) => normalizeText(header).includes(alias))); }
function cell(row: unknown[], index: number) { return index >= 0 ? String(row[index] ?? "").trim() : ""; }
type XlsxModule = typeof import("@e965/xlsx");
function excelDate(value: unknown, XLSX: XlsxModule): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "number") { const parsed = XLSX.SSF.parse_date_code(value); return parsed ? `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}` : ""; }
  return normalizeDate(String(value || ""));
}

export async function parseStatementSpreadsheet(file: File, sourceFileId: string, format: StatementFileFormat, bank: SupportedBank = "OTHER") {
  const XLSX = await import("@e965/xlsx");
  const data = await file.arrayBuffer(); const workbook = XLSX.read(data, { type: "array", cellDates: true }); const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: "" });
  const headerIndex = rows.findIndex((row) => {
    const joined = normalizeText(row.map(String).join(" ")); return joined.includes("data") && (joined.includes("valor") || joined.includes("credito") || joined.includes("debito"));
  });
  if (headerIndex < 0) return { transactions: [], confidence: 0, warnings: ["Não foi possível identificar o cabeçalho da planilha."] };
  const headers = rows[headerIndex].map((value) => String(value)); const columns = Object.fromEntries(Object.entries(ALIASES).map(([key, aliases]) => [key, findColumn(headers, aliases)])) as Record<keyof typeof ALIASES, number>;
  const mappingConfidence = [columns.date, columns.description, Math.max(columns.amount, columns.credit, columns.debit)].filter((value) => value >= 0).length / 3;
  const transactions: NormalizedBankTransaction[] = [];
  rows.slice(headerIndex + 1).forEach((row, rowIndex) => {
    const date = excelDate(row[columns.date], XLSX); const description = cell(row, columns.description); const credit = parseNumberBR(cell(row, columns.credit)); const debit = parseNumberBR(cell(row, columns.debit)); const signed = parseNumberBR(cell(row, columns.amount));
    const direction = credit > 0 ? "CREDIT" : debit > 0 || /^\s*-/.test(cell(row, columns.amount)) ? "DEBIT" : signed > 0 ? "CREDIT" : null;
    const amount = credit || debit || Math.abs(signed); if (!date || !description || !direction || !amount) return;
    const base: NormalizedBankTransaction = { id: `${sourceFileId}-row-${rowIndex}`, sourceFileId, bank, accountHolder: cell(row, columns.holder), maskedAccount: cell(row, columns.account).replace(/.(?=.{4})/g, "*"), date, time: null, competence: date.slice(0, 7), description, counterparty: "", amount, direction, balance: columns.balance >= 0 ? parseNumberBR(cell(row, columns.balance)) : null, documentId: cell(row, columns.document).replace(/.(?=.{4})/g, "*"), sourcePage: null, sourceRow: headerIndex + rowIndex + 2, parserId: "spreadsheet-auto", extractionMethod: "XLSX", extractionConfidence: mappingConfidence, classification: "PENDING_REVIEW", classificationReason: "Aguardando classificação automática.", classificationConfidence: 0, warnings: mappingConfidence < 0.8 ? ["Mapeamento de colunas com confiança reduzida."] : [], fingerprint: "" };
    base.fingerprint = transactionFingerprint(base); transactions.push(base);
  });
  return { transactions, confidence: mappingConfidence, warnings: mappingConfidence < 0.8 ? ["Revise o mapeamento automático das colunas."] : [] };
}
