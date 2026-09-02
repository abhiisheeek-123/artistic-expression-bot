import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import logo from "@/assets/chatigram-logo.png.asset.json";
import { ErrorNote } from "@/components/PostCard";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Sign in · Chatigram" },
      {
        name: "description",
        content: "Log in or create a Chatigram account to join the community chat and post feed.",
      },
      { property: "og:title", content: "Sign in · Chatigram" },
      {
        property: "og:description",
        content: "Log in or create a Chatigram account to join the community chat and post feed.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function AuthPage() {
  const { session, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session) navigate({ to: "/" });
  }, [session, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!username.trim() || !password) {
      setError("Enter a username and password.");
      return;
    }
    if (mode === "signup" && password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") await signUp(username, password);
      else await signIn(username, password);
      navigate({ to: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-3">
          <img src={logo.url} alt="Chatigram logo" className="h-10 w-10 rounded" />
          <div>
            <h1 className="text-xl font-bold tracking-tight">Chatigram</h1>
            <p className="text-sm text-muted-foreground">One community. Chat and posts.</p>
          </div>
        </div>

        <div className="panel p-5">
          <div className="mb-5 flex gap-1 rounded-md border border-border p-1">
            {(["login", "signup"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setError(null);
                }}
                className={`flex-1 rounded px-3 py-1.5 text-sm transition-colors ${
                  mode === m ? "bg-secondary text-foreground" : "text-muted-foreground"
                }`}
              >
                {m === "login" ? "Log in" : "Sign up"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-3">
            <div>
              <label htmlFor="username" className="mb-1.5 block text-xs text-muted-foreground">
                Username
              </label>
              <input
                id="username"
                className="field"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-xs text-muted-foreground">
                Password
              </label>
              <input
                id="password"
                type="password"
                className="field"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {mode === "signup" && (
              <div>
                <label htmlFor="confirm" className="mb-1.5 block text-xs text-muted-foreground">
                  Confirm password
                </label>
                <input
                  id="confirm"
                  type="password"
                  className="field"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>
            )}

            {error && <ErrorNote>{error}</ErrorNote>}

            <button type="submit" disabled={busy} className="btn-primary w-full hover:opacity-90 disabled:opacity-60">
              {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Log in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
