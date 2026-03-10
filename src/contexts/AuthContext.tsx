import React, { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getQueueLength, processQueue, remapUserId } from "@/lib/offlineQueue";

const LOCAL_GUEST_KEY = "local-guest-user";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isGuest: boolean;
  isLocalGuest: boolean;
  syncReady: boolean;
  signOut: () => Promise<void>;
  enterGuestMode: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  isGuest: false,
  isLocalGuest: false,
  syncReady: false,
  signOut: async () => {},
  enterGuestMode: async () => {},
});

export const useAuth = () => useContext(AuthContext);

function generateLocalGuestUser(): User {
  const id = crypto.randomUUID();
  return {
    id,
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: new Date().toISOString(),
    is_anonymous: true,
  } as User;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [localGuestUser, setLocalGuestUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncReady, setSyncReady] = useState(false);

  // Restore local guest on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_GUEST_KEY);
      if (stored) {
        setLocalGuestUser(JSON.parse(stored));
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      // If we got a real session, clear local guest
      if (session?.user) {
        setLocalGuestUser(null);
        localStorage.removeItem(LOCAL_GUEST_KEY);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Two-phase sync gate: upgrade local guest → drain queue → enable queries
  useEffect(() => {
    if (loading) return;

    async function initSync() {
      // Phase 1: If local guest and online, try to upgrade to real anonymous session
      if (localGuestUser && !session?.user && navigator.onLine) {
        try {
          const { data, error } = await supabase.auth.signInAnonymously();
          if (!error && data.user) {
            // Remap fake UUID → real UUID in all queued actions
            remapUserId(localGuestUser.id, data.user.id);
            // Session will be set by onAuthStateChange, which clears local guest
            // Wait a tick for the session to propagate
            await new Promise(r => setTimeout(r, 100));
          }
        } catch {
          // Server unreachable, stay in local guest mode
        }
      }

      // Phase 2: Drain any pending queue before enabling queries
      if (getQueueLength() > 0 && navigator.onLine) {
        window.dispatchEvent(new CustomEvent("offline-queue-syncing"));
        const result = await processQueue();
        if (result.success > 0) {
          window.dispatchEvent(new CustomEvent("offline-queue-synced", { detail: result }));
        }
      }

      setSyncReady(true);
    }

    initSync();
  }, [loading, localGuestUser, session]);

  const enterGuestMode = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInAnonymously();
    if (error) {
      console.warn("Anonymous sign-in failed, falling back to local guest:", error.message);
      const guest = generateLocalGuestUser();
      localStorage.setItem(LOCAL_GUEST_KEY, JSON.stringify(guest));
      setLocalGuestUser(guest);
      setLoading(false);
    }
    // If successful, session will be set by onAuthStateChange
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setLocalGuestUser(null);
    localStorage.removeItem(LOCAL_GUEST_KEY);
    setSyncReady(false);
  };

  const user = session?.user ?? localGuestUser ?? null;
  const isGuest = user?.is_anonymous === true;
  const isLocalGuest = localGuestUser !== null && session?.user == null;

  return (
    <AuthContext.Provider value={{ session, user, loading, isGuest, isLocalGuest, syncReady, signOut, enterGuestMode }}>
      {children}
    </AuthContext.Provider>
  );
};
