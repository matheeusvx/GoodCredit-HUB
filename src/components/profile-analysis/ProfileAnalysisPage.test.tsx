import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SIDEBAR_MODULES } from "../Sidebar";
import { QUICK_ACCESS_TOOLS } from "../home/QuickAccess";
import { profileAnalysisReducer } from "../../lib/profile-analysis/navigation";
import type { ProfileDocumentStatus } from "../../types/profileAnalysis";
import { ProfileAnalysisContent } from "./ProfileAnalysisPage";
import { PROFILE_DOCUMENT_OPTIONS, getProfileDocumentOption } from "./profileDocumentOptions";

vi.mock("../income-analysis/IncomeAnalysisPage", () => ({
  IncomeAnalysisPage: () => (
    <div>
      <h1>Extratos Bancários</h1>
      <p>Arraste os documentos para esta área</p>
      <button type="button">Iniciar análise</button>
    </div>
  ),
}));

const noop = () => undefined;

describe("Análise de Perfil", () => {
  it("renomeia o menu e o acesso rápido com a descrição solicitada", () => {
    expect(SIDEBAR_MODULES.find((item) => item.view === "income-analysis")?.label).toBe("Análise de Perfil");
    expect(QUICK_ACCESS_TOOLS.find((item) => item.target === "income-analysis")).toMatchObject({
      label: "Análise de Perfil",
      description: "Renda e documentos",
    });
  });

  it("abre a home do módulo com os quatro tipos documentais", () => {
    const html = renderToStaticMarkup(
      <ProfileAnalysisContent view="HOME" onOpen={noop} onBack={noop} onSendToSimulation={noop} />,
    );
    expect(html).toContain("Análise de Perfil");
    expect(html).toContain("Analise documentos financeiros e profissionais para consolidar o perfil do cliente.");
    PROFILE_DOCUMENT_OPTIONS.forEach((option) => expect(html).toContain(option.title));
    expect(html).toContain("Disponível");
    expect(html).toContain("Carteira de Trabalho. Disponível");
    expect(html).toContain("Imposto de Renda. Em desenvolvimento");
    expect(html).toContain("FGTS. Em desenvolvimento");
  });

  it("abre Extratos Bancários usando o analisador atual e apresenta retorno", () => {
    const html = renderToStaticMarkup(
      <ProfileAnalysisContent view="BANK_STATEMENTS" onOpen={noop} onBack={noop} onSendToSimulation={noop} />,
    );
    expect(html).toContain("Voltar para Análise de Perfil");
    expect(html).toContain("Extratos Bancários");
    expect(html).toContain("Arraste os documentos para esta área");
    expect(html).toContain("Iniciar análise");
  });

  it("abre o analisador real da Carteira de Trabalho", () => {
    const html = renderToStaticMarkup(
      <ProfileAnalysisContent view="CTPS" onOpen={noop} onBack={noop} onSendToSimulation={noop} />,
    );
    expect(html).toContain("Carteira de Trabalho");
    expect(html).toContain("Selecionar PDF");
    expect(html).toContain("Analisar documento");
    expect(html).toContain("type=\"file\"");
    expect(html).not.toContain("Em desenvolvimento");
  });

  it.each([
    ["INCOME_TAX", "Imposto de Renda"],
    ["FGTS", "FGTS"],
  ] as const)("abre o placeholder %s sem executar parser", (view, title) => {
    const html = renderToStaticMarkup(
      <ProfileAnalysisContent view={view} onOpen={noop} onBack={noop} onSendToSimulation={noop} />,
    );
    expect(html).toContain(title);
    expect(html).toContain(getProfileDocumentOption(view).description);
    expect(html).toContain("Em desenvolvimento");
    expect(html).toContain("O envio e o processamento deste documento serão disponibilizados em uma próxima etapa.");
    expect(html).not.toContain("type=\"file\"");
  });

  it("mantém a navegação interna e sempre retorna à home", () => {
    expect(profileAnalysisReducer("HOME", { type: "OPEN", view: "BANK_STATEMENTS" })).toBe("BANK_STATEMENTS");
    expect(profileAnalysisReducer("HOME", { type: "OPEN", view: "CTPS" })).toBe("CTPS");
    expect(profileAnalysisReducer("HOME", { type: "OPEN", view: "INCOME_TAX" })).toBe("INCOME_TAX");
    expect(profileAnalysisReducer("HOME", { type: "OPEN", view: "FGTS" })).toBe("FGTS");
    expect(profileAnalysisReducer("FGTS", { type: "BACK_HOME" })).toBe("HOME");
  });

  it("expõe os estados básicos preparados para evolução futura", () => {
    const statuses: ProfileDocumentStatus[] = [
      "NOT_ANALYZED",
      "PROCESSING",
      "ANALYZED",
      "REVIEW_REQUIRED",
    ];
    expect(statuses).toHaveLength(4);
  });
});
