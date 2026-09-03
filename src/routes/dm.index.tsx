import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, SectionTitle } from "@/components/AppShell";
import { ErrorNote } from "@/components/PostCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/dm/")({
  component: DirectPage,
  head: () => ({
    meta: [
      { title: "Private Messages · Chatigram" },
      {
        name: "description",
        content: "Send private one-to-one messages to any Chatigram member.",
      },
      { property: "og:title", content: "Private Messages · Chatigram" },
      {
        property: "og:description",
        content: "Send private one-to-one messages to any Chatigram member.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function DirectPage() {
  return (
    <AppShell>
      <People />
    </AppShell>
  );
}

type Person = { id: string; username: string };

function People() {
  const { profile } = useAuth();
  const [people, setPeople] = useState<Person[] | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    let cancelled = false;
    supabase
      .from("profiles")
      .select("id, username")
      .neq("id", profile.id)
      .order("username")
      .then(({ data, error: err }) => {
        if (cancelled) return;
        if (err) setError("Could not load members.");
        else setPeople((data ?? []) as Person[]);
      });
    return () => {
      cancelled = true;
    };
  }, [profile?.id]);

  const filtered = (people ?? []).filter((p) => p.username.includes(query.trim().toLowerCase()));

  return (
    <>
      <SectionTitle>Private messages</SectionTitle>
      <p className="-mt-2 mb-4 text-sm text-muted-foreground">
        Only you and the person you write to can read these.
      </p>

      <input
        className="field mb-4"
        placeholder="Search members…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {error ? (
        <ErrorNote>{error}</ErrorNote>
      ) : people === null ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="panel h-12 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No members found.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => (
            <Link
              key={p.id}
              to="/dm/$username"
              params={{ username: p.username }}
              className="panel flex items-center justify-between px-4 py-3 text-sm transition-colors hover:border-primary/60"
            >
              <span className="font-medium">@{p.username}</span>
              <span className="text-xs text-muted-foreground">Message</span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
