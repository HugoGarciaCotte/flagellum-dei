import React, { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const GUEST_USER_ID_KEY = "guest_user_id";
const GUEST_MODE_KEY = "guest_mode";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isGuest: boolean;
  signOut: () => Promise<void>;
  enterGuestMode: () => void;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  isGuest: false,
  signOut: async () => {},
  enterGuestMode: () => {},
});

export const useAuth = () => useContext(AuthContext);

function createGuestUser(): User {
  let guestId = localStorage.getItem(GUEST_USER_ID_KEY);
  if (!guestId) {
    guestId = crypto.randomUUID();
    localStorage.setItem(GUEST_USER_ID_KEY, guestId);
  }
  return {
    id: guestId,
    email: "guest",
    app_metadata: {},
    user_metadata: { display_name: "Guest" },
    aud: "authenticated",
    created_at: new Date().toISOString(),
  } as User;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [guestUser, setGuestUser] = useState<User | null>(null);

  useEffect(() => {
    // Restore guest mode on refresh
    if (localStorage.getItem(GUEST_MODE_KEY) === "true") {
      setGuestUser(createGuestUser());
      setIsGuest(true);
      setLoading(false);
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const enterGuestMode = () => {
    localStorage.setItem(GUEST_MODE_KEY, "true");
    setGuestUser(createGuestUser());
    setIsGuest(true);
    setLoading(false);
  };

  const signOut = async () => {
    if (isGuest) {
      localStorage.removeItem(GUEST_MODE_KEY);
      localStorage.removeItem(GUEST_USER_ID_KEY);
      setGuestUser(null);
      setIsGuest(false);
      return;
    }
    await supabase.auth.signOut();
  };

  const user = isGuest ? guestUser : session?.user ?? null;

  return (
    <AuthContext.Provider value={{ session, user, loading, isGuest, signOut, enterGuestMode }}>
      {children}
    </AuthContext.Provider>
  );
};
