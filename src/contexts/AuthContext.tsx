import React, { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface UserProfile {
  role: "user" | "superadmin";
  is_approved: boolean;
  display_name: string | null;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  userProfile: UserProfile | null;
  isLoading: boolean;
  isSuperAdmin: boolean;
  isApproved: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Profil laden (non-blocking, fire-and-forget)
  const fetchProfile = (userId: string) => {
    supabase
      .from("user_profiles")
      .select("role, is_approved, display_name")
      .eq("id", userId)
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.error("Failed to load user profile:", error);
          // Fallback: superadmin fuer den ersten User (Gilbert)
          setUserProfile(null);
        } else {
          setUserProfile(data as UserProfile);
        }
      })
      .catch((err) => {
        console.error("Profile fetch error:", err);
        setUserProfile(null);
      });
  };

  useEffect(() => {
    // 1. Initiale Session holen
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setIsLoading(false);
    });

    // 2. Auth State Changes (login, logout, token refresh)
    // WICHTIG: Callback darf NICHT async sein (Supabase Requirement)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setUserProfile(null);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUserProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        userProfile,
        isLoading,
        isSuperAdmin: userProfile?.role === "superadmin",
        isApproved: userProfile?.is_approved ?? false,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
