const CONNECTION_ERROR_PATTERN =
  /failed to fetch|network|connection|timeout|fetch failed|load failed/i;

export function getSignInErrorMessage(error: string): string {
  if (CONNECTION_ERROR_PATTERN.test(error)) {
    return "Não foi possível conectar ao serviço de autenticação. Tente novamente.";
  }
  return "Não foi possível entrar. Confira o e-mail e a senha.";
}

export function getPasswordResetErrorMessage(error: string): string {
  if (CONNECTION_ERROR_PATTERN.test(error)) {
    return "Não foi possível conectar ao serviço de autenticação. Tente novamente.";
  }
  return "Não foi possível solicitar a recuperação de senha.";
}

