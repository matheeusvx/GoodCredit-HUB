import { requireSupabase } from "../lib/supabase";
import type { ProductivitySource } from "../lib/home/productivity";
import { listMyFinancialWorkspaceData } from "./registrationFinancialService";

interface ChecklistRow {
  overall_status: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

/** Everything the Início dashboard needs, for the signed-in account only. */
export async function getProductivitySource(): Promise<ProductivitySource> {
  const client = requireSupabase();
  const {
    data: { user }
  } = await client.auth.getUser();
  if (!user) throw new Error("Sessão expirada. Entre novamente.");

  const [checklistResult, workspace] = await Promise.all([
    client
      .from("compliance_checklists")
      .select("overall_status, created_at, updated_at, archived_at")
      .eq("created_by", user.id),
    listMyFinancialWorkspaceData()
  ]);
  if (checklistResult.error) throw new Error("Não foi possível carregar os checklists.");

  return {
    checklists: ((checklistResult.data ?? []) as ChecklistRow[]).map((row) => ({
      status: row.overall_status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      archivedAt: row.archived_at
    })),
    registros: workspace.records.map(({ financialCase, metrics }) => ({
      status: metrics.status,
      openedAt: financialCase.openedAt,
      createdAt: financialCase.createdAt,
      finalizedAt: financialCase.financialFinalizedAt,
      archivedAt: financialCase.archivedAt
    })),
    transactions: workspace.transactions.map((transaction) => ({ createdAt: transaction.createdAt }))
  };
}
