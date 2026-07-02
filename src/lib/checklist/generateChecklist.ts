import {
  ChecklistAlert,
  ChecklistCategory,
  ChecklistFormData,
  ChecklistProfile,
  GeneratedChecklist
} from "../../types/checklist";
import { CHECKLIST_RULES, FGTS_CATEGORY, GOLDEN_RULES, PROCURADOR_CATEGORY } from "./checklistRules";

export function generateChecklist(formData: ChecklistFormData): GeneratedChecklist {
  const profile = resolveProfile(formData);
  const rule = CHECKLIST_RULES[profile];
  const categories = cloneCategories(rule.categories);
  const importantAlerts: ChecklistAlert[] = [];

  categories.forEach((category) => {
    if (category.alerts) importantAlerts.push(...category.alerts);
  });

  if (formData.usaFgts === "SIM") {
    const fgts = cloneCategory(FGTS_CATEGORY);
    categories.push(fgts);
    importantAlerts.push(...(fgts.alerts ?? []));
  }

  if (formData.possuiProcurador === "SIM") {
    const procurador = cloneCategory(PROCURADOR_CATEGORY);
    categories.push(procurador);
    importantAlerts.push(...(procurador.alerts ?? []));
  }

  if (formData.precisaMatriculaAtualizada === "SIM") {
    importantAlerts.push({
      id: "matricula-atualizada",
      label: "Matrícula atualizada com máximo de 30 dias, quando aplicável ao processo.",
      tone: "warning"
    });
  }

  importantAlerts.push(...(GOLDEN_RULES.alerts ?? []));

  return {
    id: `${profile}-${Date.now()}`,
    title: rule.title,
    profile,
    profileLabel: rule.label,
    formData,
    categories,
    importantAlerts,
    goldenRules: cloneCategory(GOLDEN_RULES),
    generatedAt: new Date().toISOString()
  };
}

export function resolveProfile(formData: ChecklistFormData): ChecklistProfile {
  if (formData.profile) return formData.profile;
  if (formData.participantType === "VENDEDOR" && formData.personType === "PJ") return "VENDEDOR_PJ";
  if (formData.participantType === "COMPRADOR") return "COMPRADOR_CLT";
  return "COMPRADOR_CLT";
}

function cloneCategories(categories: ChecklistCategory[]): ChecklistCategory[] {
  return categories.map(cloneCategory);
}

function cloneCategory(category: ChecklistCategory): ChecklistCategory {
  return {
    ...category,
    items: category.items.map((item) => ({ ...item })),
    alerts: category.alerts?.map((alert) => ({ ...alert }))
  };
}
