import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "model" | "brand" | "admin";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  roles: AppRole[];
  loading: boolean;
  signOut: () => Promise<void>;
  refreshRoles: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRoles = async (userId: string) => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (error) throw error;
    return (data ?? []).map((row) => row.role as AppRole);
  };

  useEffect(() => {
    let active = true;
    let generation = 0;

    // A monotonically increasing generation prevents a slower role lookup for an
    // older session from overwriting the state of a newer sign-in/sign-out event.
    const syncSession = async (nextSession: Session | null) => {
      const currentGeneration = ++generation;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(true);

      if (!nextSession?.user) {
        setRoles([]);
        if (active && currentGeneration === generation) setLoading(false);
        return;
      }

      try {
        const nextRoles = await fetchRoles(nextSession.user.id);
        if (active && currentGeneration === generation) setRoles(nextRoles);
      } catch (error) {
        if (active && currentGeneration === generation) {
          setRoles([]);
          console.error("Unable to load account roles", error);
        }
      } finally {
        if (active && currentGeneration === generation) setLoading(false);
      }
    };

    // Subscribe before reading the persisted session so auth changes are not missed.
    // Defer work out of the auth callback to avoid holding Supabase's auth lock.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      window.setTimeout(() => { void syncSession(nextSession); }, 0);
    });

    void supabase.auth.getSession()
      .then(({ data: { session: storedSession } }) => syncSession(storedSession))
      .catch((error) => {
        if (!active) return;
        console.error("Unable to restore authentication session", error);
        const currentGeneration = ++generation;
        setSession(null);
        setUser(null);
        setRoles([]);
        if (active && currentGeneration === generation) setLoading(false);
      });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshRoles = async () => {
    if (user) setRoles(await fetchRoles(user.id));
  };

  return (
    <AuthContext.Provider value={{ session, user, roles, loading, signOut, refreshRoles }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
