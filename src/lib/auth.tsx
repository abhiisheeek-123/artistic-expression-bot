import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Profile = { id: string; username: string };

type AuthValue = {
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  signUp: (username: string, password: string) => Promise<void>;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

const EMAIL_DOMAIN = "chatigram.local";

export function normalizeUsername(raw: string) {
  return raw.trim().toLowerCase();
}

function emailFor(username: string) {
  return `${normalizeUsername(username)}@${EMAIL_DOMAIN}`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (!next) setProfile(null);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const userId = session?.user.id;
    if (!userId) return;
    let cancelled = false;
    supabase
      .from("profiles")
      .select("id, username")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data) setProfile(data as Profile);
      });
    return () => {
      cancelled = true;
    };
  }, [session?.user.id]);

  const value: AuthValue = {
    session,
    profile,
    loading,
    async signUp(username, password) {
      const clean = normalizeUsername(username);
      if (!/^[a-z0-9_]{3,20}$/.test(clean)) {
        throw new Error("Username must be 3-20 characters: letters, numbers or underscore.");
      }
      const { data: taken } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", clean)
        .maybeSingle();
      if (taken) throw new Error("That username is already taken.");

      const { error } = await supabase.auth.signUp({
        email: emailFor(clean),
        password,
        options: { data: { username: clean } },
      });
      if (error) {
        throw new Error(
          error.message.toLowerCase().includes("already registered")
            ? "That username is already taken."
            : error.message,
        );
      }
    },
    async signIn(username, password) {
      const { error } = await supabase.auth.signInWithPassword({
        email: emailFor(username),
        password,
      });
      if (error) throw new Error("Incorrect username or password.");
    },
    async signOut() {
      await supabase.auth.signOut();
      setProfile(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export function formatTime(iso: string) {
  const d = new Date(iso);
  const now = Date.now();
  const diff = Math.floor((now - d.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
    " · " +
    d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}
