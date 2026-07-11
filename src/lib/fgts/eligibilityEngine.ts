import { FgtsEligibilityForm, FgtsEligibilityResult } from "../../types/fgts";

export function evaluateFgtsEligibility(form: FgtsEligibilityForm): FgtsEligibilityResult {
  const required = [form.employmentThreeYears, form.activeSfhFinancing, form.ownsHomeResidenceCity, form.ownsHomeWorkCity, form.ownsHomeNearbyCity, form.ownHousingPurpose, form.contractEligible];
  const messages: string[] = [];
  if (!form.usageMode) return { status: "INCOMPLETE", label: "Informações incompletas", messages: ["Selecione a modalidade pretendida.", "Este resultado é apenas uma triagem inicial e não substitui a análise do banco."] };

  if (form.employmentThreeYears === "NO") messages.push("Possível impedimento identificado: o trabalhador informou não possuir o tempo mínimo de trabalho sob o regime do FGTS.");
  if (form.activeSfhFinancing === "YES") messages.push("Possível impedimento identificado: foi informado financiamento ativo no SFH. A situação deverá ser analisada antes da utilização do FGTS.");
  if ([form.ownsHomeResidenceCity, form.ownsHomeWorkCity, form.ownsHomeNearbyCity].includes("YES")) messages.push("Possível impedimento identificado: a propriedade informada pode impedir o uso do FGTS. É necessária análise da localização, titularidade e situação do imóvel.");
  if (form.ownHousingPurpose === "NO") messages.push("Possível impedimento: o imóvel informado não será destinado à moradia própria.");
  if (form.contractEligible === "NO") messages.push("O contrato ou financiamento informado pode não estar enquadrado para uso do FGTS.");
  if (form.usageMode === "AMORTIZATION" && form.installmentsCurrent === "NO") messages.push("Para amortização do saldo devedor, é necessário verificar a regularidade das prestações.");

  let status: FgtsEligibilityResult["status"] = "ELIGIBLE_INDICATIONS";
  let label = "Indícios de elegibilidade";
  if (messages.length) { status = "POSSIBLE_BARRIER"; label = "Possível impedimento"; }
  else if (required.includes("UNKNOWN")) {
    status = "NEEDS_CONFIRMATION";
    label = "Necessita confirmação";
    messages.push("As informações marcadas como 'Não sei' deverão ser confirmadas por meio da documentação e da análise do agente financeiro.");
  }
  messages.push("Este resultado é apenas uma triagem inicial e não substitui a análise do banco.");
  return { status, label, messages };
}
