import { COMPLIANCE_CHECKLIST_ITEMS } from "../../data/complianceChecklistItems";
import {
  ComplianceChecklistItemState,
  ComplianceChecklistState,
  ComplianceChecklistStatus,
  StoredComplianceChecklistState
} from "../../types/complianceChecklist";

export const COMPLIANCE_CHECKLIST_STORAGE_KEY = "goodcredit_compliance_checklist_state";

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
