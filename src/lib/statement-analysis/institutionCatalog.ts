import type { PdfBankCode } from "../../types/pdfImport";
import type { PlatformProvider } from "../../types/platformIncome";
import logoSources from "./institutionLogoSources.json";

export type InstitutionId = "BANCO_DO_BRASIL" | "BANRISUL" | "BMG" | "BRADESCO" | "CAIXA" | "C6" | "INTER" | "ITAU" | "ITAU_POUPANCA" | "SHOPEE_PAY" | "MERCADO_PAGO" | "NEON" | "NUBANK" | "SANTANDER" | "INSS" | "UBER" | "99" | "LALAMOVE" | "RAPPI" | "IFOOD" | "OTHER";
export type InstitutionSelection = InstitutionId | "AUTO";
export type InstitutionCapability = "SPECIFIC_BANK" | "GENERIC_BANK" | "SPECIFIC_PLATFORM" | "UNSUPPORTED";
export interface StatementInstitution {
  id: InstitutionId;
  label: string;
  aliases: readonly string[];
  category: "BANK" | "PLATFORM";
  capability: InstitutionCapability;
  bankCode: PdfBankCode;
  parserId: string | null;
  provider: PlatformProvider | null;
  logo: string | null;
  logoBackground: string;
}

function entry(id: InstitutionId, label: string, aliases: string[], category: StatementInstitution["category"], capability: InstitutionCapability, bankCode: PdfBankCode = "OTHER", parserId: string | null = null, provider: PlatformProvider | null = null): StatementInstitution {
  const sourceId = id === "ITAU_POUPANCA" ? "ITAU" : id;
  const source = logoSources.find((source) => source.id === sourceId);
  return { id, label, aliases, category, capability, bankCode, parserId, provider, logo: source?.logo || null, logoBackground: source && "displayBackground" in source ? String(source.displayBackground) : "#ffffff" };
}

export const INSTITUTION_CATALOG: readonly StatementInstitution[] = [
  entry("BANCO_DO_BRASIL", "Banco do Brasil", ["banco do brasil", "bb.com.br"], "BANK", "GENERIC_BANK", "BANCO_DO_BRASIL"),
  entry("BANRISUL", "Banrisul", ["banrisul", "banco do estado do rio grande do sul"], "BANK", "GENERIC_BANK"),
  entry("BMG", "BMG", ["banco bmg", "bmg"], "BANK", "GENERIC_BANK"),
  entry("BRADESCO", "Bradesco", ["bradesco"], "BANK", "SPECIFIC_BANK", "BRADESCO", "bradesco"),
  entry("CAIXA", "CAIXA", ["caixa economica federal", "caixa tem", "caixa"], "BANK", "SPECIFIC_BANK", "CAIXA", "caixa"),
  entry("C6", "C6 Bank", ["c6 bank", "banco c6"], "BANK", "GENERIC_BANK", "C6"),
  entry("INTER", "Inter", ["banco inter", "inter.co", "inter"], "BANK", "SPECIFIC_BANK", "INTER", "inter"),
  entry("ITAU", "Itaú", ["itau", "itau unibanco"], "BANK", "SPECIFIC_BANK", "ITAU", "itau"),
  entry("ITAU_POUPANCA", "Itaú Poupança", ["itau poupanca", "poupanca itau"], "BANK", "GENERIC_BANK", "ITAU"),
  entry("SHOPEE_PAY", "Maree (ShopeePay)", ["maree", "shopeepay", "shopee pay", "shpp brasil"], "BANK", "SPECIFIC_BANK", "SHOPEE_PAY", "shopee-pay"),
  entry("MERCADO_PAGO", "Mercado Pago", ["mercado pago", "mercadopago"], "BANK", "SPECIFIC_BANK", "MERCADO_PAGO", "mercado-pago"),
  entry("NEON", "Neon", ["neon", "neon pagamentos"], "BANK", "GENERIC_BANK"),
  entry("NUBANK", "Nubank", ["nubank", "nu pagamentos", "nu financeira"], "BANK", "SPECIFIC_BANK", "NUBANK", "nubank"),
  entry("OTHER", "Outra instituição bancária", [], "BANK", "GENERIC_BANK"),
  entry("SANTANDER", "Santander", ["santander"], "BANK", "SPECIFIC_BANK", "SANTANDER", "santander"),
  entry("99", "99", ["99", "99app", "99 tecnologia"], "PLATFORM", "UNSUPPORTED", "OTHER", null, "99"),
  entry("IFOOD", "iFood", ["ifood"], "PLATFORM", "UNSUPPORTED", "OTHER", null, "IFOOD"),
  entry("INSS", "INSS", ["inss", "instituto nacional do seguro social"], "PLATFORM", "UNSUPPORTED"),
  entry("LALAMOVE", "Lalamove", ["lalamove"], "PLATFORM", "UNSUPPORTED", "OTHER", null, "LALAMOVE"),
  entry("RAPPI", "Rappi", ["rappi"], "PLATFORM", "UNSUPPORTED", "OTHER", null, "RAPPI"),
  entry("UBER", "Uber", ["uber", "uber do brasil tecnologia"], "PLATFORM", "SPECIFIC_PLATFORM", "OTHER", "uber-income-v1", "UBER"),
].sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));

export const CATEGORY_LABELS = { BANK: "Bancos e contas digitais", PLATFORM: "Comprovantes de plataformas" } as const;
export const CAPABILITY_LABELS: Record<InstitutionCapability, string> = {
  SPECIFIC_BANK: "Parser específico disponível", GENERIC_BANK: "Leitura bancária genérica · revisão necessária",
  SPECIFIC_PLATFORM: "Parser específico de comprovante disponível", UNSUPPORTED: "Documento ainda não suportado",
};
export function getInstitution(id?: InstitutionSelection | null) { return INSTITUTION_CATALOG.find((institution) => institution.id === id); }
const PRESENTATION: Record<InstitutionCapability, { asterisk: boolean; tooltip: string | null; accessibleStatus: string }> = {
  SPECIFIC_BANK: { asterisk: false, tooltip: null, accessibleStatus: "Leitura específica disponível." },
  SPECIFIC_PLATFORM: { asterisk: false, tooltip: null, accessibleStatus: "Leitura específica disponível." },
  GENERIC_BANK: { asterisk: true, tooltip: "Leitura genérica. Confira os lançamentos antes de concluir.", accessibleStatus: "Leitura genérica. Confira os lançamentos antes de concluir." },
  UNSUPPORTED: { asterisk: true, tooltip: "Leitura ainda não disponível para este documento.", accessibleStatus: "Leitura ainda não disponível para este documento." },
};
export function getInstitutionPresentation(institution?: StatementInstitution) {
  return institution ? PRESENTATION[institution.capability] : { asterisk: false, tooltip: null, accessibleStatus: "Detecção automática." };
}
export function normalizeInstitutionQuery(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim(); }
export function searchInstitutions(query: string) {
  const value = normalizeInstitutionQuery(query);
  return INSTITUTION_CATALOG.filter((institution) => [institution.label, ...institution.aliases].some((alias) => normalizeInstitutionQuery(alias).includes(value)));
}
