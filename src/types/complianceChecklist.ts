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

export interface ComplianceChecklistRecord {
  id: string;
  clientName: string;
  processReference: string;
  analystName: string;
  reviewDate: string;
  overallStatus: ComplianceChecklistOverallStatus;
  completionPercent: number;
  createdBy: string;
  updatedBy: string;
  createdByLabel: string;
  updatedByLabel: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface ComplianceChecklistItemRecord {
  id: string;
  checklistId: string;
  itemKey: string;
  itemOrder: number;
  itemLabel: string;
  status: ComplianceChecklistStatus;
  observation: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ComplianceChecklistDetail {
  record: ComplianceChecklistRecord;
  state: ComplianceChecklistState;
  items: ComplianceChecklistItemRecord[];
}

export type ComplianceChecklistArchiveFilter = "ACTIVE" | "ARCHIVED" | "ALL";

export type ComplianceChecklistSort =
  | "UPDATED_DESC"
  | "UPDATED_ASC"
  | "CLIENT_ASC"
  | "REVIEW_DATE_DESC"
  | "PROGRESS_DESC"
  | "PROGRESS_ASC";

export interface ComplianceChecklistListFilters {
  search: string;
  status: "ALL" | ComplianceChecklistOverallStatus;
  analystName: string;
  startDate: string;
  endDate: string;
  archive: ComplianceChecklistArchiveFilter;
  sort: ComplianceChecklistSort;
  page: number;
  pageSize: 10 | 25 | 50;
}

export interface ComplianceChecklistListResult {
  records: ComplianceChecklistRecord[];
  total: number;
}

export interface ComplianceChecklistMetrics {
  active: number;
  inProgress: number;
  hasIssues: number;
  completed: number;
  archived: number;
}

export type ComplianceChecklistSaveStatus =
  | "IDLE"
  | "PENDING"
  | "SAVING"
  | "SAVED"
  | "ERROR"
  | "CONFLICT";

export interface ComplianceChecklistAuditContext {
  checklistId: string;
  createdByLabel: string;
  updatedByLabel: string;
  createdAt: string;
  updatedAt: string;
}

export interface ComplianceChecklistDuplicateOptions {
  copyItems: boolean;
  clearProcessReference: boolean;
}

export interface ComplianceChecklistTemporaryDraft {
  version: 2;
  checklistId: string | null;
  pendingCreationId: string | null;
  expectedUpdatedAt: string | null;
  state: ComplianceChecklistState;
  savedAt: string;
}
