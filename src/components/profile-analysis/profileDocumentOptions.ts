import type { ProfileDocumentOption } from "../../types/profileAnalysis";

export const PROFILE_DOCUMENT_OPTIONS: readonly ProfileDocumentOption[] = [
  {
    type: "BANK_STATEMENT",
    view: "BANK_STATEMENTS",
    title: "Extratos Bancários",
    description: "Movimentação, renda e comportamento financeiro",
    availability: "AVAILABLE",
  },
  {
    type: "CTPS",
    view: "CTPS",
    title: "Carteira de Trabalho",
    description: "Vínculos, cargos, salários e histórico profissional",
    availability: "AVAILABLE",
  },
  {
    type: "INCOME_TAX",
    view: "INCOME_TAX",
    title: "Imposto de Renda",
    description: "Rendimentos, patrimônio, dependentes e obrigações",
    availability: "IN_DEVELOPMENT",
  },
  {
    type: "FGTS",
    view: "FGTS",
    title: "FGTS",
    description: "Vínculos, depósitos, saldos e movimentações",
    availability: "IN_DEVELOPMENT",
  },
] as const;

export function getProfileDocumentOption(
  view: ProfileDocumentOption["view"],
): ProfileDocumentOption {
  const option = PROFILE_DOCUMENT_OPTIONS.find((item) => item.view === view);
  if (!option) throw new Error(`Tipo de documento não configurado: ${view}`);
  return option;
}
