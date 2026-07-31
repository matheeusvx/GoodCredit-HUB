import { describe, expect, it } from "vitest";
import migrationSql from "../../../../supabase/migrations/202607310001_create_registration_financial_cases.sql?raw";

describe("segurança do Balancete Cartorial", () => {
  it("habilita RLS e restringe casos ao proprietário autenticado", () => {
    expect(migrationSql).toContain("alter table public.registration_financial_cases enable row level security");
    expect(migrationSql).toContain("owner_id = auth.uid()");
    expect(migrationSql).toContain("revoke all on table public.registration_financial_cases from anon");
  });
  it("valida que o lançamento pertence a um caso do mesmo usuário", () => {
    expect(migrationSql).toContain("exists (select 1 from public.registration_financial_cases c where c.id = case_id and c.owner_id = auth.uid())");
  });
  it("não oferece exclusão física ao front-end", () => {
    expect(migrationSql.toLowerCase()).not.toMatch(/for\s+delete/);
    expect(migrationSql).not.toContain("grant delete");
  });
  it("bloqueia lançamentos em casos arquivados ou finalizados", () => {
    expect(migrationSql).toContain("Archived financial case cannot receive transactions");
    expect(migrationSql).toContain("Finalized financial case cannot receive transactions");
  });
});
