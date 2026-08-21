import type { ReconstructedPdfLine } from "../../../../../types/pdfImport";

function line(text: string, pageNumber: number, y: number): ReconstructedPdfLine {
  return { text, pageNumber, y, items: [] };
}

function credit(
  date: string,
  time: string,
  value: string,
  pageNumber: number,
  y: number
): ReconstructedPdfLine {
  return line(`${date}   ${time}   Saldo creditado   R$${value}`, pageNumber, y);
}

function pix(
  date: string,
  time: string,
  value: string,
  pageNumber: number,
  y: number
): ReconstructedPdfLine[] {
  return [
    line(`${date}   ${time}   Transferência Pix Enviada Para`, pageNumber, y),
    line(`CLIENTE TESTE SHOPEE   R$-${value}`, pageNumber, y - 8),
  ];
}

export const SHOPEE_PAY_STATEMENT_SANITIZED: ReconstructedPdfLine[] = [
  line("ShopeePay", 1, 800),
  line("Nome: CLIENTE TESTE SHOPEE", 1, 760),
  line("CPF: 000.000.000-00", 1, 744),
  line("Agência: 0001", 1, 728),
  line("Conta: 000000000000", 1, 712),
  line("PERÍODO EXTRATO   27/02/2026 a 28/05/2026", 1, 680),
  line("Data   Hora   Tipo de Transação   Valor Transação", 1, 650),
  credit("05-03-2026", "13:51:47", "810,00", 1, 620),
  ...pix("05-03-2026", "16:14:24", "810,00", 1, 600),
  credit("12-03-2026", "11:53:33", "1.075,00", 1, 570),
  ...pix("12-03-2026", "20:37:49", "1.075,00", 1, 550),
  credit("19-03-2026", "14:54:44", "2.357,01", 1, 520),
  ...pix("19-03-2026", "15:17:46", "2.357,00", 1, 500),
  credit("26-03-2026", "14:40:02", "3.105,00", 1, 470),
  ...pix("26-03-2026", "15:35:51", "3.105,00", 1, 450),
  credit("02-04-2026", "15:08:59", "735,11", 1, 420),
  ...pix("02-04-2026", "15:30:13", "735,00", 1, 400),
  credit("09-04-2026", "12:25:43", "780,00", 1, 370),
  ...pix("09-04-2026", "22:12:24", "780,00", 1, 350),
  credit("16-04-2026", "12:27:07", "2.030,00", 1, 320),
  ...pix("16-04-2026", "12:29:23", "2.030,00", 1, 300),
  credit("23-04-2026", "13:24:13", "1.660,00", 1, 270),
  ...pix("23-04-2026", "17:03:38", "1.660,00", 1, 250),
  line("SHPP BRASIL INSTITUICAO DE PAGAMENTO E SERVICOS DE PAGAMENTOS LTDA", 1, 70),
  line("CNPJ: 38.372.267/0001-82", 1, 52),
  line("Data   Hora   Tipo de Transação   Valor Transação", 2, 780),
  credit("30-04-2026", "12:35:49", "1.045,00", 2, 750),
  ...pix("30-04-2026", "14:46:16", "1.045,00", 2, 730),
  credit("07-05-2026", "13:59:25", "1.394,20", 2, 700),
  ...pix("07-05-2026", "19:01:07", "1.394,00", 2, 680),
  credit("14-05-2026", "13:52:50", "2.645,00", 2, 650),
  ...pix("14-05-2026", "16:25:50", "2.645,00", 2, 630),
  credit("21-05-2026", "12:57:19", "2.852,01", 2, 600),
  ...pix("21-05-2026", "13:26:32", "2.852,00", 2, 580),
  line("SHPP BRASIL INSTITUICAO DE PAGAMENTO E SERVICOS DE PAGAMENTOS LTDA", 2, 70),
  line("CNPJ: 38.372.267/0001-82", 2, 52),
];
