import type { UsageGuide } from "../types/usageGuide";

export function normalizeUsageGuideSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function guideSearchText(guide: UsageGuide): string {
  return normalizeUsageGuideSearch([
    guide.title,
    guide.shortDescription,
    guide.purpose,
    ...guide.keywords,
    ...guide.keyFeatures,
    ...guide.whenToUse,
    ...guide.requiredInformation.flatMap((field) => [field.name, field.description, field.example || ""]),
    ...guide.steps.flatMap((step) => [step.title, step.description]),
    ...guide.results.flatMap((item) => [item.title, item.description]),
    ...guide.actions.flatMap((action) => [action.title, action.description]),
    ...guide.cautions,
    ...guide.commonMistakes
  ].join(" "));
}

export function filterUsageGuides(guides: UsageGuide[], query: string): UsageGuide[] {
  const normalized = normalizeUsageGuideSearch(query);
  if (!normalized) return guides;
  const terms = normalized.split(" ").filter(Boolean);
  return guides.filter((guide) => {
    const searchable = guideSearchText(guide);
    return terms.every((term) => searchable.includes(term));
  });
}
