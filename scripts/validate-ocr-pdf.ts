import { readFile } from "node:fs/promises";
import path from "node:path";
import { createCanvas } from "@napi-rs/canvas";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { createWorker } from "tesseract.js";
import type { ReconstructedPdfLine } from "../src/types/pdfImport";
import { parsePdfTransactions, summarizePdfParse } from "../src/lib/income-analysis/pdf/pdfTransactionParser";
import { ocrBlocksToLines, preprocessOcrCanvas } from "../src/lib/income-analysis/pdf/ocrProcessor";

const filePath = process.env.PDF_IMPORT_PATH || process.argv[2];
if (!filePath) throw new Error("Informe o caminho do PDF.");
const started = performance.now(); const bytes = new Uint8Array(await readFile(filePath)); const document = await getDocument({ data: bytes }).promise;
const worker = await createWorker("por", 1, { langPath: path.resolve("public/tesseract/lang") }); const lines: ReconstructedPdfLine[] = [];
try {
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber); const viewport = page.getViewport({ scale: 2.75 }); const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    await page.render({ canvasContext: canvas.getContext("2d") as never, viewport }).promise; preprocessOcrCanvas(canvas as never); const result = await worker.recognize(canvas.toBuffer("image/png"), {}, { text: true, blocks: true });
    lines.push(...ocrBlocksToLines(result.data.blocks, pageNumber, canvas.height, result.data.text)); page.cleanup();
  }
  const result = parsePdfTransactions(lines, { bankCode: "CAIXA", account: "", source: "PDF_OCR", fallbackYear: 2026 }); const summary = summarizePdfParse(result, lines.length);
  const moneyIndexes = lines.flatMap((line, index) => /\d[.,]\d{2}/.test(line.text) ? [index] : []); const markerIndexes = lines.flatMap((line, index) => /pix\s+(recebido|enviado)|credito\s+(pagto|juros)|correcao monetaria/i.test(line.text) ? [index] : []);
  console.log(JSON.stringify({ pages: document.numPages, parser: result.parserId, extractionMethod: "PDF_OCR", movements: summary.transactionCount, credits: summary.credits, debits: summary.debits, creditTotal: Number(summary.creditTotal.toFixed(2)), debitTotal: Number(summary.debitTotal.toFixed(2)), ignoredBalanceLines: result.ignoredLines.filter((line) => /saldo\s+dia/i.test(line.text)).length, ambiguous: result.ambiguousLines.length, reconciliation: result.reconciliation?.status || "NOT_AVAILABLE", ocrSignals: { dateLines: lines.filter((line) => /\d{2}[\/\-]\d{2}[\/\-]\d{4}/.test(line.text)).length, creditDescriptionMarkers: lines.filter((line) => /pix\s+recebido|credito\s+pagto|credito\s+juros/i.test(line.text)).length, debitDescriptionMarkers: lines.filter((line) => /pix\s+enviado/i.test(line.text)).length, valueCreditSuffix: lines.filter((line) => /\d,\d{2}\s*C\b/i.test(line.text)).length, valueDebitSuffix: lines.filter((line) => /\d,\d{2}\s*D\b/i.test(line.text)).length, standaloneNatureItems: lines.flatMap((line) => line.items).filter((item) => /^[CD]$/i.test(item.text)).reduce<Record<string, number>>((groups, item) => { const key = `${item.text.toUpperCase()}-x${Math.round(item.x / 20) * 20}`; groups[key] = (groups[key] || 0) + 1; return groups; }, {}), moneyLines: moneyIndexes.length, markerToNearestMoneyOffsets: markerIndexes.reduce<Record<string, number>>((groups, marker) => { const nearest = moneyIndexes.reduce((best, value) => Math.abs(value - marker) < Math.abs(best - marker) ? value : best, moneyIndexes[0] ?? marker); const key = String(nearest - marker); groups[key] = (groups[key] || 0) + 1; return groups; }, {}), markerToNearestMoneyY: markerIndexes.reduce<Record<string, number>>((groups, marker) => { const candidates = moneyIndexes.filter((index) => lines[index].pageNumber === lines[marker].pageNumber); const nearest = candidates.reduce((best, value) => Math.abs(lines[value].y - lines[marker].y) < Math.abs(lines[best].y - lines[marker].y) ? value : best, candidates[0] ?? marker); const key = String(Math.round(Math.abs(lines[nearest].y - lines[marker].y) / 5) * 5); groups[key] = (groups[key] || 0) + 1; return groups; }, {}) }, elapsedMs: Math.round(performance.now() - started) }, null, 2));
} finally { await worker.terminate(); await document.loadingTask.destroy(); }
