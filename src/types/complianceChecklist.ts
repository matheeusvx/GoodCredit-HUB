export type ComplianceChecklistStatus =
  | "PENDING"
  | "COMPLIANT"
  | "HAS_ISSUE"
  | "NOT_APPLICABLE";

export type ComplianceChecklistIconName =
  | "FileClock"
  | "RefreshCw"
  | "FileSearch"
  | "Landmark"
  | "FileCheck2"
  | "ReceiptText"
  | "MapPinned"
  | "ContactRound"
  | "WalletCards"
  | "HeartHandshake"
  | "MonitorCheck"
  | "ClipboardList"
  | "SearchCheck"
  | "TrendingDown"
  | "MonitorCog";

export interface ComplianceChecklistItemDefinition {
  id: string;
  order: number;
  label: string;
  icon: ComplianceChecklistIconName;
}

export interface ComplianceChecklistItemState {
  itemId: string;
  status: ComplianceChecklistStatus;
  observation: string;
  updatedAt: string | null;
}

export interface ComplianceChecklistState {
  clientName: string;
  processReference: string;
  analystName: string;
  reviewDate: string;
  items: ComplianceChecklistItemState[];
  lastUpdatedAt: string | null;
}

export type ComplianceChecklistOverallStatus =
  | "IN_PROGRESS"
  | "HAS_ISSUES"
  | "COMPLETED";

export interface ComplianceChecklistSummary {
  total: number;
  pending: number;
  compliant: number;
  hasIssue: number;
  notApplicable: number;
  completed: number;
  completionPercent: number;
  overallStatus: ComplianceChecklistOverallStatus;
}

export type ComplianceChecklistFilter =
  | "ALL"
  | ComplianceChecklistStatus;

export interface StoredComplianceChecklistState {
  version: 1;
  state: ComplianceChecklistState;
}
