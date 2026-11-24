import { describe, expect, it, vi } from "vitest";
import { INSTITUTION_CATALOG, searchInstitutions, getInstitution } from "./institutionCatalog";
import { changeFileInstitution, resolveInstitution } from "./institutionSelection";
import { createStatementFileRecord, processStatementFile } from "./statementPipeline";
import { loadPdfFile } from "../income-analysis/pdf/pdfLoader";
import { extractPdfText } from "../income-analysis/pdf/pdfTextExtractor";
import { santanderSynthetic, syntheticLine } from "../income-analysis/pdf/parsers/__fixtures__/santanderSynthetic";
import { UBER_MONTHLY_FIXTURES } from "../income-analysis/platforms/__fixtures__/uberIncomeFixtures";
import { getStatementParser } from "../income-analysis/pdf/parsers/parserRegistry";
import { NUBANK_JUNE_2026_SANITIZED_LINES } from "../income-analysis/pdf/parsers/__fixtures__/nubankJune2026Sanitized";
import { SHOPEE_PAY_STATEMENT_SANITIZED } from "../income-analysis/pdf/parsers/__fixtures__/shopeePayStatementSanitized";

const lines = (values: string[]) => values.map((text) => syntheticLine(text));
const coordinateLine = (text: string, columns: Array<[string, number]>) => ({ ...syntheticLine(text), items: columns.map(([value, x]) => ({ text: value, x, y: 700, width: 40, height: 10, pageNumber: 1 })) });
vi.mock("../income-analysis/pdf/pdfLoader", () => ({ loadPdfFile: vi.fn() }));
vi.mock("../income-analysis/pdf/pdfTextExtractor", () => ({ extractPdfText: vi.fn() }));
const santander = () => [syntheticLine("BANCO SANTANDER"), ...santanderSynthetic(2)];
const generic = (bank: string) => lines([bank, "Extrato bancário Conta Corrente", "Data Histórico Valor Saldo", "01/04/2026 PIX RECEBIDO 150,00 C"]);

describe("catálogo e seleção individual", () => {
  async function process(documentLines: ReturnType<typeof lines>, selected: Parameters<typeof resolveInstitution>[1] = "AUTO") {
    const file = { ...createStatementFileRecord(new File(["synthetic PDF"], "fixture.pdf")), selectedInstitution: selected };
    vi.mocked(loadPdfFile).mockResolvedValue({ document: { numPages: 1, loadingTask: { destroy: vi.fn().mockResolvedValue(undefined) } } } as never);
    vi.mocked(extractPdfText).mockResolvedValue({ items: [], lines: documentLines, info: { pageCount: 1, documentType: "TEXT", textCharacters: 500, textPages: [1], scannedPages: [] } });
    return processStatementFile(file, () => {}, new AbortController().signal);
  }
  it("integra seleção manual e automática ao pipeline sem mudar conciliação ou totais Santander", async () => {
    const auto = await process(santander()); const manual = await process(santander(), "SANTANDER");
    expect(manual.selectedInstitution).toBe("SANTANDER");
    expect(manual.detectedInstitution).toBe("SANTANDER");
    expect(manual.institutionSelectionMethod).toBe("MANUAL");
    expect(manual.parserId).toBe("santander");
    expect(manual.transactions.map((t) => [t.date, t.amount, t.direction])).toEqual(auto.transactions.map((t) => [t.date, t.amount, t.direction]));
    expect(manual.reconciliation).toEqual(auto.reconciliation);
    expect(manual.reconciliation.status).toBe("RECONCILED");
    expect(auto.selectedInstitution).toBe("AUTO");
  });
  it.each([
    ["BRADESCO", "bradesco", lines(["Banco Bradesco", "Data Histórico Documento Crédito Débito Saldo", "01/04/2026 PIX RECEBIDO 150,00 C"])],
    ["CAIXA", "caixa", lines(["CAIXA ECONOMICA FEDERAL", "Data Histórico Valor", "01/04/2026 PIX RECEBIDO 150,00 C"])],
    ["INTER", "inter", lines(["BANCO INTER", "Saldo por transação", "7 de Fevereiro de 2026", "Pix recebido: CLIENTE SINTETICO R$ 150,00 R$ 200,00"])],
    ["ITAU", "itau", [syntheticLine("Extrato Conta Itaú Unibanco"), coordinateLine("Data Lançamentos Valor Saldo", [["Valor", 400], ["Saldo", 500]]), coordinateLine("01/04/2026 PIX RECEBIDO 150,00 200,00", [["01/04/2026", 30], ["PIX RECEBIDO", 90], ["150,00", 400], ["200,00", 500]])]],
    ["MERCADO_PAGO", "mercado-pago", lines(["Mercado Pago", "Data Descrição ID da operação Valor Saldo", "01-04-2026 Pagamento recebido OP100 150,00 200,00"])],
    ["NUBANK", "nubank", NUBANK_JUNE_2026_SANITIZED_LINES],
    ["SHOPEE_PAY", "shopee-pay", SHOPEE_PAY_STATEMENT_SANITIZED],
  ] as const)("preserva o parser %s e os valores na seleção manual compatível", async (id, parserId, documentLines) => {
    const auto = await process([...documentLines]); const manual = await process([...documentLines], id);
    expect(manual.selectionBlocked).toBe(false); expect(manual.parserId).toBe(parserId);
    expect(manual.transactions.length).toBeGreaterThan(0);
    expect(manual.transactions.map((t) => [t.date, t.amount, t.direction])).toEqual(auto.transactions.map((t) => [t.date, t.amount, t.direction]));
    expect(manual.reconciliation).toEqual(auto.reconciliation);
  });
  it("não executa parser incompatível e preserva seleção e identificação para correção", async () => {
    const result = await process(santander(), "BRADESCO");
    expect(result).toMatchObject({ selectedInstitution: "BRADESCO", detectedInstitution: "SANTANDER", selectionBlocked: true, status: "REVIEW_REQUIRED", parserId: "", transactions: [] });
    expect(result.incompatibilityWarnings?.[0]).toContain("Revise");
  });
  it("marca leitura genérica com confiança reduzida e revisão obrigatória no pipeline", async () => {
    const result = await process(generic("Neon"), "NEON");
    expect(result).toMatchObject({ selectedInstitution: "NEON", detectedInstitution: "NEON", parserId: "generic", readingMethod: "GENERIC_BANK", status: "REVIEW_REQUIRED" });
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0].extractionConfidence).toBeLessThanOrEqual(0.6);
  });
  it("não fabrica valores INSS/plataforma não suportada e processa Uber compatível", async () => {
    const unsupported = await process(lines(["INSS", "Extrato de pagamento de benefício", "Valor 1.000,00"]), "INSS");
    expect(unsupported).toMatchObject({ transactions: [], platformDocument: null, readingMethod: "UNSUPPORTED", selectionBlocked: true, parserId: "" });
    const uber = await process(UBER_MONTHLY_FIXTURES[0], "UBER");
    expect(uber).toMatchObject({ selectedInstitution: "UBER", detectedInstitution: "UBER", parserId: "uber-income-v1", readingMethod: "PLATFORM", selectionBlocked: false });
    expect(uber.platformDocument?.grossIncome).not.toBeNull();
  });
  it("centraliza todas as opções solicitadas e as capacidades reais, sem parsers inventados", () => {
    expect(new Set(INSTITUTION_CATALOG.map((entry) => entry.id)).size).toBe(INSTITUTION_CATALOG.length);
    expect(INSTITUTION_CATALOG).toHaveLength(21);
    INSTITUTION_CATALOG.filter((entry) => entry.capability === "SPECIFIC_BANK").forEach((entry) => expect(getStatementParser(entry.parserId!)).toBeDefined());
    expect(getInstitution("UBER")?.parserId).toBe("uber-income-v1");
    expect(getInstitution("ITAU_POUPANCA")?.capability).toBe("GENERIC_BANK");
    expect(getInstitution("99")?.capability).toBe("UNSUPPORTED");
    expect(INSTITUTION_CATALOG.map((entry) => entry.label)).toEqual(INSTITUTION_CATALOG.map((entry) => entry.label).sort((a, b) => a.localeCompare(b, "pt-BR")));
    expect(searchInstitutions("ITAU").map((entry) => entry.id)).toEqual(["ITAU", "ITAU_POUPANCA"]);
    expect(searchInstitutions("SHPP").map((entry) => entry.id)).toEqual(["SHOPEE_PAY"]);
    expect(INSTITUTION_CATALOG.every((entry) => !entry.logo || entry.logo.startsWith("/institutions/"))).toBe(true);
  });
  it("mantém escolhas independentes ao adicionar, remover e alterar arquivos", () => {
    const a = createStatementFileRecord(new File(["fixture"], "a.pdf"));
    const b = createStatementFileRecord(new File(["fixture"], "b.pdf"));
    const c = createStatementFileRecord(new File(["fixture"], "c.pdf"));
    expect(a.selectedInstitution).toBe("AUTO");
    const selected = changeFileInstitution(changeFileInstitution([a, b], a.id, "SANTANDER"), b.id, "BRADESCO");
    const added = [...selected, c].filter((entry) => entry.id !== b.id);
    expect(added.map((entry) => entry.selectedInstitution)).toEqual(["SANTANDER", "AUTO"]);
    const changed = changeFileInstitution(added, a.id, "NEON");
    expect(changed[0].selectedInstitution).toBe("NEON"); expect(changed[1]).toBe(c);
    expect(changeFileInstitution(changed, a.id, "AUTO")[0].institutionSelectionMethod).toBe("AUTO");
    const processed = { ...a, detectedInstitution: "SANTANDER" as const, selectionBlocked: true, parserId: "santander", warnings: ["antigo"], periodStart: "2026-02-01" };
    const reset = changeFileInstitution([processed], a.id, "BRADESCO")[0];
    expect(reset).toMatchObject({ parserId: "", detectedInstitution: null, warnings: [], periodStart: null, selectionBlocked: false });
  });
  it("detecta automaticamente e prioriza Santander compatível sem alterar a escolha", () => {
    expect(resolveInstitution(santander())).toMatchObject({ detectedInstitution: "SANTANDER", institutionSelectionMethod: "AUTO", selectionBlocked: false, parserId: null });
    expect(resolveInstitution(santander(), "SANTANDER")).toMatchObject({ detectedInstitution: "SANTANDER", institutionSelectionMethod: "MANUAL", parserId: "santander", readingMethod: "SPECIFIC_BANK", selectionBlocked: false });
  });
  it("bloqueia banco incompatível e banco específico sem confirmação independente", () => {
    const mismatch = resolveInstitution(santander(), "BRADESCO");
    expect(mismatch.selectionBlocked).toBe(true); expect(mismatch.parserId).toBeNull();
    expect(mismatch.incompatibilityWarnings[0]).toContain("Bradesco"); expect(mismatch.incompatibilityWarnings[0]).toContain("Santander");
    expect(resolveInstitution(lines(["Extrato bancário", "Data Histórico Valor", "01/04/2026 PIX RECEBIDO 100,00"]), "SANTANDER").selectionBlocked).toBe(true);
  });
  it.each(["BANCO_DO_BRASIL", "BANRISUL", "BMG", "C6", "NEON"] as const)("usa leitura genérica identificada e revisável para %s", (id) => {
    const institution = getInstitution(id)!;
    expect(resolveInstitution(generic(institution.aliases[0]), id)).toMatchObject({ detectedInstitution: id, parserId: "generic", readingMethod: "GENERIC_BANK", selectionBlocked: false });
    expect(resolveInstitution(generic(institution.aliases[0]), id).warnings.join(" ")).toContain("confiança reduzida");
  });
  it("distingue Itaú Poupança de conta corrente e não anuncia parser validado para poupança", () => {
    expect(resolveInstitution(generic("Itaú Unibanco Poupança"), "ITAU_POUPANCA")).toMatchObject({ detectedInstitution: "ITAU_POUPANCA", parserId: "generic" });
    expect(resolveInstitution(generic("Itaú Unibanco Conta Corrente"), "ITAU_POUPANCA").selectionBlocked).toBe(true);
  });
  it("só permite leitura genérica de documentos com estrutura bancária", () => {
    expect(resolveInstitution(lines(["Neon", "Tabela de tarifas", "Preço 150,00"]), "NEON").selectionBlocked).toBe(true);
    expect(resolveInstitution(generic("Instituição desconhecida"), "OTHER")).toMatchObject({ parserId: "generic", selectionBlocked: false });
  });
  it("não confunde contraparte com a instituição emissora", () => {
    const document = [...santander(), { ...syntheticLine("Transferência enviada Banco Bradesco"), y: 400 }];
    expect(resolveInstitution(document, "SANTANDER").detectedInstitution).toBe("SANTANDER");
    const unknown = lines(["Extrato bancário", "Data Histórico Valor", "01/04/2026 PIX RECEBIDO 100,00", "Banco Bradesco"]);
    expect(resolveInstitution(unknown).detectedInstitution).toBeNull();
    expect(resolveInstitution(unknown, "BRADESCO").selectionBlocked).toBe(true);
  });
  it("suporta comprovante Uber compatível e bloqueia plataforma divergente", () => {
    expect(resolveInstitution(UBER_MONTHLY_FIXTURES[0], "UBER")).toMatchObject({ detectedInstitution: "UBER", readingMethod: "PLATFORM", selectionBlocked: false, parserId: "uber-income-v1" });
    expect(resolveInstitution(santander(), "UBER").selectionBlocked).toBe(true);
    expect(resolveInstitution(UBER_MONTHLY_FIXTURES[0], "SANTANDER").selectionBlocked).toBe(true);
  });
  it.each(["INSS", "99", "LALAMOVE", "RAPPI", "IFOOD"] as const)("não extrai resultados de %s ainda não suportado", (id) => {
    const doc = id === "INSS" ? lines(["INSS", "Extrato de pagamento de benefício", "Banco do Brasil", "Valor do benefício 1.000,00"]) : lines([id, "Resumo de ganhos", "Comprovante de repasse", "Total 1.000,00"]);
    expect(resolveInstitution(doc, id)).toMatchObject({ detectedInstitution: id, readingMethod: "UNSUPPORTED", selectionBlocked: true, parserId: null });
    expect(resolveInstitution(doc).selectionBlocked).toBe(true);
  });
});
