import type { FgtsEligibilityForm, FgtsEligibilityResult } from "../../types/fgts";

export function evaluateFgtsEligibility(form: FgtsEligibilityForm): FgtsEligibilityResult {
  const required = [form.employmentThreeYears, form.activeSfhFinancing, form.ownsHomeResidenceCity, form.ownsHomeWorkCity, form.ownsHomeNearbyCity, form.ownsHomeOtherState, form.ownHousingPurpose, form.contractEligible];
  const messages: string[] = [];
  let needsConfirmation = false;

  if (!form.usageMode) return { status: "INCOMPLETE", label: "Informações incompletas", messages: ["Selecione a modalidade pretendida.", "Este resultado é apenas uma triagem inicial e não substitui a análise do banco."] };
  if (form.employmentThreeYears === "NO") messages.push("Possível impedimento identificado: o trabalhador informou não possuir o tempo mínimo de trabalho sob o regime do FGTS.");
  if (form.activeSfhFinancing === "YES") messages.push("Possível impedimento identificado: foi informado financiamento ativo no SFH. A situação deverá ser analisada antes da utilização do FGTS.");
  if ([form.ownsHomeResidenceCity, form.ownsHomeWorkCity, form.ownsHomeNearbyCity].includes("YES")) messages.push("Possível impedimento identificado: a propriedade informada pode impedir o uso do FGTS. É necessária análise da localização, titularidade e situação do imóvel.");
  if (form.ownHousingPurpose === "NO") messages.push("Possível impedimento: o imóvel informado não será destinado à moradia própria.");
  if (form.contractEligible === "NO") messages.push("O contrato ou financiamento informado pode não estar enquadrado para uso do FGTS.");
  if (form.usageMode === "AMORTIZATION" && form.installmentsCurrent === "NO") messages.push("Para amortização do saldo devedor, é necessário verificar a regularidade das prestações.");

  if (form.ownsHomeOtherState === "YES" && form.otherStateHomePaid === "YES") {
    needsConfirmation = true;
    messages.push("O cliente informou possuir imóvel quitado em outro estado. A utilização do FGTS para aquisição de outro imóvel poderá seguir para análise, sujeita à localização dos imóveis, enquadramento da operação, documentação e validação do agente financeiro.");
  } else if (form.ownsHomeOtherState === "YES" && form.otherStateHomePaid === "NO") {
    messages.push("O imóvel informado em outro estado não está quitado. A situação precisa ser analisada antes de considerar a utilização do FGTS.");
  } else if (form.ownsHomeOtherState === "YES" || form.ownsHomeOtherState === "UNKNOWN") {
    needsConfirmation = true;
    messages.push("Confirme a situação de quitação e a localização do imóvel antes de concluir a análise.");
  }

  const hasBarrier = form.employmentThreeYears === "NO" || form.activeSfhFinancing === "YES" || [form.ownsHomeResidenceCity, form.ownsHomeWorkCity, form.ownsHomeNearbyCity].includes("YES") || form.ownHousingPurpose === "NO" || form.contractEligible === "NO" || (form.usageMode === "AMORTIZATION" && form.installmentsCurrent === "NO") || (form.ownsHomeOtherState === "YES" && form.otherStateHomePaid === "NO");
  let status: FgtsEligibilityResult["status"] = "ELIGIBLE_INDICATIONS";
  let label = "Indícios de elegibilidade";

  if (hasBarrier) {
    status = "POSSIBLE_BARRIER";
    label = "Possível impedimento";
  } else if (needsConfirmation || required.includes("UNKNOWN")) {
    status = "NEEDS_CONFIRMATION";
    label = "Necessita confirmação";
    if (required.includes("UNKNOWN")) messages.push("As informações marcadas como 'Não sei' deverão ser confirmadas por meio da documentação e da análise do agente financeiro.");
  }

  messages.push("Este resultado é apenas uma orientação inicial e não declara elegibilidade definitiva para uso do FGTS.");
  return { status, label, messages: [...new Set(messages)] };
}
