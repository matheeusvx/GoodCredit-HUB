import { COMPLIANCE_CHECKLIST_ITEMS } from "../data/complianceChecklistItems";
import { requireSupabase } from "../lib/supabase";
import {
  createComplianceChecklistDetail,
  mapComplianceChecklistRecord,
  type ComplianceChecklistDatabaseRow,
  type ComplianceChecklistItemDatabaseRow
} from "../lib/compliance-checklist/complianceChecklistMapper";
import { calculateComplianceChecklistSummary } from "../lib/compliance-checklist/complianceChecklistSummary";
import { getLocalIsoDate } from "../lib/compliance-checklist/complianceChecklistStorage";
import type {
  ComplianceChecklistDetail,
  ComplianceChecklistDuplicateOptions,
  ComplianceChecklistListFilters,
  ComplianceChecklistListResult,
  ComplianceChecklistMetrics,
  ComplianceChecklistRecord,
  ComplianceChecklistState
} from "../types/complianceChecklist";

export class ComplianceChecklistConflictError extends Error {
  constructor() {
    super("Este checklist foi atualizado por outro usuário.");
    this.name = "ComplianceChecklistConflictError";
  }
}

function sanitizeFilterValue(value: string): string {
  return value.replace(/[%_(),]/g, " ").replace(/\s+/g, " ").trim();
}

async function authenticatedUser() {
  const client = requireSupabase();
  const {
    data: { user },
    error
  } = await client.auth.getUser();
  if (error || !user) throw new Error("Sessão expirada. Entre novamente.");
  return user;
}

async function getUserLabels(userIds: string[]): Promise<Map<string, string>> {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  const labels = new Map<string, string>();
  if (uniqueIds.length === 0) return labels;

  const client = requireSupabase();
  const { data, error } = await client.rpc("get_compliance_user_labels", {
    p_user_ids: uniqueIds
  });
  if (!error && Array.isArray(data)) {
    for (const row of data as Array<{ id: string; email: string | null }>) {
      if (row.email) labels.set(row.id, row.email);
    }
  }

  const {
    data: { user }
  } = await client.auth.getUser();
  if (user?.email) labels.set(user.id, user.email);
  return labels;
}

export async function listComplianceChecklists(
  filters: ComplianceChecklistListFilters
): Promise<ComplianceChecklistListResult> {
  const client = requireSupabase();
  const from = (filters.page - 1) * filters.pageSize;
  const to = from + filters.pageSize - 1;
  let query = client
    .from("compliance_checklists")
    .select("*", { count: "exact" });

  if (filters.archive === "ACTIVE") query = query.is("archived_at", null);
  if (filters.archive === "ARCHIVED") query = query.not("archived_at", "is", null);
  if (filters.status !== "ALL") query = query.eq("overall_status", filters.status);
  if (filters.analystName) query = query.eq("analyst_name", filters.analystName);
  if (filters.startDate) query = query.gte("review_date", filters.startDate);
  if (filters.endDate) query = query.lte("review_date", filters.endDate);

  const search = sanitizeFilterValue(filters.search);
  if (search) {
    const idFilter = /^[0-9a-f-]{36}$/i.test(search) ? `,id.eq.${search}` : "";
    query = query.or(
      `client_name.ilike.%${search}%,process_reference.ilike.%${search}%,analyst_name.ilike.%${search}%${idFilter}`
    );
  }

  switch (filters.sort) {
    case "UPDATED_ASC":
      query = query.order("updated_at", { ascending: true });
      break;
    case "CLIENT_ASC":
      query = query.order("client_name", { ascending: true });
      break;
    case "REVIEW_DATE_DESC":
      query = query.order("review_date", { ascending: false });
      break;
    case "PROGRESS_DESC":
      query = query.order("completion_percent", { ascending: false });
      break;
    case "PROGRESS_ASC":
      query = query.order("completion_percent", { ascending: true });
      break;
    default:
      query = query.order("updated_at", { ascending: false });
  }

  const { data, count, error } = await query.range(from, to);
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as ComplianceChecklistDatabaseRow[];
  const labels = await getUserLabels(
    rows.flatMap((row) => [row.created_by, row.updated_by])
  );
  return {
    records: rows.map((row) => mapComplianceChecklistRecord(row, labels)),
    total: count ?? 0
  };
}

export async function getComplianceChecklistById(
  id: string
): Promise<ComplianceChecklistDetail> {
  const client = requireSupabase();
  const [checklistResult, itemsResult] = await Promise.all([
    client.from("compliance_checklists").select("*").eq("id", id).single(),
    client
      .from("compliance_checklist_items")
      .select("*")
      .eq("checklist_id", id)
      .order("item_order", { ascending: true })
  ]);

  if (checklistResult.error) throw new Error(checklistResult.error.message);
  if (itemsResult.error) throw new Error(itemsResult.error.message);

  const row = checklistResult.data as ComplianceChecklistDatabaseRow;
  const labels = await getUserLabels([row.created_by, row.updated_by]);
  return createComplianceChecklistDetail(
    mapComplianceChecklistRecord(row, labels),
    (itemsResult.data ?? []) as ComplianceChecklistItemDatabaseRow[]
  );
}

function itemPayload(state: ComplianceChecklistState) {
  const stateById = new Map(state.items.map((item) => [item.itemId, item]));
  return COMPLIANCE_CHECKLIST_ITEMS.map((definition) => {
    const item = stateById.get(definition.id);
    return {
      item_key: definition.id,
      item_order: definition.order,
      item_label: definition.label,
      status: item?.status ?? "PENDING",
      observation: item?.observation ?? ""
    };
  });
}

export async function createComplianceChecklist(
  state: ComplianceChecklistState,
  requestedId: string = crypto.randomUUID()
): Promise<string> {
  const client = requireSupabase();
  await authenticatedUser();
  const summary = calculateComplianceChecklistSummary(state.items);
  const { data, error } = await client.rpc(
    "create_compliance_checklist_with_items",
    {
      p_client_name: state.clientName.trim(),
      p_checklist_id: requestedId,
      p_process_reference: state.processReference.trim(),
      p_analyst_name: state.analystName.trim(),
      p_review_date: state.reviewDate,
      p_overall_status: summary.overallStatus,
      p_completion_percent: summary.completionPercent,
      p_items: itemPayload(state)
    }
  );
  if (error) throw new Error(error.message);
  if (typeof data !== "string") throw new Error("O checklist não retornou um identificador.");
  return data;
}

export async function saveComplianceChecklistItems(
  checklistId: string,
  state: ComplianceChecklistState
): Promise<void> {
  const client = requireSupabase();
  const user = await authenticatedUser();
  const rows = itemPayload(state).map((item) => ({
    checklist_id: checklistId,
    ...item,
    updated_by: user.id
  }));
  const { error } = await client
    .from("compliance_checklist_items")
    .upsert(rows, { onConflict: "checklist_id,item_key" });
  if (error) throw new Error(error.message);
}

export async function updateComplianceChecklistItem(
  checklistId: string,
  state: ComplianceChecklistState
): Promise<void> {
  await saveComplianceChecklistItems(checklistId, state);
}

export async function updateComplianceChecklist(
  checklistId: string,
  state: ComplianceChecklistState,
  expectedUpdatedAt: string
): Promise<ComplianceChecklistRecord> {
  const client = requireSupabase();
  await authenticatedUser();
  const summary = calculateComplianceChecklistSummary(state.items);
  const { data, error } = await client
    .rpc("update_compliance_checklist_with_items", {
      p_checklist_id: checklistId,
      p_expected_updated_at: expectedUpdatedAt,
      p_client_name: state.clientName.trim(),
      p_process_reference: state.processReference.trim(),
      p_analyst_name: state.analystName.trim(),
      p_review_date: state.reviewDate,
      p_overall_status: summary.overallStatus,
      p_completion_percent: summary.completionPercent,
      p_items: itemPayload(state)
    })
    .single();

  if (error?.message.includes("COMPLIANCE_CONFLICT") || error?.code === "40001") {
    throw new ComplianceChecklistConflictError();
  }
  if (error) throw new Error(error.message);
  if (!data) throw new Error("O checklist não retornou os dados atualizados.");
  const row = data as ComplianceChecklistDatabaseRow;
  const labels = await getUserLabels([row.created_by, row.updated_by]);
  return mapComplianceChecklistRecord(row, labels);
}

export async function archiveComplianceChecklist(id: string): Promise<void> {
  const client = requireSupabase();
  const user = await authenticatedUser();
  const { error } = await client
    .from("compliance_checklists")
    .update({ archived_at: new Date().toISOString(), updated_by: user.id })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function restoreComplianceChecklist(id: string): Promise<void> {
  const client = requireSupabase();
  const user = await authenticatedUser();
  const { error } = await client
    .from("compliance_checklists")
    .update({ archived_at: null, updated_by: user.id })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function duplicateComplianceChecklist(
  id: string,
  options: ComplianceChecklistDuplicateOptions
): Promise<string> {
  const detail = await getComplianceChecklistById(id);
  const blankItems = detail.state.items.map((item) => ({
    ...item,
    status: "PENDING" as const,
    observation: "",
    updatedAt: null
  }));
  return createComplianceChecklist({
    ...detail.state,
    processReference: options.clearProcessReference
      ? ""
      : detail.state.processReference,
    reviewDate: getLocalIsoDate(),
    items: options.copyItems ? detail.state.items : blankItems,
    lastUpdatedAt: null
  });
}

export async function getComplianceChecklistMetrics(): Promise<ComplianceChecklistMetrics> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("compliance_checklists")
    .select("overall_status,archived_at");
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as Array<{
    overall_status: ComplianceChecklistRecord["overallStatus"];
    archived_at: string | null;
  }>;
  const activeRows = rows.filter((row) => !row.archived_at);
  return {
    active: activeRows.length,
    inProgress: activeRows.filter((row) => row.overall_status === "IN_PROGRESS").length,
    hasIssues: activeRows.filter((row) => row.overall_status === "HAS_ISSUES").length,
    completed: activeRows.filter((row) => row.overall_status === "COMPLETED").length,
    archived: rows.length - activeRows.length
  };
}

export async function listComplianceChecklistAnalysts(): Promise<string[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("compliance_checklists")
    .select("analyst_name")
    .not("analyst_name", "is", null);
  if (error) throw new Error(error.message);
  return [
    ...new Set(
      (data ?? [])
        .map((row) => String(row.analyst_name ?? "").trim())
        .filter(Boolean)
    )
  ].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export async function importLocalComplianceChecklist(
  state: ComplianceChecklistState,
  requestedId?: string
): Promise<string> {
  return createComplianceChecklist(state, requestedId);
}
