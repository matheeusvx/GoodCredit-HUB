import { describe, expect, it } from "vitest";
import {
  COMPLIANCE_CHECKLIST_STORAGE_KEY,
  createInitialComplianceChecklistState,
  createNewComplianceChecklist,
  normalizeComplianceChecklistState,
  readComplianceChecklistState,
  resetComplianceChecklistItems,
  saveComplianceChecklistState
} from "./complianceChecklistStorage";

describe("complianceChecklistStorage", () => {
  it("cria 15 itens pendentes e a data informada", () => {
    const state = createInitialComplianceChecklistState("2026-07-24");
    expect(state.items).toHaveLength(15);
    expect(state.items.every((item) => item.status === "PENDING")).toBe(true);
    expect(state.reviewDate).toBe("2026-07-24");
  });

  it("restaura estados e observações sem perder itens novos", () => {
    const state = normalizeComplianceChecklistState(
      {
        clientName: "Cliente exemplo",
        reviewDate: "2026-07-24",
        items: [
          {
            itemId: "update-pf3",
            status: "HAS_ISSUE",
            observation: "Revisar cadastro",
            updatedAt: "2026-07-24T10:00:00.000Z"
          }
        ]
      },
      "2026-07-24"
    );

    expect(state.items).toHaveLength(15);
    expect(state.items.find((item) => item.itemId === "update-pf3")).toMatchObject({
      status: "HAS_ISSUE",
      observation: "Revisar cadastro"
    });
  });

  it("salva e lê o checklist atual", () => {
    const memory = new Map<string, string>();
    const storage = {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => memory.set(key, value)
    };
    const state = createInitialComplianceChecklistState("2026-07-24");
    state.clientName = "Cliente exemplo";
    state.items[0] = {
      ...state.items[0],
      status: "COMPLIANT",
      observation: "Conferido"
    };

    saveComplianceChecklistState(storage, state);
    const restored = readComplianceChecklistState(storage);

    expect(memory.has(COMPLIANCE_CHECKLIST_STORAGE_KEY)).toBe(true);
    expect(restored.clientName).toBe("Cliente exemplo");
    expect(restored.items[0].status).toBe("COMPLIANT");
    expect(restored.items[0].observation).toBe("Conferido");
  });

  it("limpa somente as verificações sem apagar a identificação", () => {
    const state = createInitialComplianceChecklistState("2026-07-24");
    state.clientName = "Cliente exemplo";
    state.items[0].status = "COMPLIANT";
    const reset = resetComplianceChecklistItems(state, "2026-07-24T12:00:00.000Z");

    expect(reset.clientName).toBe("Cliente exemplo");
    expect(reset.items.every((item) => item.status === "PENDING")).toBe(true);
  });

  it("inicia um novo checklist sem identificação", () => {
    const state = createNewComplianceChecklist("2026-07-25");
    expect(state.clientName).toBe("");
    expect(state.processReference).toBe("");
    expect(state.analystName).toBe("");
    expect(state.reviewDate).toBe("2026-07-25");
  });
});
