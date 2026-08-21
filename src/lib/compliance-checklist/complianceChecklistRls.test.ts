import { describe, expect, it } from "vitest";
import migrationSql from "../../../supabase/migrations/202608210001_restrict_compliance_checklists_by_owner.sql?raw";
import serviceSource from "../../services/complianceChecklistService.ts?raw";

const normalizedSql = migrationSql.replace(/\s+/g, " ").toLowerCase();

describe("isolamento por proprietário do Checklist de Conformidade", () => {
  it("mantém RLS habilitado e anon sem privilégios", () => {
    expect(normalizedSql).toContain(
      "alter table public.compliance_checklists enable row level security"
    );
    expect(normalizedSql).toContain(
      "alter table public.compliance_checklist_items enable row level security"
    );
    expect(normalizedSql).toContain(
      "revoke all on table public.compliance_checklists from anon"
    );
    expect(normalizedSql).toContain(
      "revoke all on table public.compliance_checklist_items from anon"
    );
  });

  it("restringe SELECT, INSERT e UPDATE do checklist ao created_by", () => {
    expect(normalizedSql).toMatch(
      /for select to authenticated using \(created_by = auth\.uid\(\)\)/
    );
    expect(normalizedSql).toMatch(
      /for insert to authenticated with check \( created_by = auth\.uid\(\) and updated_by = auth\.uid\(\) \)/
    );
    expect(normalizedSql).toMatch(
      /for update to authenticated using \(created_by = auth\.uid\(\)\) with check \( created_by = auth\.uid\(\) and updated_by = auth\.uid\(\) \)/
    );
  });

  it("deriva a autorização dos itens do proprietário do checklist pai", () => {
    const ownershipCheck =
      /checklist\.id = compliance_checklist_items\.checklist_id and checklist\.created_by = auth\.uid\(\)/g;
    expect(normalizedSql.match(ownershipCheck)).toHaveLength(4);
    expect(normalizedSql.match(/updated_by = auth\.uid\(\)/g)?.length).toBeGreaterThanOrEqual(4);
  });

  it("protege a RPC de atualização e preserva security invoker", () => {
    expect(normalizedSql).toContain(
      "where id = p_checklist_id and created_by = v_user_id and updated_at = p_expected_updated_at"
    );
    expect(normalizedSql).toContain(
      "where checklist.id = p_checklist_id and checklist.created_by = v_user_id"
    );
    expect(normalizedSql.match(/security invoker/g)).toHaveLength(2);
    expect(normalizedSql).toContain(
      "where users.id = v_user_id and users.id = any(p_user_ids)"
    );
  });

  it("não concede exclusão física nem cria política DELETE", () => {
    expect(normalizedSql).not.toMatch(/for delete/);
    expect(normalizedSql).toContain(
      "revoke delete on table public.compliance_checklists from authenticated"
    );
    expect(normalizedSql).toContain(
      "revoke delete on table public.compliance_checklist_items from authenticated"
    );
  });

  it("adiciona created_by às leituras e mutações do frontend", () => {
    expect(serviceSource.match(/\.eq\("created_by", (?:user\.id|userId)\)/g)?.length)
      .toBeGreaterThanOrEqual(7);
    expect(serviceSource).toContain(
      "Checklist não encontrado ou indisponível para esta conta."
    );
  });
});
