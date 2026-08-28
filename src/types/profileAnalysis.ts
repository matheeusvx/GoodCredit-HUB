export type ProfileDocumentType =
  | "BANK_STATEMENT"
  | "CTPS"
  | "INCOME_TAX"
  | "FGTS";

export type ProfileDocumentStatus =
  | "NOT_ANALYZED"
  | "PROCESSING"
  | "ANALYZED"
  | "REVIEW_REQUIRED";

export type ProfileAnalysisView =
  | "HOME"
  | "BANK_STATEMENTS"
  | "CTPS"
  | "INCOME_TAX"
  | "FGTS";

export interface ProfileDocumentOption {
  type: ProfileDocumentType;
  view: Exclude<ProfileAnalysisView, "HOME">;
  title: string;
  description: string;
  availability: "AVAILABLE" | "IN_DEVELOPMENT";
}
