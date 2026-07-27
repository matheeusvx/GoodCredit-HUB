import { describe, expect, it } from "vitest";
import { COMPLIANCE_CHECKLIST_ITEMS } from "../../data/complianceChecklistItems";
import {
  createComplianceChecklistDetail,
  mapComplianceChecklistRecord
} from "./complianceChecklistMapper";

describe("complianceChecklistMapper", () => {
  it("mapeia registros do banco para o modelo de interface", () => {
    const record = mapComplianceChecklistRecord(
      {
        id: "00000000-0000-0000-0000-000000000001",
        client_name: "Cliente Teste",
        process_reference: "PROC-1",
        analyst_name: "Ana",
        review_date: "2026-07-27",
        overall_status: "IN_PROGRESS",
        completion_percent: "40",
        created_by: "user-created",
        updated_by: "user-updated",
        created_at: "2026-07-27T10:00:00.000Z",
        updated_at: "2026-07-27T11:00:00.000Z",
        archived_at: null
      },
      new Map([
        ["user-created", "criador@goodcredit.com"],
        ["user-updated", "editor@goodcredit.com"]
      ])
    );

    expect(record).toMatchObject({
      clientName: "Cliente Teste",
      completionPercent: 40,
      createdByLabel: "criador@goodcredit.com",
      updatedByLabel: "editor@goodcredit.com"
    });
  });

  it("reconstrói sempre os 15 itens na ordem oficial", () => {
    const record = mapComplianceChecklistRecord({
      id: "00000000-0000-0000-0000-000000000001",
      client_name: "Cliente Teste",
      process_reference: null,
      analyst_name: null,
      review_date: "2026-07-27",
      overall_status: "HAS_ISSUES",
      completion_percent: 10,
      created_by: "user",
      updated_by: "user",
      created_at: "2026-07-27T10:00:00.000Z",
      updated_at: "2026-07-27T11:00:00.000Z",
      archived_at: null
    });
    const detail = createComplianceChecklistDetail(record, [
      {
        id: "item-1",
        checklist_id: record.id,
        item_key: COMPLIANCE_CHECKLIST_ITEMS[1].id,
        item_order: 2,
        item_label: COMPLIANCE_CHECKLIST_ITEMS[1].label,
        status: "HAS_ISSUE",
        observation: "Revisar",
        updated_by: "user",
        created_at: "2026-07-27T10:00:00.000Z",
        updated_at: "2026-07-27T11:00:00.000Z"
      }
    ]);

    expect(detail.state.items).toHaveLength(15);
    expect(detail.state.items.map((item) => item.itemId)).toEqual(
      COMPLIANCE_CHECKLIST_ITEMS.map((item) => item.id)
    );
    expect(detail.state.items[1]).toMatchObject({
      status: "HAS_ISSUE",
      observation: "Revisar"
    });
  });
});
