import { useEffect, useState, type ReactNode } from "react";
import { AppSessionLoading } from "../components/AppSessionLoading";
import { useAuth } from "../contexts/AuthContext";
import { LoginPage } from "../pages/LoginPage";
import {
  buildLoginPath,
  isPublicAuthPath,
  replaceAppPath
} from "./authNavigation";

function currentInternalDestination(): string {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

export function AppAuthGate({ children }: { children: ReactNode }) {
  const {
    configured,
    loading,
    passwordRecovery,
    sessionExpired,
    user
  } = useAuth();
  const [pathname, setPathname] = useState(window.location.pathname);

  useEffect(() => {
    const handlePathChange = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", handlePathChange);
    return () => window.removeEventListener("popstate", handlePathChange);
  }, []);

  const isPublicRoute = isPublicAuthPath(pathname);

  useEffect(() => {
    if (loading) return;

    if (!user && !isPublicRoute) {
      replaceAppPath(
        buildLoginPath(
          currentInternalDestination(),
          sessionExpired ? "session-expired" : undefined
        )
      );
      return;
    }

    if (user && isPublicRoute && !passwordRecovery) {
      const redirectTimer = window.setTimeout(() => {
        if (isPublicAuthPath(window.location.pathname)) {
          replaceAppPath("/");
        }
      }, 0);
      return () => window.clearTimeout(redirectTimer);
    }
  }, [isPublicRoute, loading, passwordRecovery, sessionExpired, user]);

  if (loading) return <AppSessionLoading />;

  if (!user) {
    if (!isPublicRoute) {
      return <AppSessionLoading message="Direcionando para o acesso interno..." />;
    }
    return <LoginPage />;
  }

  if (isPublicRoute) {
    if (passwordRecovery) return <LoginPage />;
    return <AppSessionLoading message="Abrindo o GoodCredit Hub..." />;
  }

  if (!configured) return <LoginPage />;

  return children;
}
