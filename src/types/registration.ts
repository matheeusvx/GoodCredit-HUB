export type RegistrationTool = "ITBI" | "CARTORIAL_COSTS";

export type RegistrationCity =
  | "SAO_BERNARDO_DO_CAMPO"
  | "DIADEMA"
  | "SANTO_ANDRE"
  | "SAO_PAULO"
  | "GUARULHOS"
  | "MAUA";

export type CityAvailability = "AVAILABLE" | "IN_DEVELOPMENT";

export type ItbiCalculationStatus =
  | "CALCULATED"
  | "RULE_NOT_APPLICABLE"
  | "IN_DEVELOPMENT"
  | "INVALID_INPUT";

export interface RegistrationCityConfig {
  id: RegistrationCity;
  label: string;
  availability: CityAvailability;
}

export interface SimplifiedItbiInput {
  city: RegistrationCity;
  purchasePrice: number;
}

export interface SimplifiedItbiResult {
  city: RegistrationCity;
  status: ItbiCalculationStatus;
  purchasePrice: number;
  rate: number | null;
  fixedDeduction: number;
  grossTax: number | null;
  estimatedItbi: number | null;
  rangeLabel: string | null;
  equivalentReductionPercent: number | null;
  warnings: string[];
}
