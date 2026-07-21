import type { UsageGuide } from "../types/usageGuide";

export function buildUsageGuideInstructions(guide: UsageGuide): string {
  const highlights = guide.instructionHighlights?.length
    ? ["", "Pontos principais:", ...guide.instructionHighlights.map((item) => `- ${item}`)]
    : [];

  return [
    guide.title,
    "",
    "Para que serve:",
    guide.purpose,
    ...highlights,
    "",
    "Passo a passo:",
    ...guide.steps.map((step, index) => `${index + 1}. ${step.title}: ${step.description}`),
    "",
    "Principais cuidados:",
    ...guide.cautions.map((item) => `- ${item}`)
  ].join("\n");
}
