import { describe, expect, it } from "vitest";
import {
  COMPLIANCE_CHECKLIST_MIGRATION_COMPLETED_KEY,
  COMPLIANCE_CHECKLIST_STORAGE_KEY,
  COMPLIANCE_CHECKLIST_TEMPORARY_DRAFT_KEY,
  createInitialComplianceChecklistState,
  markLegacyComplianceChecklistMigrated,
  readLegacyComplianceChecklist,
  readTemporaryComplianceChecklistDraft,
  saveTemporaryComplianceChecklistDraft
} from "./complianceChecklistStorage";

function createMemoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    values
  };
}

describe("migração do checklist local", () => {
  it("identifica estado antigo preenchido e não o importa novamente", () => {
    const storage = createMemoryStorage();
    const state = createInitialComplianceChecklistState("2026-07-27");
    state.clientName = "Cliente de teste";
    storage.setItem(
      COMPLIANCE_CHECKLIST_STORAGE_KEY,
      JSON.stringify({ version: 1, state })
    );

    expect(readLegacyComplianceChecklist(storage)?.clientName).toBe(
      "Cliente de teste"
    );
    markLegacyComplianceChecklistMigrated(storage);
    expect(storage.getItem(COMPLIANCE_CHECKLIST_MIGRATION_COMPLETED_KEY)).toBe(
      "true"
    );
    expect(readLegacyComplianceChecklist(storage)).toBeNull();
  });

  it("mantém rascunho temporário com vínculo e versão", () => {
    const storage = createMemoryStorage();
    const state = createInitialComplianceChecklistState("2026-07-27");
    state.clientName = "Rascunho";
    saveTemporaryComplianceChecklistDraft(
      storage,
      state,
      "checklist-id",
      "2026-07-27T12:00:00.000Z"
    );

    expect(storage.values.has(COMPLIANCE_CHECKLIST_TEMPORARY_DRAFT_KEY)).toBe(true);
    expect(readTemporaryComplianceChecklistDraft(storage)).toMatchObject({
      checklistId: "checklist-id",
      pendingCreationId: null,
      expectedUpdatedAt: "2026-07-27T12:00:00.000Z",
      state: { clientName: "Rascunho" }
    });
  });
});
