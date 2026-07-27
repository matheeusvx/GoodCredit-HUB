import { LockKeyhole, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { ComplianceChecklistEditorPage } from "./ComplianceChecklistEditorPage";
import { ComplianceChecklistListPage } from "./ComplianceChecklistListPage";

function loginPath(returnTo: string): string {
  return `/login?returnTo=${encodeURIComponent(returnTo)}`;
}

export function getComplianceChecklistRouteState(pathname: string) {
  if (pathname === "/checklist-conformidade/novo") {
    return { type: "NEW" as const, id: null };
  }
  const match = pathname.match(/^\/checklist-conformidade\/([^/]+)$/);
  if (match) {
    return { type: "EDIT" as const, id: decodeURIComponent(match[1]) };
  }
  return { type: "LIST" as const, id: null };
}

export function ComplianceChecklistPage() {
  const { configured, loading, user } = useAuth();
  const [pathname, setPathname] = useState(window.location.pathname);

  useEffect(() => {
    const handlePathChange = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", handlePathChange);
    return () => window.removeEventListener("popstate", handlePathChange);
  }, []);

  useEffect(() => {
    if (loading || !configured || user) return;
    const destination = `${window.location.pathname}${window.location.search}`;
    window.history.replaceState({}, "", loginPath(destination));
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, [configured, loading, user]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <p className="text-sm font-semibold text-slate-600">
          Verificando acesso interno...
        </p>
      </main>
    );
  }

  if (!configured) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <section className="w-full max-w-xl rounded-lg border border-amber-200 bg-white p-6 text-center shadow-panel">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
            <Settings className="h-5 w-5" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-slate-950">
            Configuração necessária
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            O Checklist de Conformidade permanece protegido e indisponível até que
            o Supabase seja configurado neste ambiente.
          </p>
        </section>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
          <LockKeyhole className="h-4 w-4" />
          Redirecionando para o acesso interno...
        </div>
      </main>
    );
  }

  const route = getComplianceChecklistRouteState(pathname);
  if (route.type === "LIST") return <ComplianceChecklistListPage />;
  return (
    <ComplianceChecklistEditorPage
      key={route.id ?? "new"}
      checklistId={route.id}
    />
  );
}
