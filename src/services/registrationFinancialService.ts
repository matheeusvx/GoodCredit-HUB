import { requireSupabase } from "../lib/supabase";
import { calculateRegistrationDashboard, calculateRegistrationFinancialMetrics } from "../lib/registration/financial/calculations";
import type {
  RegistrationFinancialCase,
  RegistrationFinancialCaseDetail,
  RegistrationFinancialCaseInput,
  RegistrationFinancialCaseWithMetrics,
  RegistrationFinancialDashboard,
  RegistrationFinancialListFilters,
  RegistrationFinancialListResult,
  RegistrationFinancialTransaction,
  RegistrationFinancialTransactionInput
} from "../types/registrationFinancial";

type CaseRow = {
  id: string; owner_id: string; client_name: string; process_reference: string | null; registry_office: string | null;
  city: string | null; operation_mode: RegistrationFinancialCase["operationMode"]; advisory_fee_expected_cents: number;
  estimated_itbi_cents: number; estimated_registry_cents: number; estimated_other_costs_cents: number; notes: string | null;
  financial_finalized_at: string | null; opened_at: string; archived_at: string | null; created_at: string; updated_at: string;
};

type TransactionRow = {
  id: string; case_id: string; owner_id: string; transaction_type: RegistrationFinancialTransaction["transactionType"];
  category: string | null; transaction_date: string; amount_cents: number; advisory_allocation_cents: number; cost_allocation_cents: number;
  customer_interest_cents: number; customer_total_paid_cents: number; adjustment_direction: RegistrationFinancialTransaction["adjustmentDirection"];
  payment_method: string | null; installments: number | null; installment_amount_cents: number | null; card_brand: string | null;
  beneficiary: string | null; reference_number: string | null; description: string | null; notes: string | null; created_at: string; updated_at: string;
};

function mapCase(row: CaseRow): RegistrationFinancialCase {
  return {
    id: row.id, ownerId: row.owner_id, clientName: row.client_name, processReference: row.process_reference ?? "",
    registryOffice: row.registry_office ?? "", city: row.city ?? "", operationMode: row.operation_mode,
    advisoryFeeExpectedCents: Number(row.advisory_fee_expected_cents), estimatedItbiCents: Number(row.estimated_itbi_cents),
    estimatedRegistryCents: Number(row.estimated_registry_cents), estimatedOtherCostsCents: Number(row.estimated_other_costs_cents), notes: row.notes ?? "",
    financialFinalizedAt: row.financial_finalized_at, openedAt: row.opened_at, archivedAt: row.archived_at, createdAt: row.created_at, updatedAt: row.updated_at
  };
}

function mapTransaction(row: TransactionRow): RegistrationFinancialTransaction {
  return {
    id: row.id, caseId: row.case_id, ownerId: row.owner_id, transactionType: row.transaction_type, category: row.category ?? "",
    transactionDate: row.transaction_date, amountCents: Number(row.amount_cents), advisoryAllocationCents: Number(row.advisory_allocation_cents),
    costAllocationCents: Number(row.cost_allocation_cents), customerInterestCents: Number(row.customer_interest_cents),
    customerTotalPaidCents: Number(row.customer_total_paid_cents), adjustmentDirection: row.adjustment_direction, paymentMethod: row.payment_method ?? "",
    installments: row.installments, installmentAmountCents: row.installment_amount_cents === null ? null : Number(row.installment_amount_cents),
    cardBrand: row.card_brand ?? "", beneficiary: row.beneficiary ?? "", referenceNumber: row.reference_number ?? "", description: row.description ?? "",
    notes: row.notes ?? "", createdAt: row.created_at, updatedAt: row.updated_at
  };
}

async function getAuthenticatedUserId(): Promise<string> {
  const client = requireSupabase();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) throw new Error("Sua sessão expirou. Entre novamente para continuar.");
  return user.id;
}

function casePayload(input: RegistrationFinancialCaseInput) {
  return {
    client_name: input.clientName.trim(), process_reference: input.processReference.trim() || null, registry_office: input.registryOffice.trim() || null,
    city: input.city.trim() || null, operation_mode: input.operationMode, advisory_fee_expected_cents: input.advisoryFeeExpectedCents,
    estimated_itbi_cents: input.estimatedItbiCents, estimated_registry_cents: input.estimatedRegistryCents,
    estimated_other_costs_cents: input.estimatedOtherCostsCents, notes: input.notes.trim() || null, opened_at: input.openedAt
  };
}

function transactionPayload(input: RegistrationFinancialTransactionInput) {
  return {
    transaction_type: input.transactionType, category: input.category.trim() || null, transaction_date: input.transactionDate,
    amount_cents: input.amountCents, advisory_allocation_cents: input.advisoryAllocationCents, cost_allocation_cents: input.costAllocationCents,
    customer_interest_cents: input.customerInterestCents, customer_total_paid_cents: input.customerTotalPaidCents,
    adjustment_direction: input.adjustmentDirection, payment_method: input.paymentMethod.trim() || null, installments: input.installments,
    installment_amount_cents: input.installmentAmountCents, card_brand: input.cardBrand.trim() || null, beneficiary: input.beneficiary.trim() || null,
    reference_number: input.referenceNumber.trim() || null, description: input.description.trim() || null, notes: input.notes.trim() || null
  };
}

async function transactionsForCases(caseIds: string[]): Promise<Map<string, RegistrationFinancialTransaction[]>> {
  const grouped = new Map<string, RegistrationFinancialTransaction[]>();
  if (caseIds.length === 0) return grouped;
  const client = requireSupabase();
  const { data, error } = await client.from("registration_financial_transactions").select("*").in("case_id", caseIds).order("transaction_date", { ascending: false });
  if (error) throw new Error("Não foi possível carregar os lançamentos financeiros.");
  for (const row of (data ?? []) as TransactionRow[]) {
    const item = mapTransaction(row);
    grouped.set(item.caseId, [...(grouped.get(item.caseId) ?? []), item]);
  }
  return grouped;
}

export async function listMyFinancialCases(filters: RegistrationFinancialListFilters): Promise<RegistrationFinancialListResult> {
  const client = requireSupabase();
  const ownerId = await getAuthenticatedUserId();
  const from = (filters.page - 1) * filters.pageSize;
  let query = client.from("registration_financial_cases").select("*", { count: "exact" }).eq("owner_id", ownerId);
  if (filters.archive === "ACTIVE") query = query.is("archived_at", null);
  if (filters.archive === "ARCHIVED") query = query.not("archived_at", "is", null);
  if (filters.operationMode !== "ALL") query = query.eq("operation_mode", filters.operationMode);
  const search = filters.search.replace(/[%_(),]/g, " ").replace(/\s+/g, " ").trim();
  if (search) query = query.or(`client_name.ilike.%${search}%,process_reference.ilike.%${search}%,registry_office.ilike.%${search}%,city.ilike.%${search}%`);
  if (filters.sort === "UPDATED_ASC") query = query.order("updated_at", { ascending: true });
  else if (filters.sort === "CLIENT_ASC") query = query.order("client_name", { ascending: true });
  else if (filters.sort === "OPENED_DESC") query = query.order("opened_at", { ascending: false });
  else query = query.order("updated_at", { ascending: false });
  const paginatedQuery = filters.status === "ALL" ? query.range(from, from + filters.pageSize - 1) : query;
  const { data, count, error } = await paginatedQuery;
  if (error) throw new Error("Não foi possível carregar os balancetes.");
  const cases = ((data ?? []) as CaseRow[]).map(mapCase);
  const grouped = await transactionsForCases(cases.map((item) => item.id));
  const records = cases.map((financialCase) => ({ financialCase, metrics: calculateRegistrationFinancialMetrics(financialCase, grouped.get(financialCase.id) ?? []) }));
  const filtered = filters.status === "ALL" ? records : records.filter((record) => record.metrics.status === filters.status);
  if (filters.status === "ALL") return { records: filtered, total: count ?? 0 };
  return { records: filtered.slice(from, from + filters.pageSize), total: filtered.length };
}

export async function listMyFinancialCasesForExport(filters: RegistrationFinancialListFilters): Promise<RegistrationFinancialCaseWithMetrics[]> {
  const client = requireSupabase();
  const ownerId = await getAuthenticatedUserId();
  let query = client.from("registration_financial_cases").select("*").eq("owner_id", ownerId);
  if (filters.archive === "ACTIVE") query = query.is("archived_at", null);
  if (filters.archive === "ARCHIVED") query = query.not("archived_at", "is", null);
  if (filters.operationMode !== "ALL") query = query.eq("operation_mode", filters.operationMode);
  const search = filters.search.replace(/[%_(),]/g, " ").replace(/\s+/g, " ").trim();
  if (search) query = query.or(`client_name.ilike.%${search}%,process_reference.ilike.%${search}%,registry_office.ilike.%${search}%,city.ilike.%${search}%`);
  if (filters.sort === "UPDATED_ASC") query = query.order("updated_at", { ascending: true });
  else if (filters.sort === "CLIENT_ASC") query = query.order("client_name", { ascending: true });
  else if (filters.sort === "OPENED_DESC") query = query.order("opened_at", { ascending: false });
  else query = query.order("updated_at", { ascending: false });
  const { data, error } = await query;
  if (error) throw new Error("Não foi possível preparar a exportação.");
  const cases = ((data ?? []) as CaseRow[]).map(mapCase);
  const grouped = await transactionsForCases(cases.map((item) => item.id));
  const records = cases.map((financialCase) => ({ financialCase, metrics: calculateRegistrationFinancialMetrics(financialCase, grouped.get(financialCase.id) ?? []) }));
  return filters.status === "ALL" ? records : records.filter((record) => record.metrics.status === filters.status);
}

export async function getMyFinancialDashboard(): Promise<RegistrationFinancialDashboard> {
  const client = requireSupabase();
  const ownerId = await getAuthenticatedUserId();
  const { data, error } = await client.from("registration_financial_cases").select("*").eq("owner_id", ownerId).is("archived_at", null);
  if (error) throw new Error("Não foi possível carregar o resumo financeiro.");
  const cases = ((data ?? []) as CaseRow[]).map(mapCase);
  const grouped = await transactionsForCases(cases.map((item) => item.id));
  return calculateRegistrationDashboard(cases.map((financialCase) => ({ financialCase, metrics: calculateRegistrationFinancialMetrics(financialCase, grouped.get(financialCase.id) ?? []) })));
}

export async function getMyFinancialCaseById(id: string): Promise<RegistrationFinancialCaseDetail> {
  const client = requireSupabase();
  const ownerId = await getAuthenticatedUserId();
  const { data, error } = await client.from("registration_financial_cases").select("*").eq("id", id).eq("owner_id", ownerId).maybeSingle();
  if (error || !data) throw new Error("Balancete não encontrado ou indisponível para esta conta.");
  const financialCase = mapCase(data as CaseRow);
  const transactions = await listFinancialTransactions(id);
  return { financialCase, transactions, metrics: calculateRegistrationFinancialMetrics(financialCase, transactions) };
}

export async function createFinancialCase(input: RegistrationFinancialCaseInput): Promise<string> {
  const client = requireSupabase();
  const ownerId = await getAuthenticatedUserId();
  const { data, error } = await client.from("registration_financial_cases").insert({ ...casePayload(input), owner_id: ownerId }).select("id").single();
  if (error || !data) throw new Error("Não foi possível criar o balancete.");
  return String(data.id);
}

export async function updateFinancialCase(id: string, input: RegistrationFinancialCaseInput): Promise<void> {
  const client = requireSupabase();
  const ownerId = await getAuthenticatedUserId();
  const { error } = await client.from("registration_financial_cases").update(casePayload(input)).eq("id", id).eq("owner_id", ownerId);
  if (error) throw new Error("Não foi possível salvar o balancete.");
}

async function updateCaseTimestamp(id: string, values: { archived_at?: string | null; financial_finalized_at?: string | null }) {
  const client = requireSupabase();
  const ownerId = await getAuthenticatedUserId();
  const { error } = await client.from("registration_financial_cases").update(values).eq("id", id).eq("owner_id", ownerId);
  if (error) throw new Error("Não foi possível atualizar o balancete.");
}

export const archiveFinancialCase = (id: string) => updateCaseTimestamp(id, { archived_at: new Date().toISOString() });
export const restoreFinancialCase = (id: string) => updateCaseTimestamp(id, { archived_at: null });
export const finalizeFinancialCase = (id: string) => updateCaseTimestamp(id, { financial_finalized_at: new Date().toISOString() });
export const reopenFinancialCase = (id: string) => updateCaseTimestamp(id, { financial_finalized_at: null });

export async function listFinancialTransactions(caseId: string): Promise<RegistrationFinancialTransaction[]> {
  const client = requireSupabase();
  const ownerId = await getAuthenticatedUserId();
  const { data, error } = await client.from("registration_financial_transactions").select("*").eq("case_id", caseId).eq("owner_id", ownerId).order("transaction_date", { ascending: false }).order("created_at", { ascending: false });
  if (error) throw new Error("Não foi possível carregar os lançamentos financeiros.");
  return ((data ?? []) as TransactionRow[]).map(mapTransaction);
}

export async function createFinancialTransaction(caseId: string, input: RegistrationFinancialTransactionInput): Promise<void> {
  const client = requireSupabase();
  const ownerId = await getAuthenticatedUserId();
  const { error } = await client.from("registration_financial_transactions").insert({ case_id: caseId, owner_id: ownerId, ...transactionPayload(input) });
  if (error) throw new Error("Não foi possível registrar o lançamento. Verifique os valores e o estado do balancete.");
}

export async function updateFinancialTransaction(id: string, input: RegistrationFinancialTransactionInput): Promise<void> {
  const client = requireSupabase();
  const ownerId = await getAuthenticatedUserId();
  const { error } = await client.from("registration_financial_transactions").update(transactionPayload(input)).eq("id", id).eq("owner_id", ownerId);
  if (error) throw new Error("Não foi possível atualizar o lançamento.");
}
