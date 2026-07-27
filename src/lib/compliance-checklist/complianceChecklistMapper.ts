import { COMPLIANCE_CHECKLIST_ITEMS } from "../../data/complianceChecklistItems";
import type {
  ComplianceChecklistDetail,
  ComplianceChecklistItemRecord,
  ComplianceChecklistItemState,
  ComplianceChecklistOverallStatus,
  ComplianceChecklistRecord,
  ComplianceChecklistState,
  ComplianceChecklistStatus
} from "../../types/complianceChecklist";
import { createInitialComplianceChecklistState } from "./complianceChecklistStorage";

export interface ComplianceChecklistDatabaseRow {
  id: string;
  client_name: string;
  process_reference: string | null;
  analyst_name: string | null;
  review_date: string;
  overall_status: ComplianceChecklistOverallStatus;
  completion_percent: number | string;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface ComplianceChecklistItemDatabaseRow {
  id: string;
  checklist_id: string;
  item_key: string;
  item_order: number;
  item_label: string;
  status: ComplianceChecklistStatus;
  observation: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
}

export function shortUserId(value: string): string {
  return value ? `Usuário ${value.slice(0, 8)}` : "Usuário não identificado";
}

export function mapComplianceChecklistRecord(
  row: ComplianceChecklistDatabaseRow,
  labels: ReadonlyMap<string, string> = new Map()
): ComplianceChecklistRecord {
  return {
    id: row.id,
    clientName: row.client_name,
    processReference: row.process_reference ?? "",
    analystName: row.analyst_name ?? "",
    reviewDate: row.review_date,
    overallStatus: row.overall_status,
    completionPercent: Number(row.completion_percent),
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdByLabel: labels.get(row.created_by) ?? shortUserId(row.created_by),
    updatedByLabel: labels.get(row.updated_by) ?? shortUserId(row.updated_by),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at
  };
}

export function mapComplianceChecklistItemRecord(
  row: ComplianceChecklistItemDatabaseRow
): ComplianceChecklistItemRecord {
  return {
    id: row.id,
    checklistId: row.checklist_id,
    itemKey: row.item_key,
    itemOrder: row.item_order,
    itemLabel: row.item_label,
    status: row.status,
    observation: row.observation,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function mapDetailToEditorState(
  record: ComplianceChecklistRecord,
  items: ComplianceChecklistItemRecord[]
): ComplianceChecklistState {
  const itemMap = new Map(items.map((item) => [item.itemKey, item]));
  return {
    clientName: record.clientName,
    processReference: record.processReference,
    analystName: record.analystName,
    reviewDate: record.reviewDate,
    items: COMPLIANCE_CHECKLIST_ITEMS.map((definition) => {
      const stored = itemMap.get(definition.id);
      return {
        itemId: definition.id,
        status: stored?.status ?? "PENDING",
        observation: stored?.observation ?? "",
        updatedAt: stored?.updatedAt ?? null
      } satisfies ComplianceChecklistItemState;
    }),
    lastUpdatedAt: record.updatedAt
  };
}

export function createComplianceChecklistDetail(
  record: ComplianceChecklistRecord,
  itemRows: ComplianceChecklistItemDatabaseRow[]
): ComplianceChecklistDetail {
  const items = itemRows
    .map(mapComplianceChecklistItemRecord)
    .sort((a, b) => a.itemOrder - b.itemOrder);
  return {
    record,
    state: mapDetailToEditorState(record, items),
    items
  };
}

export function createBlankEditorState(reviewDate?: string): ComplianceChecklistState {
  return createInitialComplianceChecklistState(reviewDate);
}
