"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PostCard, type FeedPost } from "@/components/PostCard";
import { useT } from "@/components/I18nProvider";

export default function FeedPage() {
  const t = useT();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"all" | "following">("all");
  const sentinel = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (cursor) params.set("cursor", cursor);
      if (mode === "following") params.set("following", "1");
      const qs = params.toString();
      const res = await fetch(`/api/posts${qs ? `?${qs}` : ""}`);
      if (!res.ok) {
        setHasMore(false);
        return;
      }
      const data: { posts: FeedPost[]; nextCursor: string | null } = await res.json();
      setPosts((prev) => [...prev, ...data.posts]);
      setCursor(data.nextCursor);
      if (!data.nextCursor) setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [cursor, hasMore, loading, mode]);

  // Reload from scratch when switching tabs.
  useEffect(() => {
    setPosts([]);
    setCursor(null);
    setHasMore(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useEffect(() => {
    if (posts.length === 0 && hasMore && !loading) loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, posts.length]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "200px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMore]);

  return (
    <main style={{ maxWidth: 600, margin: "0 auto", padding: 16 }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 16 }}>{t("feed.title")}</h1>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button
          type="button"
          className={`chip${mode === "all" ? " is-active" : ""}`}
          aria-pressed={mode === "all"}
          onClick={() => setMode("all")}
        >
          {t("feed.all")}
        </button>
        <button
          type="button"
          className={`chip${mode === "following" ? " is-active" : ""}`}
          aria-pressed={mode === "following"}
          onClick={() => setMode("following")}
        >
          {t("feed.following")}
        </button>
      </div>
      {posts.map((p) => (
        <PostCard key={p.id} post={p} />
      ))}
      {posts.length === 0 && !loading && (
        <div style={{ color: "var(--text-dim)", textAlign: "center", marginTop: 40 }}>
          {mode === "following" ? t("feed.emptyFollowing") : t("feed.emptyAll")}
        </div>
      )}
      <div ref={sentinel} style={{ height: 1 }} />
      {loading && (
        <div style={{ textAlign: "center", color: "var(--text-dim)", padding: 16 }}>
          {t("common.loading")}
        </div>
      )}
    </main>
  );
}
