import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import logo from "@/assets/chatigram-logo.png.asset.json";
import { useAuth } from "@/lib/auth";

const tabs = [
  { label: "Feed", to: "/" },
  { label: "Chat", to: "/chat" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { session, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth" });
  }, [loading, session, navigate]);

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  const profilePath = profile ? `/u/${profile.username}` : "/";
  const navItems = [...tabs, { label: profile ? `@${profile.username}` : "Profile", to: profilePath }];

  return (
    <div className="min-h-screen">
      <header className="fixed inset-x-0 top-0 z-20 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-4">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo.url} alt="Chatigram" className="h-7 w-7 rounded" />
            <span className="text-[15px] font-bold tracking-tight">Chatigram</span>
          </Link>

          <nav className="ml-auto hidden items-center gap-1 sm:flex">
            {navItems.map((item) => {
              const active =
                item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                    active
                      ? "bg-secondary text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <button
            onClick={async () => {
              await signOut();
              navigate({ to: "/auth" });
            }}
            className="ml-auto rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground sm:ml-0"
          >
            Log out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-24 pt-20 sm:pb-12">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-border bg-card sm:hidden">
        {navItems.map((item) => {
          const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
          return (
            <Link
              key={item.label}
              to={item.to}
              className={`flex-1 py-3 text-center text-sm ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h1 className="mb-4 text-lg font-medium tracking-tight">{children}</h1>;
}
