"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type AuthProfile = {
  id: string;
  email: string | null;
  displayName: string | null;
  role: string | null;
};

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: AuthProfile | null;
  loading: boolean;
  isAdmin: boolean;
  signInWithPassword: (email: string, password: string) => Promise<{ error?: { message: string } | null }>;
  signUpWithPassword: (email: string, password: string) => Promise<{ error?: { message: string } | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
  .split(",")
  .map((entry) => entry.trim().toLowerCase())
  .filter(Boolean);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const syncProfile = useCallback(async (currentUser: User | null) => {
    if (!currentUser) {
      setProfile(null);
      return;
    }

    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setProfile({
        id: currentUser.id,
        email: currentUser.email ?? null,
        displayName: currentUser.user_metadata?.full_name ?? null,
        role: null,
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, role, email")
        .eq("id", currentUser.id)
        .maybeSingle();

      if (!error && data) {
        setProfile({
          id: currentUser.id,
          email: data.email ?? currentUser.email ?? null,
          displayName: data.display_name ?? currentUser.user_metadata?.full_name ?? null,
          role: data.role ?? null,
        });
        return;
      }
    } catch {
      // ignore profile lookup issues and fall back to the user metadata
    }

    setProfile({
      id: currentUser.id,
      email: currentUser.email ?? null,
      displayName: currentUser.user_metadata?.full_name ?? null,
      role: null,
    });
  }, []);

  const refreshProfile = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();

    setSession(currentSession);
    setUser(currentSession?.user ?? null);
    await syncProfile(currentSession?.user ?? null);
  }, [syncProfile]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setLoading(false);
      return;
    }

    const initialize = async () => {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      await syncProfile(currentSession?.user ?? null);
      setLoading(false);
    };

    void initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      void syncProfile(nextSession?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [syncProfile]);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return { error: { message: "Configuration Supabase manquante." } };
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }, []);

  const signUpWithPassword = useCallback(async (email: string, password: string) => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return { error: { message: "Configuration Supabase manquante." } };
    }

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (!error && data.user && !data.session) {
      return { error: { message: "Vérifiez votre boîte mail pour confirmer l'inscription." } };
    }

    return { error };
  }, []);

  const signOut = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    await supabase.auth.signOut();
  }, []);

  const isAdmin = useMemo(() => {
    const normalizedEmail = user?.email?.toLowerCase() || profile?.email?.toLowerCase() || "";
    return Boolean(profile?.role === "admin" || adminEmails.includes(normalizedEmail));
  }, [profile, user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      profile,
      loading,
      isAdmin,
      signInWithPassword,
      signUpWithPassword,
      signOut,
      refreshProfile,
    }),
    [loading, profile, refreshProfile, session, signInWithPassword, signOut, signUpWithPassword, user, isAdmin],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
