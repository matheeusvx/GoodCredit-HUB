import { BankTransaction, CsvColumnMapping, CsvPreview } from "../../types/incomeAnalysis";
import { competenceFromDate, maskAccount, normalizeDate, parseNumberBR } from "./formatters";
import { suggestTransactionClassification } from "./transactionClassifier";

export function parseCsvPreview(content: string, separator: string, ignoreHeader: boolean): CsvPreview {
  const rows = content.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean).map((line) => parseDelimitedLine(line, separator));
  return { headers: ignoreHeader ? rows[0] || [] : (rows[0] || []).map((_, index) => `Coluna ${index + 1}`), rows: ignoreHeader ? rows.slice(1) : rows, separator, ignoreHeader };
}

function parseDelimitedLine(line: string, separator: string): string[] {
  const cells: string[] = []; let cell = ""; let quoted = false;
  for (let index = 0; index < line.length; index += 1) { const character = line[index]; if (character === '"' && line[index + 1] === '"' && quoted) { cell += '"'; index += 1; } else if (character === '"') quoted = !quoted; else if (character === separator && !quoted) { cells.push(cell.trim()); cell = ""; } else cell += character; }
  cells.push(cell.trim()); return cells;
}

export function csvRowsToTransactions(preview: CsvPreview, mapping: CsvColumnMapping): BankTransaction[] {
  const index = (name: string) => preview.headers.indexOf(name);
  return preview.rows.map((row, rowIndex) => {
    const rawAmount = row[index(mapping.amount)] || "0"; const amount = Math.abs(parseFlexibleAmount(rawAmount)); const date = normalizeDate(row[index(mapping.date)] || ""); const rawType = (row[index(mapping.type)] || "").toLowerCase(); const type = rawType.includes("deb") || parseFlexibleAmount(rawAmount) < 0 ? "DEBIT" : "CREDIT"; const base: BankTransaction = { id: `csv-${Date.now()}-${rowIndex}`, selected: false, date, competence: row[index(mapping.competence)] || competenceFromDate(date), description: row[index(mapping.description)] || "", payer: row[index(mapping.payer)] || "", reference: "", type, amount, account: maskAccount(row[index(mapping.account)] || ""), participant: "", classification: "REVIEW", reason: "GENERIC_DESCRIPTION", note: "Importado de CSV", classificationSource: "SUGGESTED", source: "CSV" }; return { ...base, suggestion: suggestTransactionClassification(base) };
  }).filter((item) => item.date && item.amount > 0);
}

function parseFlexibleAmount(value: string): number { const clean = value.replace(/R\$|\s/g, ""); if (clean.includes(",")) return parseNumberBR(clean); const parsed = Number(clean.replace(/,/g, "")); return Number.isFinite(parsed) ? parsed : 0; }
