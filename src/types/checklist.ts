export type ParticipantType = "COMPRADOR" | "VENDEDOR";
export type PersonType = "PF" | "PJ";
export type BuyerProfile = "COMPRADOR_CLT" | "COMPRADOR_AUTONOMO";
export type SellerProfile = "VENDEDOR_PJ";
export type ChecklistProfile = BuyerProfile | SellerProfile;
export type YesNo = "SIM" | "NAO";

export interface ChecklistItem {
  id: string;
  label: string;
}

export interface ChecklistAlert {
  id: string;
  label: string;
  tone?: "warning" | "danger" | "info";
}

export interface ChecklistCategory {
  id: string;
  title: string;
  icon?: string;
  items: ChecklistItem[];
  alerts?: ChecklistAlert[];
  note?: string;
}

export interface ChecklistFormData {
  nome: string;
  participantType: ParticipantType | "";
  personType: PersonType | "";
  profile: ChecklistProfile | "";
  banco: "CAIXA" | "INTER" | "BRADESCO" | "ITAU" | "SANTANDER" | "NAO_INFORMADO";
  usaFgts: YesNo;
  tipoOperacao: "NOVO" | "USADO" | "TERRENO" | "NAO_INFORMADO";
  possuiProcurador: YesNo;
  precisaMatriculaAtualizada: YesNo;
}

export interface GeneratedChecklist {
  id: string;
  title: string;
  profile: ChecklistProfile;
  profileLabel: string;
  formData: ChecklistFormData;
  categories: ChecklistCategory[];
  importantAlerts: ChecklistAlert[];
  goldenRules: ChecklistCategory;
  generatedAt: string;
}
