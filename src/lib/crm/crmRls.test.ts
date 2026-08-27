import { describe, expect, it } from "vitest";
import migrationSql from "../../../supabase/migrations/202608250001_create_bless_crm_integration.sql?raw";

const normalized = migrationSql.toLowerCase().replace(/\s+/g, " ");

describe("segurança estrutural das tabelas CRM", () => {
  it("habilita RLS em todas as tabelas internas e remove acesso do navegador", () => {
    const tables = [
      "crm_user_mappings",
      "crm_sessions",
      "crm_assignment_events",
      "crm_message_activity",
      "crm_response_events",
      "crm_sync_state",
    ];
    tables.forEach((table) => {
      expect(normalized).toContain(`alter table public.${table} enable row level security`);
      expect(normalized).toContain(`revoke all on table public.${table} from anon, authenticated`);
    });
    expect(normalized).not.toContain("auth.uid() is not null");
    expect(normalized).not.toContain("create policy");
  });

  it("impede persistir o UUID excluído como agente válido", () => {
    expect(migrationSql.match(/74c069d0-2286-427b-a3a0-dbf89e228984/g)?.length).toBeGreaterThanOrEqual(4);
    expect(normalized).toContain("actor_type = 'agent' and bless_user_id is not null");
    expect(normalized).toContain("actor_type <> 'agent' and bless_user_id is null");
  });

  it("possui chaves idempotentes e lock atômico de sincronização", () => {
    expect(normalized).toContain("event_key text not null unique");
    expect(normalized).toContain("constraint crm_response_events_unique_wait unique (session_id, wait_started_at)");
    expect(normalized).toContain("create or replace function public.crm_try_start_sync");
    expect(normalized).toContain("on conflict (event_key) do nothing");
  });
});
