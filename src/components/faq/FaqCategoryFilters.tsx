import { FAQ_CATEGORIES } from "../../data/faqData";
import type { FaqCategory } from "../../types/faq";

interface FaqCategoryFiltersProps {
  selected: FaqCategory | "ALL";
  onChange: (category: FaqCategory | "ALL") => void;
}

export function FaqCategoryFilters({ selected, onChange }: FaqCategoryFiltersProps) {
  return (
    <div>
      <p className="mb-2 text-sm font-bold text-slate-700" id="faq-category-label">
        Filtrar por categoria
      </p>
      <div
        className="flex gap-2 overflow-x-auto pb-2 lg:flex-wrap lg:overflow-visible xl:flex-nowrap xl:overflow-x-auto"
        role="group"
        aria-labelledby="faq-category-label"
      >
        {FAQ_CATEGORIES.map((category) => {
          const isSelected = selected === category.value;
          return (
            <button
              key={category.value}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onChange(category.value)}
              className={`h-10 shrink-0 rounded-lg border px-3 text-xs font-bold transition focus:outline-none focus:ring-4 focus:ring-goodgreen-100 ${
                isSelected
                  ? "border-goodgreen-600 bg-goodgreen-600 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              {category.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
