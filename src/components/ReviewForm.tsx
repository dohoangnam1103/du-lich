"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";

export function ReviewForm({ placeId }: { placeId: string }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!session?.user) {
      signIn("google");
      return;
    }
    if (rating < 1) {
      setError("Chọn số sao (1–5)");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeId, rating, body: body.trim() || undefined }),
      });
      if (res.ok) {
        setBody("");
        setRating(0);
        router.refresh();
        return;
      }
      const b = await res.json().catch(() => ({}));
      setError(typeof b.error === "string" ? b.error : "Gửi review thất bại");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="glass glass-edge" style={{ padding: 14, marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", gap: 4 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 24,
              padding: 0,
              opacity: n <= rating ? 1 : 0.4,
            }}
            aria-label={`${n} sao`}
          >
            ⭐
          </button>
        ))}
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Cảm nhận của bạn (tùy chọn)"
        rows={3}
        style={{
          padding: "10px 12px",
          borderRadius: 16,
          border: "1px solid var(--glass-border)",
          background: "rgba(255,255,255,0.1)",
          color: "var(--text)",
          resize: "vertical",
        }}
      />
      {error && <div style={{ color: "#ffb4b4", fontSize: 14 }}>{error}</div>}
      <button type="submit" className="glass-btn" disabled={busy}>
        {busy ? "Đang gửi..." : "Gửi review"}
      </button>
    </form>
  );
}
