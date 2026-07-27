import { describe, expect, it } from "vitest";
import migrationSql from "../../../supabase/migrations/202607270001_create_compliance_checklists.sql?raw";

describe("políticas do Checklist de Conformidade", () => {
  it("habilita RLS nas duas tabelas", () => {
    expect(migrationSql).toContain(
      "alter table public.compliance_checklists enable row level security"
    );
    expect(migrationSql).toContain(
      "alter table public.compliance_checklist_items enable row level security"
    );
  });

  it("restringe operações ao papel autenticado", () => {
    expect(migrationSql).toContain("to authenticated");
    expect(migrationSql).toContain(
      "revoke all on table public.compliance_checklists from anon"
    );
    expect(migrationSql).toContain(
      "revoke all on table public.compliance_checklist_items from anon"
    );
  });

  it("não cria política de exclusão definitiva", () => {
    expect(migrationSql.toLowerCase()).not.toMatch(/for\s+delete/);
  });
});
