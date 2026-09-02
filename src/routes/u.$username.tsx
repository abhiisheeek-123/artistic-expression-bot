import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ErrorNote, PostCard, PostSkeleton, type PostRow } from "@/components/PostCard";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/u/$username")({
  component: ProfilePage,
  head: ({ params }) => ({
    meta: [
      { title: `@${params.username} · Chatigram` },
      { name: "description", content: `Posts by @${params.username} on Chatigram.` },
      { property: "og:title", content: `@${params.username} · Chatigram` },
      { property: "og:description", content: `Posts by @${params.username} on Chatigram.` },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function ProfilePage() {
  return (
    <AppShell>
      <Profile />
    </AppShell>
  );
}

function Profile() {
  const { username } = Route.useParams();
  const [posts, setPosts] = useState<PostRow[] | null>(null);
  const [exists, setExists] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setPosts(null);
    (async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, username")
        .eq("username", username.toLowerCase())
        .maybeSingle();
      if (cancelled) return;
      if (!profile) {
        setExists(false);
        setPosts([]);
        return;
      }
      setExists(true);
      const { data, error: err } = await supabase
        .from("posts")
        .select("id, body, created_at, profiles(username)")
        .eq("author_id", profile.id)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (err) setError("Could not load these posts.");
      setPosts((data ?? []) as unknown as PostRow[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [username]);

  return (
    <>
      <header className="mb-6 border-b border-border pb-5">
        <h1 className="text-2xl font-bold tracking-tight">{username}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Posts by @{username}</p>
      </header>

      {!exists ? (
        <p className="text-sm text-muted-foreground">No member with that username.</p>
      ) : error ? (
        <ErrorNote>{error}</ErrorNote>
      ) : posts === null ? (
        <div className="space-y-4">
          <PostSkeleton />
          <PostSkeleton />
        </div>
      ) : posts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No posts yet.</p>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </>
  );
}
