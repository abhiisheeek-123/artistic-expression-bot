import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, SectionTitle } from "@/components/AppShell";
import { ErrorNote, PostCard, PostSkeleton, type PostRow } from "@/components/PostCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  component: FeedPage,
  head: () => ({
    meta: [
      { title: "Chatigram · Community Feed" },
      {
        name: "description",
        content:
          "Chatigram is a minimal, dark community space: one shared feed and one chat room. No likes, no DMs.",
      },
      { property: "og:title", content: "Chatigram · Community Feed" },
      {
        property: "og:description",
        content:
          "Chatigram is a minimal, dark community space: one shared feed and one chat room. No likes, no DMs.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function FeedPage() {
  return (
    <AppShell>
      <Feed />
    </AppShell>
  );
}

function Feed() {
  const { profile } = useAuth();
  const [posts, setPosts] = useState<PostRow[] | null>(null);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data, error: err } = await supabase
      .from("posts")
      .select("id, body, created_at, profiles(username)")
      .order("created_at", { ascending: false })
      .limit(100);
    if (err) setError("Could not load the feed.");
    else setPosts((data ?? []) as unknown as PostRow[]);
  }

  useEffect(() => {
    load();
    const channel = supabase
      .channel("feed-posts")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || !profile) return;
    setBusy(true);
    setError(null);
    const { error: err } = await supabase
      .from("posts")
      .insert({ body: body.trim(), author_id: profile.id });
    if (err) setError("Your post could not be published.");
    else {
      setBody("");
      await load();
    }

    setBusy(false);
  }

  return (
    <>
      <SectionTitle>Feed</SectionTitle>

      <form onSubmit={submit} className="panel mb-6 p-4">
        <textarea
          className="field min-h-24 resize-y"
          placeholder="Share something with the community…"
          value={body}
          maxLength={2000}
          onChange={(e) => setBody(e.target.value)}
        />
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{body.length}/2000</span>
          <button
            type="submit"
            disabled={busy || !body.trim()}
            className="btn-primary hover:opacity-90 disabled:opacity-50"
          >
            Post
          </button>
        </div>
      </form>

      {error && <div className="mb-4">
        <ErrorNote>{error}</ErrorNote>
      </div>}

      <div className="space-y-4">
        {posts === null ? (
          <>
            <PostSkeleton />
            <PostSkeleton />
            <PostSkeleton />
          </>
        ) : posts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No posts yet. Be the first to write one.</p>
        ) : (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </div>
    </>
  );
}
