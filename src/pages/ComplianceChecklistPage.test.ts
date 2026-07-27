import { describe, expect, it } from "vitest";
import { getComplianceChecklistRouteState } from "./ComplianceChecklistPage";

describe("getComplianceChecklistRouteState", () => {
  it("resolve a lista principal", () => {
    expect(getComplianceChecklistRouteState("/checklist-conformidade")).toEqual({
      type: "LIST",
      id: null
    });
  });

  it("resolve a criação de um checklist", () => {
    expect(
      getComplianceChecklistRouteState("/checklist-conformidade/novo")
    ).toEqual({
      type: "NEW",
      id: null
    });
  });

  it("resolve a edição por identificador", () => {
    expect(
      getComplianceChecklistRouteState(
        "/checklist-conformidade/204c98a5-6e4f-4b6c-920e-b443e18f6d5f"
      )
    ).toEqual({
      type: "EDIT",
      id: "204c98a5-6e4f-4b6c-920e-b443e18f6d5f"
    });
  });
});
