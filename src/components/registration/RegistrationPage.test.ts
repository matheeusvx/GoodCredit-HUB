import { describe, expect, it } from "vitest";
import { getRegistrationRouteState } from "./RegistrationPage";

describe("rotas do Balancete Cartorial", () => {
  it("reconhece listagem, criação e detalhe", () => {
    expect(getRegistrationRouteState("/registro").type).toBe("TOOLS");
    expect(getRegistrationRouteState("/registro/balancete/novo").type).toBe("NEW_BALANCE");
    expect(getRegistrationRouteState("/registro/balancete/abc")).toEqual({ type: "EDIT_BALANCE", id: "abc" });
  });
});
