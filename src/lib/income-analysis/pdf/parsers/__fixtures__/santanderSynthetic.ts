import type { ReconstructedPdfLine } from "../../../../../types/pdfImport";

// Artificial amounts/names/dates; only the requested monthly aggregate scenarios are retained.
const money = (cents: number) => (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export function syntheticLine(text: string, pageNumber = 1): ReconstructedPdfLine { return { text, pageNumber, y: 700, items: [] }; }

export function santanderSynthetic(month: 2 | 3 | 4) {
  const deposits = { 2: 834632, 3: 526632, 4: 563632 }[month];
  const count = { 2: 12, 3: 17, 4: 18 }[month];
  const yields = { 2: [18, 6], 3: [2, 4], 4: [5, 2] }[month];
  const special = month === 2 ? [500000, 16632] : month === 3 ? [60000, 40000, 15632] : [16632, 28000];
  const residual = deposits - special.reduce((sum, amount) => sum + amount, 0);
  const remaining = count - special.length;
  const amounts = [...special, ...Array.from({ length: remaining }, (_, index) => Math.floor(residual / remaining) + (index < residual % remaining ? 1 : 0))];
  const monthName = { 2: "fevereiro", 3: "março", 4: "abril" }[month];
  const mm = String(month).padStart(2, "0");
  const end = { 2: 28, 3: 31, 4: 30 }[month];
  const lines = [syntheticLine(`${monthName}/2026`), syntheticLine("Resumo"), syntheticLine("Nome"), syntheticLine("PESSOA TITULAR TESTE"), syntheticLine("Agência Conta Corrente"), syntheticLine("0000 00.000000-0"), syntheticLine(`(+) Total de Créditos ${money(deposits + yields.reduce((a, b) => a + b, 0))}`), syntheticLine(`Depósitos / Transferências ${money(deposits)}`), syntheticLine("(-) Total de Débitos 25,00"), syntheticLine("Conta Corrente"), syntheticLine("Movimentação"), syntheticLine("Data Descrição Nº Documento Movimento (R$) Saldo (R$)"), syntheticLine("SALDO EM 01/01 100,00")];
  amounts.forEach((amount, index) => {
    const page = index < 5 ? 1 : 2;
    if (index === 5) lines.push(syntheticLine("EXTRATO CONSOLIDADO INTELIGENTE", page), syntheticLine(`${monthName}/2026`, page), syntheticLine("Data Descrição Nº Documento Movimento (R$) Saldo (R$)", page));
    lines.push(syntheticLine(`${String(index + 1).padStart(2, "0")}/${mm} PIX RECEBIDO - ${money(amount)}`, page));
    lines.push(syntheticLine(month === 3 && index < 2 ? "PESSOA TITULAR TESTE" : `PAGADOR SINTETICO ${String.fromCharCode(65 + index)}`, page));
  });
  yields.forEach((amount) => lines.push(syntheticLine(`REMUNERACAO APLICACAO AUTOMATICA - ${money(amount)}`, 2)));
  lines.push(syntheticLine(`PIX ENVIADO - 25,00-`, 2), syntheticLine("FORNECEDOR SINTETICO", 2), syntheticLine(`SALDO EM ${end}/${mm} ${money(10000 + deposits + yields.reduce((a, b) => a + b, 0) - 2500)}`, 2));
  // Informative rows share the last movement page and must never become credits.
  lines.push(syntheticLine("Saldos por Período", 2), syntheticLine(`01 2.000,00 0,00 0,00 2.000,00`, 2), syntheticLine("Compras com Cartão de Débito", 2), syntheticLine(`02/${mm} LOJA SINTETICA 25,00`, 2), syntheticLine("Comprovantes de Pagamento", 3), syntheticLine(`02/${mm} INTERNET BANKING PIX FORNECEDOR SINTETICO 25,00`, 3), syntheticLine("Índices Econômicos / Financeiros", 3), syntheticLine(`SALARIO MINIMO 01/${mm}/2026 1.621,00`, 3));
  return lines;
}
