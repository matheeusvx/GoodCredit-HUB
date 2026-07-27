import { LoaderCircle } from "lucide-react";

export function AppSessionLoading({
  message = "Verificando sua sessão..."
}: {
  message?: string;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <section
        className="flex w-full max-w-sm flex-col items-center rounded-lg border border-slate-200 bg-white p-8 text-center shadow-panel"
        aria-live="polite"
      >
        <img
          src="/logo-goodcredit-hub.png"
          alt="GoodCredit Hub"
          className="h-auto w-40 object-contain"
        />
        <LoaderCircle className="mt-6 h-6 w-6 animate-spin text-goodgreen-600" />
        <p className="mt-3 text-sm font-semibold text-slate-600">{message}</p>
      </section>
    </main>
  );
}

