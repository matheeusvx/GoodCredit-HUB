export type UsageGuideId =
  | "home"
  | "amortization"
  | "financing-simulation"
  | "pro-soluto"
  | "income-analysis"
  | "document-checklist"
  | "fgts"
  | "faq";

export type UsageGuideDestination =
  | "home"
  | "amortization"
  | "simulation"
  | "pro-soluto"
  | "income-analysis"
  | "checklist"
  | "fgts"
  | "faq";

export type UsageGuideIcon =
  | "home"
  | "amortization"
  | "simulation"
  | "pro-soluto"
  | "income"
  | "checklist"
  | "fgts"
  | "faq";

export interface UsageGuideStep {
  id: string;
  title: string;
  description: string;
}

export interface UsageGuideField {
  name: string;
  description: string;
  required?: boolean;
  example?: string;
}

export interface UsageGuideResultItem {
  title: string;
  description: string;
}

export interface UsageGuideAction {
  title: string;
  description: string;
}

export interface UsageGuide {
  id: UsageGuideId;
  anchor: string;
  title: string;
  shortDescription: string;
  destination: UsageGuideDestination;
  icon: UsageGuideIcon;
  keywords: string[];
  keyFeatures: string[];
  purpose: string;
  whenToUse: string[];
  requiredInformation: UsageGuideField[];
  steps: UsageGuideStep[];
  results: UsageGuideResultItem[];
  actions: UsageGuideAction[];
  cautions: string[];
  commonMistakes: string[];
}
