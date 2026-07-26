import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { pullAll, pushAll, setCurrentUserId, triggerPush } from "@/lib/syncManager";
import { clearAll, getDirtyRows, reassignLocalUser, shouldClearOnUserChange } from "@/lib/localStore";
import { toast } from "sonner";

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
  /** Probe the current session server-side. Returns the validated session, or null if it is dead/missing (and cleans up). */
  ensureFreshSession: () => Promise<Session | null>;
}

const AuthContext = createContext<AuthContextType>({
  session: null, user: null, loading: true, isGuest: false, isLocalGuest: false, syncReady: false,
  signOut: async () => {}, enterGuestMode: async () => {}, ensureFreshSession: async () => null,
});

export const useAuth = () => useContext(AuthContext);

function generateLocalGuestUser(): User {
  const id = crypto.randomUUID();
  return { id, app_metadata: {}, user_metadata: {}, aud: "authenticated", created_at: new Date().toISOString(), is_anonymous: true } as User;
}

function isStaleSessionError(err: any): boolean {
  if (!err) return false;
  const msg = (err.message || "").toLowerCase();
  const code = err.code || err.error_code || "";
  const status = err.status;
  return (
    status === 401 ||
    status === 403 ||
    code === "session_not_found" ||
    err.name === "AuthSessionMissingError" ||
    msg.includes("session_not_found") ||
    msg.includes("session not found") ||
    msg.includes("session missing") ||
    msg.includes("jwt expired")
  );
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
      if (stored) setLocalGuestUser(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  const handleStaleSession = useCallback(async () => {
    console.warn("[auth] Detected stale/revoked session, signing out locally.");
    try { await supabase.auth.signOut({ scope: "local" } as any); } catch { /* ignore */ }
    setSession(null);
    setSyncReady(false);
    if (navigator.onLine) {
      toast.error("Your session expired", { description: "Please sign in again." });
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        // AUTH-01: rehome any local-guest rows to the real uid so the queued
        // edits get pushed under the new identity instead of orphaned.
        try {
          const stored = localStorage.getItem(LOCAL_GUEST_KEY);
          if (stored) {
            const guest = JSON.parse(stored) as User;
            if (guest?.id && guest.id !== newSession.user.id) {
              reassignLocalUser(guest.id, newSession.user.id);
              // B-25: schedule a push so rehomed rows don't sit until the next edit.
              try { triggerPush(); } catch {}
            }
          }
        } catch { /* ignore */ }
        setLocalGuestUser(null);
        localStorage.removeItem(LOCAL_GUEST_KEY);
      }
      // A-02: the dead `TOKEN_REFRESHED && !newSession` branch is removed —
      // supabase-js v2 emits `SIGNED_OUT` in that case; handleStaleSession
      // is invoked by the initial getUser probe instead.
      setLoading(false);
    });

    (async () => {
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      if (initialSession && navigator.onLine) {
        // Verify the session is still valid server-side
        const { error } = await supabase.auth.getUser();
        if (error && isStaleSessionError(error)) {
          await handleStaleSession();
          setLoading(false);
          return;
        }
      }
      setSession(initialSession);
      setLoading(false);
    })();

    return () => subscription.unsubscribe();
  }, [handleStaleSession]);

  // After auth resolved, pull data from server if online.
  const lastSyncedUserRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (loading) return;

    const userId = session?.user?.id;
    setCurrentUserId(userId);

    // A-01: only clear when switching between two distinct non-null identities.
    // A transient signed-out state (token refresh, cross-tab sign-out) must
    // NOT wipe local unpushed edits.
    if (lastSyncedUserRef.current !== userId) {
      if (shouldClearOnUserChange(lastSyncedUserRef.current, userId)) {
        clearAll();
      }
      setSyncReady(false);
    }

    let cancelled = false;
    async function initSync() {
      if (navigator.onLine && userId) {
        try { await pullAll(userId); } catch { /* stay with local data */ }
      }
      if (cancelled) return;
      lastSyncedUserRef.current = userId;
      setSyncReady(true);
      // B-25: startup drain — flush any queued edits (e.g. rehomed guest rows).
      if (navigator.onLine && userId) {
        try {
          if (getDirtyRows().length > 0) pushAll();
        } catch {}
      }
    }

    initSync();
    return () => { cancelled = true; };
  }, [loading, session]);

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
  };

  const signOut = async () => {
    // A-02: flush pending edits before revoking the session that could push them.
    try { if (navigator.onLine) await pushAll(); } catch {}
    await supabase.auth.signOut();
    setLocalGuestUser(null);
    localStorage.removeItem(LOCAL_GUEST_KEY);
    clearAll();
    setSyncReady(false);
  };

  const ensureFreshSession = useCallback(async (): Promise<Session | null> => {
    const { data: { session: current } } = await supabase.auth.getSession();
    if (!current) return null;
    if (!navigator.onLine) return current; // can't verify offline, trust local
    const { error } = await supabase.auth.getUser();
    if (error && isStaleSessionError(error)) {
      await handleStaleSession();
      return null;
    }
    return current;
  }, [handleStaleSession]);

  const user = session?.user ?? localGuestUser ?? null;
  const isGuest = user?.is_anonymous === true;
  const isLocalGuest = localGuestUser !== null && session?.user == null;

  return (
    <AuthContext.Provider value={{ session, user, loading, isGuest, isLocalGuest, syncReady, signOut, enterGuestMode, ensureFreshSession }}>
      {children}
    </AuthContext.Provider>
  );
};
