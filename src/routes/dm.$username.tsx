import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ErrorNote } from "@/components/PostCard";
import { supabase } from "@/integrations/supabase/client";
import { formatTime, useAuth } from "@/lib/auth";

export const Route = createFileRoute("/dm/$username")({
  component: ThreadPage,
  head: ({ params }) => ({
    meta: [
      { title: `Private chat with @${params.username} · Chatigram` },
      {
        name: "description",
        content: `Your private one-to-one conversation with @${params.username} on Chatigram.`,
      },
      { property: "og:title", content: `Private chat with @${params.username} · Chatigram` },
      {
        property: "og:description",
        content: `Your private one-to-one conversation with @${params.username} on Chatigram.`,
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type DM = {
  id: string;
  body: string;
  created_at: string;
  sender_id: string;
};

function ThreadPage() {
  return (
    <AppShell>
      <Thread />
    </AppShell>
  );
}

function Thread() {
  const { username } = Route.useParams();
  const { profile } = useAuth();
  const [otherId, setOtherId] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const [items, setItems] = useState<DM[] | null>(null);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("profiles")
      .select("id")
      .eq("username", username.toLowerCase())
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        if (!data) setMissing(true);
        else setOtherId(data.id);
      });
    return () => {
      cancelled = true;
    };
  }, [username]);

  const load = useCallback(async () => {
    if (!profile || !otherId) return;
    const { data, error: err } = await supabase
      .from("direct_messages")
      .select("id, body, created_at, sender_id")
      .or(
        `and(sender_id.eq.${profile.id},recipient_id.eq.${otherId}),and(sender_id.eq.${otherId},recipient_id.eq.${profile.id})`,
      )
      .order("created_at", { ascending: true })
      .limit(300);
    if (err) setError("Could not load this conversation.");
    else setItems((data ?? []) as DM[]);
  }, [profile?.id, otherId]);

  useEffect(() => {
    if (!profile || !otherId) return;
    load();
    const channel = supabase
      .channel(`dm-${[profile.id, otherId].sort().join("-")}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "direct_messages" },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, otherId, load]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [items]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text || !profile || !otherId) return;
    setBody("");
    setError(null);
    const { error: err } = await supabase
      .from("direct_messages")
      .insert({ body: text, sender_id: profile.id, recipient_id: otherId });
    if (err) setError("Message could not be sent.");
    else await load();
  }

  if (missing) {
    return (
      <>
        <p className="text-sm text-muted-foreground">No member with that username.</p>
        <Link to="/dm" className="mt-3 inline-block text-sm text-primary">
          Back to private messages
        </Link>
      </>
    );
  }

  return (
    <>
      <div className="mb-4 flex items-baseline gap-3">
        <h1 className="text-lg font-medium tracking-tight">@{username}</h1>
        <span className="text-xs text-muted-foreground">Private · only you two</span>
        <Link to="/dm" className="ml-auto text-xs text-primary">
          All chats
        </Link>
      </div>

      <div className="panel flex h-[calc(100vh-14rem)] flex-col">
        <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-4">
          {items === null ? (
            <div className="flex h-full items-center justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" />
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No messages yet. Say hello privately.</p>
          ) : (
            items.map((m) => {
              const mine = m.sender_id === profile?.id;
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 ${
                      mine ? "bg-primary/15 text-foreground" : "bg-secondary text-foreground"
                    }`}
                  >
                    <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{m.body}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground">
                        {formatTime(m.created_at)}
                      </span>
                      {mine && (
                        <button
                          onClick={async () => {
                            await supabase.from("direct_messages").delete().eq("id", m.id);
                            await load();
                          }}
                          className="text-[11px] text-muted-foreground transition-colors hover:text-destructive"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <form onSubmit={send} className="flex gap-2 border-t border-border p-3">
          <input
            className="field"
            placeholder={`Message @${username}…`}
            maxLength={1000}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <button
            type="submit"
            disabled={!body.trim() || !otherId}
            className="btn-primary hover:opacity-90 disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>

      {error && (
        <div className="mt-3">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}
    </>
  );
}
