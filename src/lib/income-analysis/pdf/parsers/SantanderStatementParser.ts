import type { BankStatementParser, ParsedPdfTransaction, ReconstructedPdfLine } from "../../../../types/pdfImport";
import { normalizeText } from "../../formatters";
import { extractSummaryTotal, isLikelyInstitutionalNoise, moneyTokens, parseDateAtStart, stripValues, totalsReconciliation, transaction } from "./parserUtils";

const MONTHS = ["janeiro", "fevereiro", "marco", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

export const SantanderStatementParser: BankStatementParser = {
  id: "santander",
  label: "Santander",
  canHandle(context, text) { const value = normalizeText(text); return context.bankCode === "SANTANDER" ? 1 : value.includes("santander") && value.includes("conta corrente") ? 0.96 : 0; },
  parse(lines, context) {
    const transactions: ParsedPdfTransaction[] = [];
    const ignoredLines: ReconstructedPdfLine[] = []; const ambiguousLines: ReconstructedPdfLine[] = [];
    const period = normalizeText(lines.map((line) => line.text).join(" ")).match(new RegExp(`(${MONTHS.join("|")})\\s*/\\s*(20\\d{2})`));
    const year = period ? Number(period[2]) : context.fallbackYear;
    const month = period ? MONTHS.indexOf(period[1]) + 1 : null;
    const competence = year && month ? `${year}-${String(month).padStart(2, "0")}` : null;
    const pageLines = new Map<number, ReconstructedPdfLine[]>();
    lines.forEach((line) => pageLines.set(line.pageNumber, [...(pageLines.get(line.pageNumber) || []), line]));
    const repeatedPages = new Set<number>(); const pageSignatures = new Set<string>();
    for (const [page, content] of pageLines) {
      // Positive evidence: identical full page text AND the same printed bank page number.
      // Matching isolated amounts/descriptions alone cannot establish a repeated page.
      if (!content.some((line) => /^pagina\s*:\s*\d+\s*\/\s*\d+/i.test(normalizeText(line.text)))
        || !content.some((line) => /^data\s+descricao.*movimento/i.test(normalizeText(line.text)))) continue;
      const signature = content.map((line) => line.text.trim().replace(/\s+/g, " ")).join("\n");
      if (pageSignatures.has(signature)) repeatedPages.add(page);
      else pageSignatures.add(signature);
    }
    let active = false; let accountSection = false; let currentDate: string | null = null;
    let pending: ParsedPdfTransaction | null = null;
    let movementX = 410; let balanceX = 500;
    const flush = () => { if (pending) transactions.push(pending); pending = null; };
    let openingBalance: number | null = null; let closingBalance: number | null = null;
    let holderName: string | null = null; let account: string | null = null; let agency: string | null = null;
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index]; const normalized = normalizeText(line.text);
      if (repeatedPages.has(line.pageNumber)) { ignoredLines.push(line); continue; }
      if (normalized === "nome") holderName = lines[index + 1]?.text.trim() || null;
      if (/^agencia\s+conta corrente$/.test(normalized)) {
        const match = lines[index + 1]?.text.match(/^(\d+)\s+([\d.\-]+)/);
        agency = match?.[1] || null; account = match?.[2] || null;
      }
      if (/^conta corrente(?:\s*-\s*movimentacao)?$/.test(normalized)) accountSection = true;
      if (/^(?:conta corrente\s*-\s*)?movimentacao(?:\s*\(continuacao\))?$/.test(normalized) && accountSection) {
        flush(); active = true; ignoredLines.push(line); continue;
      }
      // Section boundaries apply within a page as well as across pages.
      if (/^(resumo|saldos por periodo|compras com cartao|comprovantes de pagamento|creditos contratados|investimentos|pacote de servicos|indices economicos)/.test(normalized)) {
        flush(); active = false; accountSection = false;
      }
      if (!active) { ignoredLines.push(line); continue; }
      if (/^data\s+descricao/.test(normalized)) {
        const movement = line.items.find((item) => /^movimento/i.test(item.text));
        const balance = line.items.find((item) => /^saldo/i.test(item.text));
        if (movement) movementX = movement.x;
        if (balance) balanceX = balance.x;
        ignoredLines.push(line); continue;
      }
      if (/^saldo em\b/.test(normalized)) {
        flush(); const value = moneyTokens(line.text).at(-1)?.amount ?? null;
        if (!transactions.length) openingBalance = value;
        else { closingBalance = value; active = false; accountSection = false; }
        ignoredLines.push(line); continue;
      }
      if (isLikelyInstitutionalNoise(line.text) || /^(extrato|balp_|pagina:)/.test(normalized) || MONTHS.some((name) => normalized.startsWith(`${name}/`))) { ignoredLines.push(line); continue; }
      const parsed = parseDateAtStart(line.text, year);
      const coordinateValues = line.items.filter((item) => item.x >= movementX - 3 && item.x < balanceX - 10).flatMap((item) => moneyTokens(item.text));
      // A dash in the document column is a placeholder, not a debit sign.
      const values = line.items.length ? coordinateValues : moneyTokens(parsed.rest.replace(/\s+-\s+(?=\d)/g, " "));
      if (!values.length) {
        if (pending && parsed.rest && !/^data\b/.test(normalized)) {
          pending.description = `${pending.description} ${parsed.rest}`.trim();
          if (/pix|transferencia|ted/i.test(pending.description)) pending.payer = `${pending.payer} ${parsed.rest}`.trim();
        } else ignoredLines.push(line);
        continue;
      }
      flush();
      if (parsed.date) currentDate = parsed.date;
      const movement = values[0];
      const description = stripValues(parsed.rest).replace(/\s+[-\d]+\s*$/, "").trim();
      if (!currentDate || !description) { ambiguousLines.push(line); continue; }
      const payer = description.match(/^(?:PIX (?:RECEBIDO|ENVIADO)|TRANSFERENCIA(?: RECEBIDA| ENVIADA)?|TED)\s+(.+)/i)?.[1] || "";
      const balance = line.items.length ? line.items.filter((item) => item.x >= balanceX - 10).flatMap((item) => moneyTokens(item.text))[0]?.amount : values[1]?.amount;
      pending = transaction({ parserId: "santander", context, index: transactions.length, page: line.pageNumber, date: currentDate, description, payer, amount: movement.amount, balance, direction: /-$|^-|D$/i.test(movement.raw.replace(/\s/g, "")) ? "DEBIT" : "CREDIT", confidence: 0.95 });
      pending.sourceRow = index + 1;
      pending.documentId = parsed.rest.match(/\s+(\d{5,})\s+(?:\d{1,3}(?:\.\d{3})*|\d+),\d{2}/)?.[1] || "";
    }
    flush();
    const credit = extractSummaryTotal(lines, /total de creditos/); const debit = extractSummaryTotal(lines, /total de debitos/);
    const parsedCredits = transactions.filter((item) => item.direction === "CREDIT").reduce((sum, item) => sum + Math.round((item.amount || 0) * 100), 0) / 100;
    const parsedDebits = transactions.filter((item) => item.direction === "DEBIT").reduce((sum, item) => sum + Math.round((item.amount || 0) * 100), 0) / 100;
    const balanceDifference = openingBalance !== null && closingBalance !== null ? Math.round((openingBalance + parsedCredits - parsedDebits - closingBalance) * 100) / 100 : null;
    const reconciliation = totalsReconciliation(transactions, credit, debit, { openingBalance, closingBalance, ...(balanceDifference !== null ? { balanceDifference } : {}) });
    if (reconciliation.status === "DIVERGENT") reconciliation.warnings = ["Movimentação extraída diverge dos totais oficiais do Santander; revisar antes de confirmar renda."];
    if (repeatedPages.size) reconciliation.warnings = [...(reconciliation.warnings || []), `Páginas físicas repetidas integralmente, com a mesma numeração bancária, ignoradas: ${[...repeatedPages].join(", ")}.`];
    return { transactions, ignoredLines, ambiguousLines, parserId: "santander", parserLabel: "Santander", reconciliation, statementMetadata: { holderName, holderCpf: null, agency, account, periodStart: competence ? `${competence}-01` : null, periodEnd: competence ? `${competence}-${new Date(Date.UTC(year!, month!, 0)).getUTCDate()}` : null } };
  },
};
