"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import { useT } from "@/components/I18nProvider";

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
  likeCount?: number;
  liked?: boolean;
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
  const t = useT();
  const [comments, setComments] = useState<PostComment[]>(post.comments ?? []);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [liked, setLiked] = useState(post.liked ?? false);
  const [likeCount, setLikeCount] = useState(post.likeCount ?? 0);
  const [likeBusy, setLikeBusy] = useState(false);
  const [removed, setRemoved] = useState(false);
  const [editing, setEditing] = useState(false);
  const [caption, setCaption] = useState(post.caption ?? "");
  const [savingEdit, setSavingEdit] = useState(false);

  const isOwner = !!session?.user?.id && session.user.id === post.user.id;

  async function saveEdit() {
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caption }),
      });
      if (res.ok) setEditing(false);
    } finally {
      setSavingEdit(false);
    }
  }

  async function deletePost() {
    if (!confirm(t("post.deleteConfirm"))) return;
    const res = await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
    if (res.ok) setRemoved(true);
  }

  async function toggleLike() {
    if (!session?.user) {
      signIn("google");
      return;
    }
    setLikeBusy(true);
    // Optimistic update.
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    try {
      const res = await fetch(`/api/posts/${post.id}/likes`, {
        method: next ? "POST" : "DELETE",
      });
      if (res.ok) {
        const data = await res.json();
        setLiked(data.liked);
        setLikeCount(data.count);
      } else {
        setLiked(!next);
        setLikeCount((c) => c + (next ? -1 : 1));
      }
    } finally {
      setLikeBusy(false);
    }
  }

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

  if (removed) return null;

  return (
    <div className="glass glass-edge" style={{ padding: 16, marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <Avatar url={post.user.avatarUrl} name={post.user.displayName} />
        {post.user.id ? (
          <Link
            href={`/u/${post.user.id}`}
            style={{ fontWeight: 600, textDecoration: "none", color: "inherit" }}
          >
            {post.user.displayName ?? t("post.anon")}
          </Link>
        ) : (
          <div style={{ fontWeight: 600 }}>{post.user.displayName ?? t("post.anon")}</div>
        )}
        {isOwner && (
          <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
            <button
              type="button"
              onClick={() => setEditing((v) => !v)}
              aria-label="Sửa"
              style={{ border: "none", background: "none", cursor: "pointer", fontSize: 16, color: "var(--text-dim)" }}
            >
              ✏️
            </button>
            <button
              type="button"
              onClick={deletePost}
              aria-label="Xoá"
              style={{ border: "none", background: "none", cursor: "pointer", fontSize: 16, color: "var(--text-dim)" }}
            >
              🗑️
            </button>
          </div>
        )}
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

      {editing ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
          <textarea
            className="field"
            rows={3}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            style={{ resize: "vertical" }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="glass-btn glass-btn-primary"
              onClick={saveEdit}
              disabled={savingEdit}
            >
              Lưu
            </button>
            <button
              type="button"
              className="glass-btn"
              onClick={() => {
                setCaption(post.caption ?? "");
                setEditing(false);
              }}
            >
              Huỷ
            </button>
          </div>
        </div>
      ) : (
        caption && <div style={{ marginBottom: 8 }}>{caption}</div>
      )}

      {post.placeId && post.placeName && (
        <Link
          href={`/place/${post.placeId}`}
          style={{ color: "var(--text-dim)", fontSize: 14, textDecoration: "none" }}
        >
          📍 {post.placeName}
        </Link>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 12 }}>
        <button
          type="button"
          onClick={toggleLike}
          disabled={likeBusy}
          aria-pressed={liked}
          style={{
            border: "none",
            background: "none",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 15,
            fontWeight: 600,
            color: liked ? "var(--ink)" : "var(--text-dim)",
            padding: 0,
          }}
        >
          <span style={{ fontSize: 20 }}>{liked ? "❤️" : "🤍"}</span>
          {likeCount > 0 ? likeCount : t("post.like")}
        </button>
        <span className="muted" style={{ fontSize: 14 }}>
          💬 {comments.length}
        </span>
      </div>

      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        {comments.map((c) => (
          <div key={c.id} style={{ display: "flex", gap: 8, fontSize: 14 }}>
            <Avatar url={c.user.avatarUrl} name={c.user.displayName} />
            <div>
              <span style={{ fontWeight: 600 }}>{c.user.displayName ?? t("post.anon")}</span>{" "}
              <span style={{ color: "var(--text-dim)" }}>{c.body}</span>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={submitComment} style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={session?.user ? t("post.comment") : t("post.commentLogin")}
          className="field"
          style={{ borderRadius: 999 }}
        />
        <button type="submit" className="glass-btn glass-btn-primary" disabled={sending}>
          {t("common.send")}
        </button>
      </form>
    </div>
  );
}
