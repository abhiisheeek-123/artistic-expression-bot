import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppShell, SectionTitle } from "@/components/AppShell";
import { ErrorNote } from "@/components/PostCard";
import { supabase } from "@/integrations/supabase/client";
import { formatTime, useAuth } from "@/lib/auth";

export const Route = createFileRoute("/chat")({
  component: ChatPage,
  head: () => ({
    meta: [
      { title: "Community Chat · Chatigram" },
      {
        name: "description",
        content: "The single Chatigram community chat room. Everyone sees every message, live.",
      },
      { property: "og:title", content: "Community Chat · Chatigram" },
      {
        property: "og:description",
        content: "The single Chatigram community chat room. Everyone sees every message, live.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type MessageRow = {
  id: string;
  body: string;
  created_at: string;
  author_id: string;
  profiles: { username: string } | null;
};

function ChatPage() {
  return (
    <AppShell>
      <Chat />
    </AppShell>
  );
}

function Chat() {
  const { profile, isAdmin } = useAuth();
  const [messages, setMessages] = useState<MessageRow[] | null>(null);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  async function load() {
    const { data, error: err } = await supabase
      .from("messages")
      .select("id, body, created_at, author_id, profiles(username)")
      .order("created_at", { ascending: true })
      .limit(200);
    if (err) setError("Could not load the chat.");
    else setMessages((data ?? []) as unknown as MessageRow[]);
  }

  useEffect(() => {
    load();
    const channel = supabase
      .channel("community-chat")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text || !profile) return;
    setBody("");
    setError(null);
    const { error: err } = await supabase
      .from("messages")
      .insert({ body: text, author_id: profile.id });
    if (err) setError("Message could not be sent.");
    else await load();

  }

  return (
    <>
      <SectionTitle>Public chat</SectionTitle>

      <div className="panel flex h-[calc(100vh-13rem)] flex-col">
        <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages === null ? (
            <div className="flex h-full items-center justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" />
            </div>
          ) : messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">No messages yet. Say hello.</p>
          ) : (
            messages.map((m) => {
              const username = m.profiles?.username ?? "unknown";
              return (
                <div key={m.id} className="border-b border-border/60 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-baseline gap-2">
                    <Link
                      to="/u/$username"
                      params={{ username }}
                      className="text-sm font-medium hover:text-primary"
                    >
                      @{username}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(m.created_at)}
                    </span>
                    {(isAdmin || m.author_id === profile?.id) && (
                      <button
                        onClick={async () => {
                          const { error: err } = await supabase
                            .from("messages")
                            .delete()
                            .eq("id", m.id);
                          if (err) setError("Could not delete that message.");
                          await load();
                        }}
                        className="ml-auto text-xs text-muted-foreground transition-colors hover:text-destructive"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-[15px] leading-relaxed">{m.body}</p>
                </div>
              );
            })
          )}
        </div>

        <form onSubmit={send} className="flex gap-2 border-t border-border p-3">
          <input
            className="field"
            placeholder="Write a message…"
            maxLength={1000}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <button type="submit" disabled={!body.trim()} className="btn-primary hover:opacity-90 disabled:opacity-50">
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
