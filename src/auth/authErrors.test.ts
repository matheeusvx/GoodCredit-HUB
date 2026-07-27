import { describe, expect, it } from "vitest";
import {
  getPasswordResetErrorMessage,
  getSignInErrorMessage
} from "./authErrors";

describe("mensagens públicas de autenticação", () => {
  it("não expõe o erro bruto de credenciais", () => {
    expect(getSignInErrorMessage("Invalid login credentials")).toBe(
      "Não foi possível entrar. Confira o e-mail e a senha."
    );
  });

  it("identifica falha de conexão", () => {
    expect(getSignInErrorMessage("TypeError: Failed to fetch")).toBe(
      "Não foi possível conectar ao serviço de autenticação. Tente novamente."
    );
    expect(getPasswordResetErrorMessage("Network error")).toBe(
      "Não foi possível conectar ao serviço de autenticação. Tente novamente."
    );
  });
});

