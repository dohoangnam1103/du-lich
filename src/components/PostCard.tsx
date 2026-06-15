"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession, signIn } from "next-auth/react";

export type PostMedia = { id: string; url: string; type: string; position: number };
export type PostAuthor = { id?: string; displayName: string | null; avatarUrl: string | null };
export type PostComment = {
  id: string;
  body: string;
  createdAt: string;
  user: { displayName: string | null; avatarUrl: string | null };
};
export type FeedPost = {
  id: string;
  caption: string | null;
  placeId: string | null;
  placeName: string | null;
  createdAt: string;
  media: PostMedia[];
  user: PostAuthor;
  comments?: PostComment[];
};

function Avatar({ url, name }: { url: string | null; name: string | null }) {
  const initial = (name ?? "?").trim().charAt(0).toUpperCase() || "?";
  return (
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: "50%",
        flex: "0 0 auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 600,
        background: url ? `center/cover url(${url})` : "rgba(255,255,255,0.2)",
      }}
    >
      {url ? "" : initial}
    </div>
  );
}

export function PostCard({ post }: { post: FeedPost }) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<PostComment[]>(post.comments ?? []);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!session?.user) {
      signIn("google");
      return;
    }
    const text = body.trim();
    if (!text) return;
    setSending(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      if (res.ok) {
        setComments((c) => [
          ...c,
          {
            id: crypto.randomUUID(),
            body: text,
            createdAt: new Date().toISOString(),
            user: {
              displayName: session.user?.name ?? null,
              avatarUrl: session.user?.image ?? null,
            },
          },
        ]);
        setBody("");
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="glass glass-edge" style={{ padding: 16, marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <Avatar url={post.user.avatarUrl} name={post.user.displayName} />
        <div style={{ fontWeight: 600 }}>{post.user.displayName ?? "Ẩn danh"}</div>
      </div>

      {post.media.length > 0 && (
        <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
          {post.media.map((m) =>
            m.type === "video" ? (
              <video
                key={m.id}
                src={m.url}
                controls
                style={{ width: "100%", borderRadius: 16, background: "#000" }}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={m.id}
                src={m.url}
                alt={post.caption ?? "post media"}
                style={{ width: "100%", borderRadius: 16, display: "block" }}
              />
            ),
          )}
        </div>
      )}

      {post.caption && <div style={{ marginBottom: 8 }}>{post.caption}</div>}

      {post.placeId && post.placeName && (
        <Link
          href={`/place/${post.placeId}`}
          style={{ color: "var(--text-dim)", fontSize: 14, textDecoration: "none" }}
        >
          📍 {post.placeName}
        </Link>
      )}

      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        {comments.map((c) => (
          <div key={c.id} style={{ display: "flex", gap: 8, fontSize: 14 }}>
            <Avatar url={c.user.avatarUrl} name={c.user.displayName} />
            <div>
              <span style={{ fontWeight: 600 }}>{c.user.displayName ?? "Ẩn danh"}</span>{" "}
              <span style={{ color: "var(--text-dim)" }}>{c.body}</span>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={submitComment} style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={session?.user ? "Viết bình luận..." : "Đăng nhập để bình luận"}
          style={{
            flex: 1,
            padding: "8px 12px",
            borderRadius: 999,
            border: "1px solid var(--glass-border)",
            background: "rgba(255,255,255,0.1)",
            color: "var(--text)",
          }}
        />
        <button type="submit" className="glass-btn" disabled={sending}>
          Gửi
        </button>
      </form>
    </div>
  );
}
