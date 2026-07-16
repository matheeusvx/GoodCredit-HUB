import { PdfBankCode } from "../../../types/pdfImport";

export const PDF_IMPORT_CONFIG = {
  maxFileSizeMb: 20,
  maxPages: 60,
  minimumExtractedCharactersPerPage: 20,
  lineYTolerance: 3,
  duplicateDateToleranceDays: 0,
  ocrScale: 2.75,
  defaultOcrLanguage: "por",
} as const;

export const PDF_IMPORT_HISTORY_KEY = "goodcredit_income_pdf_import_history";

export const PDF_BANK_OPTIONS: Array<{ value: PdfBankCode; label: string }> = [
  { value: "AUTO", label: "Outro / Detecção automática" },
  { value: "CAIXA", label: "Caixa" },
  { value: "BANCO_DO_BRASIL", label: "Banco do Brasil" },
  { value: "BRADESCO", label: "Bradesco" },
  { value: "ITAU", label: "Itaú" },
  { value: "SANTANDER", label: "Santander" },
  { value: "INTER", label: "Inter" },
  { value: "NUBANK", label: "Nubank" },
  { value: "MERCADO_PAGO", label: "Mercado Pago" },
  { value: "C6", label: "C6" },
  { value: "OTHER", label: "Outro" },
];

export const PDF_STATEMENT_NOISE_PATTERNS = [
  /saldo\s+(anterior|inicial|final|dispon[ií]vel|do\s+dia|bloqueado)/i,
  /total\s+de?\s*(cr[eé]ditos|d[eé]bitos|entradas|sa[ií]das)/i,
  /limite\s+(dispon[ií]vel|da\s+conta)/i,
  /cheque\s+especial/i,
  /resumo\s+da\s+conta/i,
  /data\s+de\s+emiss[aã]o/i,
  /per[ií]odo\s+do\s+extrato/i,
  /p[aá]gina\s+\d+/i,
  /ag[eê]ncia\s*[:\-]?\s*\d+/i,
  /conta\s*[:\-]?\s*[\d.\-]+/i,
  /titular\s*:/i,
] as const;

export const PDF_CREDIT_KEYWORDS = [
  "recebido",
  "credito",
  "pix recebido",
  "ted recebida",
  "deposito",
  "salario",
  "pagamento recebido",
  "transferencia recebida",
  "rendimento",
  "recebimento",
] as const;

export const PDF_DEBIT_KEYWORDS = [
  "enviado",
  "debito",
  "pix enviado",
  "pagamento",
  "compra",
  "saque",
  "tarifa",
  "imposto",
  "transferencia enviada",
  "boleto pago",
] as const;

export const PDF_BANK_MARKERS: Record<Exclude<PdfBankCode, "AUTO" | "OTHER">, string[]> = {
  CAIXA: ["caixa economica", "caixa tem"],
  BANCO_DO_BRASIL: ["banco do brasil", "bb.com.br"],
  BRADESCO: ["bradesco"],
  ITAU: ["itau", "itaú"],
  SANTANDER: ["santander"],
  INTER: ["banco inter", "inter.co"],
  NUBANK: ["nubank", "nu pagamentos"],
  MERCADO_PAGO: ["mercado pago", "mercadopago"],
  C6: ["c6 bank", "banco c6"],
};
