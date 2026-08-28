import { describe, expect, it } from "vitest";
import { buildCtpsSummaryPdf } from "./ctpsPdfReport";
import { employmentDuration, formatEmploymentDuration } from "./ctpsPresentation";
import { parseCtpsDigital, parseCtpsMoney } from "./ctpsParser";
import { SYNTHETIC_CTPS_LINES, withSalaryConflict, withoutSecondActiveSalary } from "./__fixtures__/syntheticCtps";

const options = { analysisDate: "2026-08-15T12:00:00.000Z", pageCount: 3, extractionMethod: "PDF_TEXT" as const };

describe("parser da Carteira de Trabalho Digital", () => {
  it("estrutura múltiplas páginas, titular e dois vínculos ativos simultâneos", () => {
    const result = parseCtpsDigital(SYNTHETIC_CTPS_LINES, options);
    expect(result.document).toMatchObject({ type: "CTPS_DIGITAL", pageCount: 3, ctpsIssuedAt: "2020-01-10", documentSignedAt: "2026-08-15" });
    expect(result.holder).toMatchObject({ name: "CLIENTE TESTE CTPS", cpf: "000.000.000-00", birthDate: "1990-10-10" });
    expect(result.employments).toHaveLength(3);
    expect(result.employments.filter((item) => item.status === "ACTIVE")).toHaveLength(2);
  });

  it("mantém um vínculo encerrado e reconhece rescisão contratual", () => {
    const result = parseCtpsDigital(SYNTHETIC_CTPS_LINES, options);
    const terminated = result.employments.find((item) => item.employer.name?.includes("GAMA"));
    expect(terminated).toMatchObject({ status: "TERMINATED", admissionDate: "2017-03-01", terminationDate: "2019-12-31" });
    expect(terminated?.events.some((event) => event.type === "TERMINATION")).toBe(true);
  });

  it("usa o salário contratual aberto, validado pelo último histórico, sem escolher o maior", () => {
    const employment = parseCtpsDigital(SYNTHETIC_CTPS_LINES, options).employments[0];
    expect(employment.currentSalary).toMatchObject({ amount: 4500, source: "CONTRACTUAL_FIELD", confidence: "HIGH" });
    expect(employment.salaryHistory.map((item) => item.amount)).toEqual([3500, 4000, 4500]);
  });

  it("separa data de registro da vigência salarial retroativa", () => {
    const salary = parseCtpsDigital(SYNTHETIC_CTPS_LINES, options).employments[0].salaryHistory[1];
    expect(salary).toMatchObject({ amount: 4000, recordedAt: "2021-06-15", effectiveFrom: "2021-05-01" });
  });

  it("mantém mudança de cargo no mesmo vínculo e atualiza o cargo vigente", () => {
    const employment = parseCtpsDigital(SYNTHETIC_CTPS_LINES, options).employments[0];
    expect(employment.currentPosition).toContain("Analista Sênior");
    expect(employment.positionHistory).toHaveLength(1);
    expect(employment.events.some((event) => event.type === "POSITION_CHANGE")).toBe(true);
  });

  it("normaliza a evolução contratual de prazo determinado para indeterminado", () => {
    const employment = parseCtpsDigital(SYNTHETIC_CTPS_LINES, options).employments[0];
    expect(employment.contractHistory.map((item) => item.type)).toEqual(["FIXED_TERM", "FIXED_TERM", "INDEFINITE"]);
    expect(employment.contractType).toBe("INDEFINITE");
  });

  it("preserva transferência por sucessão sem encerrar o vínculo", () => {
    const result = parseCtpsDigital(SYNTHETIC_CTPS_LINES, options);
    expect(result.employments[0]).toMatchObject({ status: "ACTIVE", admissionType: "Transferência por sucessão" });
    expect(result.alerts.some((alert) => alert.code === "TRANSFER_OR_SUCCESSION" && alert.severity === "INFO")).toBe(true);
  });

  it("trata férias como evento, sem encerrar o vínculo", () => {
    const employment = parseCtpsDigital(SYNTHETIC_CTPS_LINES, options).employments[0];
    expect(employment.status).toBe("ACTIVE");
    expect(employment.vacations[0]).toMatchObject({ startDate: "2025-01-02", endDate: "2025-01-31" });
  });

  it("gera alerta e reduz confiança quando salário contratual diverge do histórico", () => {
    const result = parseCtpsDigital(withSalaryConflict(), options);
    expect(result.employments[0].currentSalary).toMatchObject({ amount: 4800, confidence: "LOW" });
    expect(result.alerts.some((alert) => alert.code === "SALARY_CONFLICT")).toBe(true);
    expect(result.document.parseStatus).toBe("REVIEW_REQUIRED");
  });

  it("reduz confiança quando contrato aberto não possui salário", () => {
    const result = parseCtpsDigital(withoutSecondActiveSalary(), options);
    const employment = result.employments.find((item) => item.employer.name?.includes("BETA"));
    expect(employment?.currentSalary).toBeNull();
    expect(employment?.confidence).toBe("LOW");
    expect(result.alerts.some((alert) => alert.code === "MISSING_ACTIVE_SALARY")).toBe(true);
  });

  it("soma em centavos somente os salários vigentes dos vínculos ativos", () => {
    const result = parseCtpsDigital(SYNTHETIC_CTPS_LINES, options);
    expect(result.summary).toMatchObject({ activeEmploymentCount: 2, terminatedEmploymentCount: 1, currentContractualIncome: 7000, oldestActiveAdmissionDate: "2020-02-01" });
  });

  it("interpreta valores monetários brasileiros sem erro visível", () => {
    expect(parseCtpsMoney("R$ 2.357,01")).toBe(2357.01);
    expect(parseCtpsMoney("R$ -1.075,00")).toBe(1075);
  });

  it("calcula tempo de vínculo dinamicamente a partir das datas estruturadas", () => {
    const duration = employmentDuration("2023-06-15", null, "2026-08-15T12:00:00.000Z");
    expect(duration).toEqual({ years: 3, months: 2 });
    expect(formatEmploymentDuration(duration)).toBe("3 anos e 2 meses");
  });

  it("não reconhece documento genérico sem sinais fortes de CTPS", () => {
    const result = parseCtpsDigital([{ pageNumber: 1, y: 10, text: "Documento financeiro genérico", items: [] }], options);
    expect(result.document.parseStatus).toBe("UNRECOGNIZED");
    expect(result.employments).toHaveLength(0);
  });

  it("gera o PDF-resumo estruturado sem capturar a tela", () => {
    const pdf = buildCtpsSummaryPdf(parseCtpsDigital(SYNTHETIC_CTPS_LINES, options));
    const bytes = pdf.output("arraybuffer");
    expect(bytes.byteLength).toBeGreaterThan(1000);
    expect(pdf.getNumberOfPages()).toBeGreaterThan(0);
  });
});
