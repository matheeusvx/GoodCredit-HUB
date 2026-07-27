import { KeyRound, LoaderCircle, LockKeyhole, Mail } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

function safeReturnPath(): string {
  const value = new URLSearchParams(window.location.search).get("returnTo");
  return value?.startsWith("/checklist-conformidade")
    ? value
    : "/checklist-conformidade";
}

function navigate(path: string) {
  window.history.replaceState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function LoginPage() {
  const {
    configured,
    passwordRecovery,
    signIn,
    requestPasswordReset,
    updatePassword
  } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const error = await signIn(email.trim(), password);
    setLoading(false);
    if (error) {
      setIsError(true);
      setMessage("Não foi possível entrar. Confira o e-mail e a senha.");
      return;
    }
    navigate(safeReturnPath());
  }

  async function handlePasswordReset() {
    if (!email.trim()) {
      setIsError(true);
      setMessage("Informe o e-mail para solicitar a recuperação de senha.");
      return;
    }
    setLoading(true);
    const error = await requestPasswordReset(email.trim());
    setLoading(false);
    setIsError(Boolean(error));
    setMessage(
      error
        ? "Não foi possível solicitar a recuperação de senha."
        : "Enviamos as instruções de recuperação para o e-mail informado."
    );
  }

  async function handlePasswordUpdate(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 8) {
      setIsError(true);
      setMessage("A nova senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== passwordConfirmation) {
      setIsError(true);
      setMessage("A confirmação da senha não corresponde à nova senha.");
      return;
    }

    setLoading(true);
    setMessage("");
    const error = await updatePassword(password);
    setLoading(false);
    if (error) {
      setIsError(true);
      setMessage("Não foi possível atualizar a senha. Solicite um novo link.");
      return;
    }
    navigate(safeReturnPath());
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-panel sm:p-8">
        <img
          src="/logo-goodcredit-hub.png"
          alt="GoodCredit Hub"
          className="mx-auto h-auto w-44 object-contain"
        />
        <div className="mt-7 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg bg-goodgreen-50 text-goodgreen-700">
            <LockKeyhole className="h-5 w-5" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-slate-950">Acesso interno</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Entre para acessar os Checklists de Conformidade da GoodCredit.
          </p>
        </div>

        {!configured ? (
          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            O Supabase ainda não está configurado neste ambiente. Defina as variáveis
            <strong> VITE_SUPABASE_URL</strong> e
            <strong> VITE_SUPABASE_ANON_KEY</strong>.
          </div>
        ) : passwordRecovery ? (
          <form className="mt-7 space-y-4" onSubmit={handlePasswordUpdate}>
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Nova senha</span>
              <span className="relative mt-2 block">
                <KeyRound className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-goodgreen-500 focus:ring-4 focus:ring-goodgreen-500/10"
                />
              </span>
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">
                Confirmar nova senha
              </span>
              <span className="relative mt-2 block">
                <KeyRound className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={passwordConfirmation}
                  onChange={(event) => setPasswordConfirmation(event.target.value)}
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-goodgreen-500 focus:ring-4 focus:ring-goodgreen-500/10"
                />
              </span>
            </label>

            <div aria-live="polite">
              {message && (
                <p
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    isError
                      ? "border-rose-200 bg-rose-50 text-rose-800"
                      : "border-goodgreen-200 bg-goodgreen-50 text-goodgreen-800"
                  }`}
                >
                  {message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-goodgreen-600 px-4 text-sm font-bold text-white transition hover:bg-goodgreen-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goodgreen-400 focus-visible:ring-offset-2 disabled:opacity-60"
            >
              {loading && <LoaderCircle className="h-4 w-4 animate-spin" />}
              Atualizar senha
            </button>
          </form>
        ) : (
          <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">E-mail</span>
              <span className="relative mt-2 block">
                <Mail className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-goodgreen-500 focus:ring-4 focus:ring-goodgreen-500/10"
                />
              </span>
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Senha</span>
              <span className="relative mt-2 block">
                <KeyRound className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-goodgreen-500 focus:ring-4 focus:ring-goodgreen-500/10"
                />
              </span>
            </label>

            <div aria-live="polite">
              {message && (
                <p
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    isError
                      ? "border-rose-200 bg-rose-50 text-rose-800"
                      : "border-goodgreen-200 bg-goodgreen-50 text-goodgreen-800"
                  }`}
                >
                  {message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-goodgreen-600 px-4 text-sm font-bold text-white transition hover:bg-goodgreen-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goodgreen-400 focus-visible:ring-offset-2 disabled:opacity-60"
            >
              {loading && <LoaderCircle className="h-4 w-4 animate-spin" />}
              Entrar
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => void handlePasswordReset()}
              className="w-full text-sm font-semibold text-goodblue-700 hover:text-goodblue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goodblue-300"
            >
              Esqueci minha senha
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
