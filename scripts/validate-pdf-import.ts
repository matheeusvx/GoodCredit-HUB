import { readFile } from "node:fs/promises";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { extractPdfText } from "../src/lib/income-analysis/pdf/pdfTextExtractor";
import { detectPdfBank } from "../src/lib/income-analysis/pdf/parsers/parserRegistry";
import { parsePdfTransactions, summarizePdfParse } from "../src/lib/income-analysis/pdf/pdfTransactionParser";

const filePath = process.env.PDF_IMPORT_PATH || process.argv[2];
if (!filePath) throw new Error("Informe o caminho do PDF.");

const bytes = new Uint8Array(await readFile(filePath));
const document = await getDocument({ data: bytes }).promise;
const pages = Array.from({ length: document.numPages }, (_, index) => index + 1);
const controller = new AbortController();
const extraction = await extractPdfText(document, pages, () => undefined, controller.signal);
const documentText = extraction.lines.map((line) => line.text).join(" ");
const bankCode = detectPdfBank(documentText);
const result = parsePdfTransactions(extraction.lines, { bankCode, account: "", source: "PDF_TEXT" });
const summary = summarizePdfParse(result, extraction.lines.length);
const normalizedLines = extraction.lines.map((line) => line.text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase());
const layoutSignals = process.env.PDF_LAYOUT_SIGNALS === "1" ? {
  movementHeadings: normalizedLines.filter((line) => line.includes("movimenta")).length,
  currentAccountHeadings: normalizedLines.filter((line) => line.includes("conta corrente")).length,
  balanceEndHeadings: normalizedLines.filter((line) => line.includes("saldo em")).length,
  leadingAsciiMinus: normalizedLines.filter((line) => /-\s*(?:r\$\s*)?\d/.test(line)).length,
  trailingAsciiMinus: normalizedLines.filter((line) => /\d,\d{2}\s*-/.test(line)).length,
  unicodeMinus: normalizedLines.filter((line) => /[−–]\s*(?:r\$\s*)?\d/.test(line)).length,
  transactionSectionPages: [...new Set(extraction.lines.filter((line) => /movimenta/i.test(line.text)).map((line) => line.pageNumber))],
  dateAtStart: normalizedLines.filter((line) => /^\s*\d{2}[\/-]\d{2}(?:[\/-]\d{2,4})?/.test(line)).length,
  linesWithMoney: normalizedLines.filter((line) => /\d{1,3}(?:\.\d{3})*,\d{2}/.test(line)).length,
  movementToBalanceLineCount: (() => { const start = normalizedLines.findIndex((line) => line.includes("movimenta")); const end = normalizedLines.findIndex((line, index) => index > start && line.includes("saldo em")); return start >= 0 ? (end >= 0 ? end - start - 1 : normalizedLines.length - start - 1) : 0; })(),
  movementBlockDateLines: (() => { const start = normalizedLines.findIndex((line) => line.includes("movimenta")); const end = normalizedLines.findIndex((line, index) => index > start && line.includes("saldo em")); return normalizedLines.slice(start + 1, end >= 0 ? end : undefined).filter((line) => /^\s*\d{2}[\/-]\d{2}/.test(line)).length; })(),
  movementBlockMoneyLines: (() => { const start = normalizedLines.findIndex((line) => line.includes("movimenta")); const end = normalizedLines.findIndex((line, index) => index > start && line.includes("saldo em")); return normalizedLines.slice(start + 1, end >= 0 ? end : undefined).filter((line) => /\d{1,3}(?:\.\d{3})*,\d{2}/.test(line)).length; })(),
  movementSegments: normalizedLines.flatMap((line, index) => line.includes("movimenta") ? [index] : []).map((start) => { const end = normalizedLines.findIndex((line, index) => index > start && line.includes("saldo em")); const segment = normalizedLines.slice(start + 1, end >= 0 ? end : undefined); return { start, end, lines: segment.length, dates: segment.filter((line) => /^\s*\d{2}[\/-]\d{2}/.test(line)).length, money: segment.filter((line) => /\d{1,3}(?:\.\d{3})*,\d{2}/.test(line)).length }; }),
  pageStats: Array.from({ length: document.numPages }, (_, offset) => { const page = extraction.lines.filter((line) => line.pageNumber === offset + 1).map((line) => line.text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()); return { page: offset + 1, lines: page.length, dates: page.filter((line) => /^\s*\d{2}[\/-]\d{2}/.test(line)).length, money: page.filter((line) => /\d{1,3}(?:\.\d{3})*,\d{2}/.test(line)).length, movement: page.filter((line) => line.includes("movimenta")).length, saldoEm: page.filter((line) => line.includes("saldo em")).length }; }),
  dateLineShapes: extraction.lines.filter((line) => /^\s*\d{2}[\/-]\d{2}/.test(line.text)).reduce<Record<string, number>>((groups, line) => { const x = line.items[0]?.x ?? 0; const values = (line.text.match(/\d{1,3}(?:\.\d{3})*,\d{2}/g) || []).length; const key = `p${line.pageNumber}-x${Math.round(x / 20) * 20}-v${values}`; groups[key] = (groups[key] || 0) + 1; return groups; }, {}),
  moneyItemXBuckets: extraction.lines.filter((line) => line.pageNumber >= 2 && line.pageNumber <= 4).flatMap((line) => line.items).filter((item) => /\d{1,3}(?:\.\d{3})*,\d{2}/.test(item.text)).reduce<Record<string, number>>((groups, item) => { const key = `x${Math.round(item.x / 20) * 20}`; groups[key] = (groups[key] || 0) + 1; return groups; }, {}),
  columnHeaders: extraction.items.filter((item) => /^(data|historico|valor|saldo|credito|debito|descricao|documento)$/i.test(item.text.normalize("NFD").replace(/[\u0300-\u036f]/g, ""))).map((item) => ({ page: item.pageNumber, label: item.text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(), x: Math.round(item.x) })),
} : undefined;
const operationCategory = (value: string) => {
  if (/^transfer[eê]ncia recebida/i.test(value)) return "TRANSFER_RECEIVED";
  if (/^transfer[eê]ncia enviada/i.test(value)) return "TRANSFER_SENT";
  if (/^reembolso recebido/i.test(value)) return "REFUND_RECEIVED";
  if (/^pagamento de boleto/i.test(value)) return "BOLETO_PAYMENT";
  if (/^pagamento/i.test(value)) return "PAYMENT";
  if (/^compra/i.test(value)) return "PURCHASE";
  if (/^dep[oó]sito/i.test(value)) return "DEPOSIT";
  return "OTHER";
};
const divergentDirections = Object.values(result.transactions.filter((item) => item.warnings.some((warning) => warning.includes("diverge da seção"))).reduce<Record<string, { category: string; direction: string; count: number; total: number }>>((groups, item) => {
  const category = operationCategory(item.description);
  const key = `${category}-${item.direction}`;
  const group = groups[key] || { category, direction: item.direction, count: 0, total: 0 };
  group.count += 1;
  group.total += item.amount || 0;
  groups[key] = group;
  return groups;
}, {})).map((group) => ({ ...group, total: Number(group.total.toFixed(2)) }));

console.log(JSON.stringify({
  pages: document.numPages,
  documentType: extraction.info.documentType,
  bankCode,
  parser: result.parserId,
  lines: extraction.lines.length,
  movements: summary.transactionCount,
  credits: summary.credits,
  debits: summary.debits,
  ambiguous: summary.ambiguous,
  creditTotal: Number(summary.creditTotal.toFixed(2)),
  debitTotal: Number(summary.debitTotal.toFixed(2)),
  reconciliation: summary.reconciliation,
  divergentDirections,
  layoutSignals,
}, null, 2));

await document.loadingTask.destroy();
