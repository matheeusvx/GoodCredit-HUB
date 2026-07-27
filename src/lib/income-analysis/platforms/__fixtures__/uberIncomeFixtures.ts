import type { ReconstructedPdfLine } from "../../../../types/pdfImport";

function line(text: string, pageNumber: number, y: number): ReconstructedPdfLine {
  return { text, pageNumber, y, items: [] };
}

function money(value: number): string {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function createUberMonthlyFixture(
  month: string,
  endDay: number,
  grossIncome: number,
  netIncome = grossIncome - 150
): ReconstructedPdfLine[] {
  return [
    line("UBER DO BRASIL TECNOLOGIA LTDA.", 1, 700),
    line("CNPJ 17.895.646/0001-87", 1, 680),
    line("Resumo fiscal", 1, 660),
    line(`01 - ${endDay} ${month} 2026`, 1, 640),
    line("Agradecemos por dirigir pela plataforma da Uber, CLIENTE TESTE!", 1, 620),
    line("CPF: 000.000.000-00", 1, 600),
    line("Rua Exemplo, 100 - Cidade Teste", 1, 580),
    line(`Ganhos Brutos R$ ${money(grossIncome)}`, 1, 540),
    line("Como seus ganhos foram calculados", 2, 700),
    line("Corridas e entregas realizadas", 2, 680),
    line(`Valor líquido do repasse de ganhos R$ ${money(netIncome)}`, 3, 700),
    line("ITAÚ UNIBANCO aparece apenas como referência de pagamento", 3, 650),
    line(`Ganhos brutos totais R$ ${money(grossIncome)}`, 4, 700),
    line(`Ganhos líquidos totais R$ ${money(netIncome)}`, 4, 680),
  ];
}

export const UBER_MONTHLY_FIXTURES = [
  createUberMonthlyFixture("Março", 31, 12018.45),
  createUberMonthlyFixture("Abril", 30, 5783.10),
  createUberMonthlyFixture("Maio", 31, 9234.20),
  createUberMonthlyFixture("Junho", 30, 930.93),
];

export const UBER_ANNUAL_FIXTURE: ReconstructedPdfLine[] = [
  line("UBER DO BRASIL TECNOLOGIA LTDA.", 1, 700),
  line("CNPJ 17.895.646/0001-87", 1, 680),
  line("Resumo fiscal - 2025", 1, 660),
  line("Agradecemos por dirigir pela plataforma da Uber, CLIENTE TESTE!", 1, 620),
  line("CPF: 000.000.000-00", 1, 600),
  line("Rua Exemplo, 100 - Cidade Teste", 1, 580),
  line("Ganhos Brutos R$ 112.301,89", 1, 540),
  line("Como seus ganhos foram calculados", 2, 700),
  line("Valor líquido do repasse de ganhos R$ 98.000,00", 3, 700),
  line("Ganhos brutos totais R$ 112.301,89", 4, 700),
  line("Ganhos líquidos totais R$ 98.000,00", 4, 680),
];
