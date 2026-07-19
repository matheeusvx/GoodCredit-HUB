import { FAQ_CATEGORIES } from "../data/faqData";
import type { FaqCategory, FaqItem } from "../types/faq";

export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function getFaqCategoryLabel(category: FaqCategory): string {
  return FAQ_CATEGORIES.find((option) => option.value === category)?.label ?? category;
}

export function filterFaqItems(
  items: FaqItem[],
  query: string,
  category: FaqCategory | "ALL"
): FaqItem[] {
  const normalizedQuery = normalizeSearchText(query);

  return items.filter((item) => {
    if (category !== "ALL" && item.category !== category) return false;
    if (!normalizedQuery) return true;

    const searchableText = normalizeSearchText(
      [
        item.number,
        item.question,
        item.answer,
        getFaqCategoryLabel(item.category),
        ...item.keywords
      ].join(" ")
    );

    return normalizedQuery.split(" ").every((term) => searchableText.includes(term));
  });
}
