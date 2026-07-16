import type { BankStatementParser, ReconstructedPdfLine } from "../../../../types/pdfImport";
import { normalizeText } from "../../formatters";
import { isLikelyInstitutionalNoise, moneyTokens, parseDateAtStart, stripValues, totalsReconciliation, transaction } from "./parserUtils";

export const CaixaStatementParser: BankStatementParser = {
  id: "caixa",
  label: "Caixa",
  canHandle(context, text) { const value = normalizeText(text); return context.bankCode === "CAIXA" ? 1 : value.includes("caixa economica") || value.includes("saldo dia") && value.includes("historico") ? 0.95 : 0; },
  parse(lines, context) {
    const transactions = []; const ignoredLines: ReconstructedPdfLine[] = []; const ambiguousLines: ReconstructedPdfLine[] = [];
    let currentDate: string | null = null; let pendingParts: string[] = []; let pendingDirection: "CREDIT" | "DEBIT" | "UNKNOWN" = "UNKNOWN"; let pendingPage = 1;
    for (const line of lines) {
      const normalized = normalizeText(line.text); const parsed = parseDateAtStart(line.text, context.fallbackYear); if (parsed.date) { currentDate = parsed.date; pendingParts = parsed.rest ? [parsed.rest] : []; pendingDirection = "UNKNOWN"; pendingPage = line.pageNumber; }
      if (/saldo dia|saldo anterior|data.*hora.*documento.*historico|cpf|cnpj/i.test(normalized) || isLikelyInstitutionalNoise(line.text)) { ignoredLines.push(line); continue; }
      if (/pix enviado|pagamento|debito|saque|tarifa/i.test(normalized)) pendingDirection = "DEBIT";
      else if (/pix recebido|credito pagto benef|credito juros|correcao monetaria/i.test(normalized)) pendingDirection = "CREDIT";
      const values = moneyTokens(parsed.rest); if (!values.length || !currentDate) { if (currentDate && line.text.trim()) pendingParts.push(line.text); continue; }
      const movement = values[0]; const direction = /\bD\s*$/i.test(movement.raw) || /^\s*-/.test(movement.raw) || /\bD\b/i.test(line.text) ? "DEBIT" : /\bC\s*$/i.test(movement.raw) || /\bC\b/i.test(line.text) ? "CREDIT" : pendingDirection;
      const warnings: string[] = [];
      const combined = normalizeText(`${pendingParts.join(" ")} ${line.text}`);
      if (/credito juros|correcao monetaria/i.test(combined)) warnings.push("Rendimento ou ajuste financeiro: desconsiderar da renda operacional.");
      if (context.source === "PDF_OCR" && (!line.items.length || direction === "UNKNOWN")) warnings.push("Linha de OCR com baixa confiança; revisão obrigatória.");
      const tx = transaction({ parserId: "caixa", context, index: transactions.length, page: pendingPage || line.pageNumber, date: currentDate, description: stripValues(`${pendingParts.join(" ")} ${parsed.rest}`), amount: movement.amount, direction, confidence: context.source === "PDF_OCR" ? 0.68 : 0.86, warnings });
      transactions.push(tx); if (tx.warnings.length) ambiguousLines.push(line);
      pendingParts = []; pendingDirection = "UNKNOWN";
    }
    return { transactions, ignoredLines, ambiguousLines, parserId: "caixa", parserLabel: "Caixa (OCR local)", reconciliation: totalsReconciliation(transactions, null, null, { method: "DAILY_BALANCE", warnings: ["Conciliação dependente da confiança dos saldos extraídos por OCR."] }) };
  },
};
