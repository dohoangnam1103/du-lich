"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PostCard, type FeedPost } from "@/components/PostCard";

export default function FeedPage() {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const url = cursor
        ? `/api/posts?cursor=${encodeURIComponent(cursor)}`
        : "/api/posts";
      const res = await fetch(url);
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
  }, [cursor, hasMore, loading]);

  useEffect(() => {
    loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      <h1 style={{ fontSize: 22, marginBottom: 16 }}>Bảng tin</h1>
      {posts.map((p) => (
        <PostCard key={p.id} post={p} />
      ))}
      {posts.length === 0 && !loading && (
        <div style={{ color: "var(--text-dim)", textAlign: "center", marginTop: 40 }}>
          Chưa có bài viết nào. Hãy là người đầu tiên chia sẻ!
        </div>
      )}
      <div ref={sentinel} style={{ height: 1 }} />
      {loading && (
        <div style={{ textAlign: "center", color: "var(--text-dim)", padding: 16 }}>
          Đang tải...
        </div>
      )}
    </main>
  );
}
