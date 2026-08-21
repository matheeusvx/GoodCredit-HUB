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
export const COMPLIANCE_CHECKLIST_LOCAL_OWNER_KEY =
  "goodcredit_compliance_checklist_local_owner";

function scopedStorageKey(baseKey: string, userId: string): string {
  if (!userId) throw new Error("Usuário obrigatório para armazenamento local.");
  return `${baseKey}:${userId}`;
}

export function getComplianceChecklistStorageKey(userId: string): string {
  return scopedStorageKey(COMPLIANCE_CHECKLIST_STORAGE_KEY, userId);
}

export function getComplianceChecklistTemporaryDraftKey(userId: string): string {
  return scopedStorageKey(COMPLIANCE_CHECKLIST_TEMPORARY_DRAFT_KEY, userId);
}

function claimUnscopedLegacyData(
  storage: Pick<Storage, "getItem" | "setItem">,
  userId: string
): boolean {
  const owner = storage.getItem(COMPLIANCE_CHECKLIST_LOCAL_OWNER_KEY);
  if (owner) return owner === userId;
  storage.setItem(COMPLIANCE_CHECKLIST_LOCAL_OWNER_KEY, userId);
  return true;
}

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
  storage: Pick<Storage, "getItem">,
  userId: string
): ComplianceChecklistState {
  const raw = storage.getItem(getComplianceChecklistStorageKey(userId));
  if (!raw) return createInitialComplianceChecklistState();

  try {
    return normalizeComplianceChecklistState(JSON.parse(raw));
  } catch {
    return createInitialComplianceChecklistState();
  }
}

export function saveComplianceChecklistState(
  storage: Pick<Storage, "setItem">,
  state: ComplianceChecklistState,
  userId: string
): void {
  const stored: StoredComplianceChecklistState = {
    version: 1,
    state: normalizeComplianceChecklistState(state, state.reviewDate)
  };
  storage.setItem(getComplianceChecklistStorageKey(userId), JSON.stringify(stored));
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
  storage: Pick<Storage, "getItem" | "setItem">,
  userId: string
): ComplianceChecklistState | null {
  const completedKey = scopedStorageKey(
    COMPLIANCE_CHECKLIST_MIGRATION_COMPLETED_KEY,
    userId
  );
  if (storage.getItem(completedKey) === "true") {
    return null;
  }
  const scopedState = storage.getItem(getComplianceChecklistStorageKey(userId));
  const unscopedState = storage.getItem(COMPLIANCE_CHECKLIST_STORAGE_KEY);
  const raw =
    scopedState ??
    (unscopedState && claimUnscopedLegacyData(storage, userId)
      ? unscopedState
      : null);
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
  storage: Pick<Storage, "setItem" | "removeItem">,
  userId: string
): void {
  storage.setItem(
    scopedStorageKey(COMPLIANCE_CHECKLIST_MIGRATION_COMPLETED_KEY, userId),
    "true"
  );
  storage.removeItem(scopedStorageKey(COMPLIANCE_CHECKLIST_MIGRATION_ID_KEY, userId));
}

export function removeLegacyComplianceChecklist(
  storage: Pick<Storage, "getItem" | "removeItem" | "setItem">,
  userId: string
): void {
  storage.removeItem(getComplianceChecklistStorageKey(userId));
  storage.removeItem(scopedStorageKey(COMPLIANCE_CHECKLIST_MIGRATION_ID_KEY, userId));
  if (storage.getItem(COMPLIANCE_CHECKLIST_LOCAL_OWNER_KEY) === userId) {
    storage.removeItem(COMPLIANCE_CHECKLIST_STORAGE_KEY);
  }
  storage.setItem(
    scopedStorageKey(COMPLIANCE_CHECKLIST_MIGRATION_COMPLETED_KEY, userId),
    "true"
  );
}

export function getLegacyComplianceChecklistMigrationId(
  storage: Pick<Storage, "getItem" | "setItem">,
  userId: string
): string {
  const key = scopedStorageKey(COMPLIANCE_CHECKLIST_MIGRATION_ID_KEY, userId);
  const current = storage.getItem(key);
  if (current) return current;
  const id = crypto.randomUUID();
  storage.setItem(key, id);
  return id;
}

export function saveTemporaryComplianceChecklistDraft(
  storage: Pick<Storage, "setItem">,
  state: ComplianceChecklistState,
  checklistId: string | null,
  expectedUpdatedAt: string | null,
  pendingCreationId: string | null,
  userId: string
): void {
  const draft: ComplianceChecklistTemporaryDraft = {
    version: 2,
    checklistId,
    pendingCreationId,
    expectedUpdatedAt,
    state: normalizeComplianceChecklistState(state, state.reviewDate),
    savedAt: new Date().toISOString()
  };
  storage.setItem(
    getComplianceChecklistTemporaryDraftKey(userId),
    JSON.stringify(draft)
  );
}

export function readTemporaryComplianceChecklistDraft(
  storage: Pick<Storage, "getItem" | "setItem">,
  userId: string
): ComplianceChecklistTemporaryDraft | null {
  const scopedKey = getComplianceChecklistTemporaryDraftKey(userId);
  let raw = storage.getItem(scopedKey);
  if (!raw) {
    const unscopedDraft = storage.getItem(COMPLIANCE_CHECKLIST_TEMPORARY_DRAFT_KEY);
    if (unscopedDraft && claimUnscopedLegacyData(storage, userId)) {
      raw = unscopedDraft;
      storage.setItem(scopedKey, unscopedDraft);
    }
  }
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
  storage: Pick<Storage, "getItem" | "removeItem">,
  userId: string
): void {
  storage.removeItem(getComplianceChecklistTemporaryDraftKey(userId));
  if (storage.getItem(COMPLIANCE_CHECKLIST_LOCAL_OWNER_KEY) === userId) {
    storage.removeItem(COMPLIANCE_CHECKLIST_TEMPORARY_DRAFT_KEY);
  }
}
