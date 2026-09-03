import { Link } from "@tanstack/react-router";
import { formatTime } from "@/lib/auth";

export type PostRow = {
  id: string;
  body: string;
  created_at: string;
  author_id?: string;
  profiles: { username: string } | null;
};

export function PostCard({
  post,
  onDelete,
}: {
  post: PostRow;
  onDelete?: (id: string) => void;
}) {
  const username = post.profiles?.username ?? "unknown";
  return (
    <article className="panel p-4">
      <div className="flex items-baseline gap-2">
        <Link
          to="/u/$username"
          params={{ username }}
          className="text-sm font-medium text-foreground hover:text-primary"
        >
          @{username}
        </Link>
        <span className="text-xs text-muted-foreground">{formatTime(post.created_at)}</span>
        {onDelete && (
          <button
            onClick={() => onDelete(post.id)}
            className="ml-auto text-xs text-muted-foreground transition-colors hover:text-destructive"
          >
            Delete
          </button>
        )}
      </div>
      <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">
        {post.body}
      </p>
    </article>
  );
}

export function PostSkeleton() {
  return (
    <div className="panel animate-pulse p-4">
      <div className="h-3 w-28 rounded bg-secondary" />
      <div className="mt-3 h-3 w-full rounded bg-secondary" />
      <div className="mt-2 h-3 w-2/3 rounded bg-secondary" />
    </div>
  );
}

export function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {children}
    </p>
  );
}
