"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, type Session } from "@/lib/api";

type SessionState = {
  session: Session | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const SessionContext = createContext<SessionState | null>(null);

// Asks the API who is logged in once, and shares the answer with every page
export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getSession()
      .then(setSession)
      .catch(() => setSession(null))
      .finally(() => setLoading(false));
  }, []);

  // Call after login or register so the top bar updates without a page reload
  const refresh = useCallback(async () => {
    setSession(await api.getSession().catch(() => null));
  }, []);

  const logout = useCallback(async () => {
    await api.logout().catch(() => undefined);
    setSession(null);
  }, []);

  return (
    <SessionContext.Provider value={{ session, loading, refresh, logout }}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}
