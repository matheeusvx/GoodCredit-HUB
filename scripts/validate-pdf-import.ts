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
}, null, 2));

await document.loadingTask.destroy();
