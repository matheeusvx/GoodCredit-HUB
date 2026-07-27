import type { ReconstructedPdfLine } from "../../../../../types/pdfImport";

function line(
  text: string,
  pageNumber: number,
  y: number
): ReconstructedPdfLine {
  return { text, pageNumber, y, items: [] };
}

export const NUBANK_JUNE_2026_SANITIZED_LINES: ReconstructedPdfLine[] = [
  line("Nu Financeira S.A.", 1, 760),
  line("CLIENTE TESTE SANITIZADO", 1, 742),
  line("CPF 000.000.000-00", 1, 728),
  line("Agência 0001 Conta 00000000-0", 1, 714),
  line("Período do extrato: 01/06/2026 a 30/06/2026", 1, 698),
  line("Saldo inicial R$ 1.000,00", 1, 670),
  line("Rendimento líquido R$ 0,00", 1, 654),
  line("Total de entradas + 7.095,77", 1, 638),
  line("Total de saídas - 50,00", 1, 622),
  line("Saldo final do período R$ 8.045,77", 1, 606),
  line("Movimentações", 1, 580),

  line("01 JUN 2026 Total de entradas + 0,01", 1, 560),
  line("Crédito em conta 0,01", 1, 544),

  line("05 JUN 2026 Total de entradas + 4.500,00", 1, 520),
  line("Transferência recebida pelo Pix EMPRESA ALFA LTDA -", 1, 142),
  line("11.111.111/0001-11 -", 1, 126),
  line("1 de 2", 1, 60),
  line("Nu Financeira S.A.", 2, 760),
  line("CLIENTE TESTE SANITIZADO", 2, 742),
  line("CPF 000.000.000-00", 2, 728),
  line("Agência 0001 Conta 00000000-0", 2, 714),
  line("BCO C6 S.A. (0336) Agência: 1 Conta: 11111111-1", 2, 680),
  line("4.500,00", 2, 664),

  line("06 JUN 2026 Total de entradas + 0,33", 2, 634),
  line("Crédito em conta 0,33", 2, 618),

  line("08 JUN 2026 Total de entradas + 685,00", 2, 588),
  line("Transferência recebida pelo Pix CLIENTE BETA", 2, 572),
  line("ITAÚ UNIBANCO S.A. Agência: 2222 Conta: 22222-2", 2, 556),
  line("685,00", 2, 540),

  line("10 JUN 2026 Total de entradas + 32,00", 2, 510),
  line("Transferência recebida pelo Pix CLIENTE GAMA", 2, 494),
  line("BCO SANTANDER Agência: 3333 Conta: 33333-3", 2, 478),
  line("32,00", 2, 462),

  line("12 JUN 2026 Total de entradas + 500,20", 2, 432),
  line("Crédito em conta 0,20", 2, 416),
  line("Resgate RDB 500,00", 2, 400),

  line("14 JUN 2026 Total de entradas + 738,00", 2, 370),
  line("Transferência recebida pelo Pix CLIENTE DELTA", 2, 354),
  line("BANCO INTER Agência: 0001 Conta: 44444-4", 2, 338),
  line("238,00", 2, 322),
  line("Resgate RDB 500,00", 2, 306),

  line("20 JUN 2026 Total de entradas + 311,28", 2, 276),
  line("Crédito em conta 0,28", 2, 260),
  line("Resgate RDB 311,00", 2, 244),

  line("25 JUN 2026 Total de entradas + 22,95", 2, 214),
  line("Reembolso recebido pelo Pix EMPRESA DE TRANSPORTE 22,95", 2, 198),

  line("28 JUN 2026 Total de entradas + 10,00", 2, 168),
  line("Estorno - Transferência enviada pelo Pix 10,00", 2, 152),

  line("30 JUN 2026 Total de entradas + 296,00", 2, 122),
  line("Transferência Recebida CLIENTE ÉPSILON", 2, 106),
  line("BANCO EXEMPLO Agência: 5555 Conta: 55555-5", 2, 90),
  line("296,00", 2, 74),
  line("Total de saídas - 50,00", 2, 58),
  line("Compra no débito ESTABELECIMENTO EXEMPLO 50,00", 2, 42),
  line("2 de 2", 2, 24),
];

export const NUBANK_JUNE_2026_EXPECTED = {
  competence: "2026-06",
  periodStart: "2026-06-01",
  periodEnd: "2026-06-30",
  validIncomeCount: 9,
  bankCreditTotal: 7_095.77,
  rdbRedemptionTotal: 1_311,
  refundTotal: 22.95,
  reversalTotal: 10,
  confirmedIncome: 5_751.82,
} as const;
