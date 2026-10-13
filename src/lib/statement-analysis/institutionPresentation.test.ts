import { describe, expect, it } from "vitest";
import { getInstitution, getInstitutionPresentation, INSTITUTION_CATALOG } from "./institutionCatalog";
import sources from "./institutionLogoSources.json";

describe("apresentação do catálogo sem mudança de capacidades", () => {
  it("nenhum leitor específico recebe asterisco ou tooltip de limitação", () => {
    const specific = INSTITUTION_CATALOG.filter((entry) => entry.capability.startsWith("SPECIFIC_"));
    expect(specific).toHaveLength(9);
    specific.forEach((entry) => expect(getInstitutionPresentation(entry)).toEqual({ asterisk: false, tooltip: null, accessibleStatus: "Leitura específica disponível." }));
    expect(getInstitutionPresentation()).toMatchObject({ asterisk: false, tooltip: null });
  });
  it("leitura genérica e documento não suportado têm avisos distintos e acessíveis", () => {
    const generic = INSTITUTION_CATALOG.filter((entry) => entry.capability === "GENERIC_BANK");
    const unsupported = INSTITUTION_CATALOG.filter((entry) => entry.capability === "UNSUPPORTED");
    expect(generic).toHaveLength(7); expect(unsupported).toHaveLength(5);
    generic.forEach((entry) => expect(getInstitutionPresentation(entry)).toEqual({ asterisk: true, tooltip: "Leitura genérica. Confira os lançamentos antes de concluir.", accessibleStatus: "Leitura genérica. Confira os lançamentos antes de concluir." }));
    unsupported.forEach((entry) => expect(getInstitutionPresentation(entry)).toEqual({ asterisk: true, tooltip: "Leitura ainda não disponível para este documento.", accessibleStatus: "Leitura ainda não disponível para este documento." }));
  });
  it("reutiliza Itaú na poupança e mantém Outra instituição neutra", () => {
    expect(getInstitution("ITAU")?.logo).toBe("/institutions/itau.png");
    expect(getInstitution("ITAU_POUPANCA")?.logo).toBe(getInstitution("ITAU")?.logo);
    expect(getInstitution("OTHER")?.logo).toBeNull();
    expect(getInstitution("99")?.logo).toBeNull();
  });
  it("todos os logos têm asset local e proveniência; fallbacks continuam explícitos", () => {
    expect(INSTITUTION_CATALOG).toHaveLength(21);
    INSTITUTION_CATALOG.forEach((entry) => {
      const source = sources.find((row) => row.id === (entry.id === "ITAU_POUPANCA" ? "ITAU" : entry.id));
      if (entry.logo) {
        expect(entry.logo).toMatch(/^\/institutions\/[a-z_0-9]+\.(svg|png)$/);
        expect(source?.source).toMatch(/^https:\/\//);
        expect(source && "sha256" in source ? source.sha256 : null).toMatch(/^[a-f0-9]{64}$/);
      } else if (entry.id !== "OTHER") expect(source && "fallbackReason" in source ? source.fallbackReason : null).toBeTruthy();
    });
    expect(INSTITUTION_CATALOG.filter((entry) => entry.logo)).toHaveLength(19);
  });
});
