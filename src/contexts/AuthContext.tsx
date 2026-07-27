import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getReturnPath } from "../auth/authNavigation";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  configured: boolean;
  passwordRecovery: boolean;
  sessionExpired: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<string | null>;
  updatePassword: (password: string) => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const explicitSignOutRef = useRef(false);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      if (event === "PASSWORD_RECOVERY") setPasswordRecovery(true);
      if (event === "SIGNED_IN") setSessionExpired(false);
      if (event === "SIGNED_OUT") {
        setSessionExpired(!explicitSignOutRef.current);
      }
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return "Supabase não configurado.";
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error?.message ?? null;
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    explicitSignOutRef.current = true;
    try {
      await supabase.auth.signOut();
      setSession(null);
      setSessionExpired(false);
      setPasswordRecovery(false);
    } finally {
      explicitSignOutRef.current = false;
    }
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    if (!supabase) return "Supabase não configurado.";
    const returnTo = getReturnPath(window.location.search);
    const redirectTo = `${window.location.origin}/reset-password?returnTo=${encodeURIComponent(returnTo)}`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo
    });
    return error?.message ?? null;
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    if (!supabase) return "Supabase não configurado.";
    const { error } = await supabase.auth.updateUser({ password });
    if (!error) setPasswordRecovery(false);
    return error?.message ?? null;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      loading,
      configured: isSupabaseConfigured,
      passwordRecovery,
      sessionExpired,
      signIn,
      signOut,
      requestPasswordReset,
      updatePassword
    }),
    [
      loading,
      passwordRecovery,
      requestPasswordReset,
      session,
      sessionExpired,
      signIn,
      signOut,
      updatePassword
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth deve ser usado dentro de AuthProvider.");
  return context;
}
