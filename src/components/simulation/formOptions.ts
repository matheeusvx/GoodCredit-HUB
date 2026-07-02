import { BankCode, CivilStatus, FinancingType, OperationType } from "../../types/simulation";

export const civilStatusOptions: Array<{ value: CivilStatus; label: string }> = [
  { value: "SOLTEIRO", label: "Solteiro(a)" },
  { value: "CASADO", label: "Casado(a)" },
  { value: "SEPARADO", label: "Separado(a)" },
  { value: "DIVORCIADO", label: "Divorciado(a)" },
  { value: "VIUVO", label: "Viúvo(a)" }
];

export const financingTypeOptions: Array<{ value: FinancingType; label: string }> = [
  { value: "RESIDENCIAL", label: "Residencial" },
  { value: "COMERCIAL", label: "Comercial" }
];

export const operationTypeOptions: Array<{ value: OperationType; label: string }> = [
  { value: "NOVO", label: "Aquisição de Imóvel Novo" },
  { value: "USADO", label: "Aquisição de Imóvel Usado" },
  { value: "TERRENO", label: "Aquisição de Terreno" }
];

export const bankOptions: Array<{ value: Exclude<BankCode, "DESCONHECIDO">; label: string }> = [
  { value: "CAIXA", label: "Caixa" },
  { value: "INTER", label: "Inter" },
  { value: "BRADESCO", label: "Bradesco" },
  { value: "ITAU", label: "Itaú" },
  { value: "SANTANDER", label: "Santander" }
];

export const ufOptions = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO"
];
