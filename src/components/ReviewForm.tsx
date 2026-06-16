"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";

export function ReviewForm({ placeId }: { placeId: string }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [media, setMedia] = useState<{ url: string; type: "image" | "video" }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of files) {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: form });
        if (!res.ok) {
          const b = await res.json().catch(() => ({}));
          setError(typeof b.error === "string" ? b.error : "Tải lên thất bại");
          continue;
        }
        const saved = (await res.json()) as { url: string; type: "image" | "video" };
        setMedia((m) => [...m, saved]);
      }
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

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
        body: JSON.stringify({ placeId, rating, body: body.trim() || undefined, media }),
      });
      if (res.ok) {
        setBody("");
        setRating(0);
        setMedia([]);
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
      <label className="glass-btn" style={{ textAlign: "center", cursor: "pointer" }}>
        {uploading ? "Đang tải lên..." : "+ Thêm ảnh"}
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFiles}
          style={{ display: "none" }}
        />
      </label>
      {media.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {media.map((m, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={m.url}
              alt="preview"
              style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 12 }}
            />
          ))}
        </div>
      )}
      {error && <div style={{ color: "#ffb4b4", fontSize: 14 }}>{error}</div>}
      <button type="submit" className="glass-btn" disabled={busy || uploading}>
        {busy ? "Đang gửi..." : "Gửi review"}
      </button>
    </form>
  );
}
