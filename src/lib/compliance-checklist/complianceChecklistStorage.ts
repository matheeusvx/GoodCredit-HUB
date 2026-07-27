import { COMPLIANCE_CHECKLIST_ITEMS } from "../../data/complianceChecklistItems";
import {
  ComplianceChecklistItemState,
  ComplianceChecklistState,
  ComplianceChecklistStatus,
  ComplianceChecklistTemporaryDraft,
  StoredComplianceChecklistState
} from "../../types/complianceChecklist";

export const COMPLIANCE_CHECKLIST_STORAGE_KEY = "goodcredit_compliance_checklist_state";
export const COMPLIANCE_CHECKLIST_MIGRATION_COMPLETED_KEY =
  "goodcredit_compliance_checklist_migration_completed";
export const COMPLIANCE_CHECKLIST_MIGRATION_ID_KEY =
  "goodcredit_compliance_checklist_migration_id";
export const COMPLIANCE_CHECKLIST_TEMPORARY_DRAFT_KEY =
  "goodcredit_compliance_checklist_temporary_draft";

const VALID_STATUSES = new Set<ComplianceChecklistStatus>([
  "PENDING",
  "COMPLIANT",
  "HAS_ISSUE",
  "NOT_APPLICABLE"
]);

export function getLocalIsoDate(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function createInitialComplianceChecklistState(
  reviewDate = getLocalIsoDate()
): ComplianceChecklistState {
  return {
    clientName: "",
    processReference: "",
    analystName: "",
    reviewDate,
    items: COMPLIANCE_CHECKLIST_ITEMS.map((item) => ({
      itemId: item.id,
      status: "PENDING",
      observation: "",
      updatedAt: null
    })),
    lastUpdatedAt: null
  };
}

function normalizeItem(
  itemId: string,
  stored: Partial<ComplianceChecklistItemState> | undefined
): ComplianceChecklistItemState {
  return {
    itemId,
    status:
      stored?.status && VALID_STATUSES.has(stored.status) ? stored.status : "PENDING",
    observation: typeof stored?.observation === "string" ? stored.observation : "",
    updatedAt: typeof stored?.updatedAt === "string" ? stored.updatedAt : null
  };
}

export function normalizeComplianceChecklistState(
  value: unknown,
  fallbackDate = getLocalIsoDate()
): ComplianceChecklistState {
  if (!value || typeof value !== "object") {
    return createInitialComplianceChecklistState(fallbackDate);
  }

  const candidate = value as Partial<StoredComplianceChecklistState> &
    Partial<ComplianceChecklistState>;
  const source =
    candidate.version === 1 && candidate.state ? candidate.state : candidate;
  const storedItems = Array.isArray(source.items) ? source.items : [];
  const itemMap = new Map(storedItems.map((item) => [item.itemId, item]));

  return {
    clientName: typeof source.clientName === "string" ? source.clientName : "",
    processReference:
      typeof source.processReference === "string" ? source.processReference : "",
    analystName: typeof source.analystName === "string" ? source.analystName : "",
    reviewDate:
      typeof source.reviewDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(source.reviewDate)
        ? source.reviewDate
        : fallbackDate,
    items: COMPLIANCE_CHECKLIST_ITEMS.map((definition) =>
      normalizeItem(definition.id, itemMap.get(definition.id))
    ),
    lastUpdatedAt:
      typeof source.lastUpdatedAt === "string" ? source.lastUpdatedAt : null
  };
}

export function readComplianceChecklistState(
  storage: Pick<Storage, "getItem">
): ComplianceChecklistState {
  const raw = storage.getItem(COMPLIANCE_CHECKLIST_STORAGE_KEY);
  if (!raw) return createInitialComplianceChecklistState();

  try {
    return normalizeComplianceChecklistState(JSON.parse(raw));
  } catch {
    return createInitialComplianceChecklistState();
  }
}

export function saveComplianceChecklistState(
  storage: Pick<Storage, "setItem">,
  state: ComplianceChecklistState
): void {
  const stored: StoredComplianceChecklistState = {
    version: 1,
    state: normalizeComplianceChecklistState(state, state.reviewDate)
  };
  storage.setItem(COMPLIANCE_CHECKLIST_STORAGE_KEY, JSON.stringify(stored));
}

export function resetComplianceChecklistItems(
  state: ComplianceChecklistState,
  timestamp = new Date().toISOString()
): ComplianceChecklistState {
  return {
    ...state,
    items: createInitialComplianceChecklistState(state.reviewDate).items,
    lastUpdatedAt: timestamp
  };
}

export function createNewComplianceChecklist(
  reviewDate = getLocalIsoDate()
): ComplianceChecklistState {
  return createInitialComplianceChecklistState(reviewDate);
}

export function readLegacyComplianceChecklist(
  storage: Pick<Storage, "getItem">
): ComplianceChecklistState | null {
  if (storage.getItem(COMPLIANCE_CHECKLIST_MIGRATION_COMPLETED_KEY) === "true") {
    return null;
  }
  const raw = storage.getItem(COMPLIANCE_CHECKLIST_STORAGE_KEY);
  if (!raw) return null;
  try {
    const state = normalizeComplianceChecklistState(JSON.parse(raw));
    const hasContent =
      Boolean(state.clientName.trim()) ||
      Boolean(state.processReference.trim()) ||
      Boolean(state.analystName.trim()) ||
      state.items.some(
        (item) => item.status !== "PENDING" || Boolean(item.observation.trim())
      );
    return hasContent ? state : null;
  } catch {
    return null;
  }
}

export function markLegacyComplianceChecklistMigrated(
  storage: Pick<Storage, "setItem" | "removeItem">
): void {
  storage.setItem(COMPLIANCE_CHECKLIST_MIGRATION_COMPLETED_KEY, "true");
  storage.removeItem(COMPLIANCE_CHECKLIST_MIGRATION_ID_KEY);
}

export function removeLegacyComplianceChecklist(
  storage: Pick<Storage, "removeItem" | "setItem">
): void {
  storage.removeItem(COMPLIANCE_CHECKLIST_STORAGE_KEY);
  storage.removeItem(COMPLIANCE_CHECKLIST_MIGRATION_ID_KEY);
  storage.setItem(COMPLIANCE_CHECKLIST_MIGRATION_COMPLETED_KEY, "true");
}

export function getLegacyComplianceChecklistMigrationId(
  storage: Pick<Storage, "getItem" | "setItem">
): string {
  const current = storage.getItem(COMPLIANCE_CHECKLIST_MIGRATION_ID_KEY);
  if (current) return current;
  const id = crypto.randomUUID();
  storage.setItem(COMPLIANCE_CHECKLIST_MIGRATION_ID_KEY, id);
  return id;
}

export function saveTemporaryComplianceChecklistDraft(
  storage: Pick<Storage, "setItem">,
  state: ComplianceChecklistState,
  checklistId: string | null,
  expectedUpdatedAt: string | null,
  pendingCreationId: string | null = null
): void {
  const draft: ComplianceChecklistTemporaryDraft = {
    version: 2,
    checklistId,
    pendingCreationId,
    expectedUpdatedAt,
    state: normalizeComplianceChecklistState(state, state.reviewDate),
    savedAt: new Date().toISOString()
  };
  storage.setItem(COMPLIANCE_CHECKLIST_TEMPORARY_DRAFT_KEY, JSON.stringify(draft));
}

export function readTemporaryComplianceChecklistDraft(
  storage: Pick<Storage, "getItem">
): ComplianceChecklistTemporaryDraft | null {
  const raw = storage.getItem(COMPLIANCE_CHECKLIST_TEMPORARY_DRAFT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ComplianceChecklistTemporaryDraft>;
    if (parsed.version !== 2 || !parsed.state || typeof parsed.savedAt !== "string") {
      return null;
    }
    return {
      version: 2,
      checklistId: typeof parsed.checklistId === "string" ? parsed.checklistId : null,
      pendingCreationId:
        typeof parsed.pendingCreationId === "string"
          ? parsed.pendingCreationId
          : null,
      expectedUpdatedAt:
        typeof parsed.expectedUpdatedAt === "string"
          ? parsed.expectedUpdatedAt
          : null,
      state: normalizeComplianceChecklistState(parsed.state),
      savedAt: parsed.savedAt
    };
  } catch {
    return null;
  }
}

export function clearTemporaryComplianceChecklistDraft(
  storage: Pick<Storage, "removeItem">
): void {
  storage.removeItem(COMPLIANCE_CHECKLIST_TEMPORARY_DRAFT_KEY);
}
