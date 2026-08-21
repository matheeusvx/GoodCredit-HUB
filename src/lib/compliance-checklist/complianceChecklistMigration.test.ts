import { describe, expect, it } from "vitest";
import {
  COMPLIANCE_CHECKLIST_MIGRATION_COMPLETED_KEY,
  COMPLIANCE_CHECKLIST_STORAGE_KEY,
  COMPLIANCE_CHECKLIST_TEMPORARY_DRAFT_KEY,
  createInitialComplianceChecklistState,
  getComplianceChecklistTemporaryDraftKey,
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

    expect(readLegacyComplianceChecklist(storage, "user-a")?.clientName).toBe(
      "Cliente de teste"
    );
    markLegacyComplianceChecklistMigrated(storage, "user-a");
    expect(
      storage.getItem(`${COMPLIANCE_CHECKLIST_MIGRATION_COMPLETED_KEY}:user-a`)
    ).toBe("true");
    expect(readLegacyComplianceChecklist(storage, "user-a")).toBeNull();
    expect(readLegacyComplianceChecklist(storage, "user-b")).toBeNull();
  });

  it("mantém rascunho temporário com vínculo e versão", () => {
    const storage = createMemoryStorage();
    const state = createInitialComplianceChecklistState("2026-07-27");
    state.clientName = "Rascunho";
    saveTemporaryComplianceChecklistDraft(
      storage,
      state,
      "checklist-id",
      "2026-07-27T12:00:00.000Z",
      null,
      "user-a"
    );

    expect(
      storage.values.has(getComplianceChecklistTemporaryDraftKey("user-a"))
    ).toBe(true);
    expect(storage.values.has(COMPLIANCE_CHECKLIST_TEMPORARY_DRAFT_KEY)).toBe(false);
    expect(readTemporaryComplianceChecklistDraft(storage, "user-a")).toMatchObject({
      checklistId: "checklist-id",
      pendingCreationId: null,
      expectedUpdatedAt: "2026-07-27T12:00:00.000Z",
      state: { clientName: "Rascunho" }
    });
    expect(readTemporaryComplianceChecklistDraft(storage, "user-b")).toBeNull();
  });

  it("vincula um rascunho antigo sem escopo ao primeiro usuário que o recupera", () => {
    const storage = createMemoryStorage();
    const state = createInitialComplianceChecklistState("2026-07-27");
    state.clientName = "Rascunho legado";
    storage.setItem(
      COMPLIANCE_CHECKLIST_TEMPORARY_DRAFT_KEY,
      JSON.stringify({
        version: 2,
        checklistId: null,
        pendingCreationId: "creation-id",
        expectedUpdatedAt: null,
        state,
        savedAt: "2026-07-27T12:00:00.000Z"
      })
    );

    expect(readTemporaryComplianceChecklistDraft(storage, "user-a")?.state.clientName)
      .toBe("Rascunho legado");
    expect(readTemporaryComplianceChecklistDraft(storage, "user-b")).toBeNull();
  });
});
