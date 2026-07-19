export type FaqCategory =
  | "CREDIT_APPROVAL"
  | "FGTS_PROPERTY"
  | "INCOME_COMPOSITION"
  | "ENGINEERING_APPRAISAL"
  | "CONSTRUCTION"
  | "DOCUMENTATION";

export type FaqLink = {
  label: string;
  url: string;
};

export type FaqItem = {
  id: string;
  number: number;
  question: string;
  answer: string;
  category: FaqCategory;
  keywords: string[];
  sourcePage: number;
  links?: FaqLink[];
};

export type FaqCategoryOption = {
  value: FaqCategory | "ALL";
  label: string;
};
