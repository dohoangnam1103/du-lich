"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/I18nProvider";

type UploadedMedia = { url: string; type: string };

export function NewPostForm() {
  const router = useRouter();
  const t = useT();
  const [media, setMedia] = useState<UploadedMedia[]>([]);
  const [caption, setCaption] = useState("");
  const [placeName, setPlaceName] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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
          const body = await res.json().catch(() => ({}));
          setError(body.error ?? "Tải lên thất bại");
          continue;
        }
        const saved = (await res.json()) as UploadedMedia;
        setMedia((m) => [...m, saved]);
      }
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function attachLocation() {
    if (!navigator.geolocation) {
      setError("Trình duyệt không hỗ trợ định vị");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setError("Không lấy được vị trí"),
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (caption.trim().length === 0 && media.length === 0) {
      setError("Cần caption hoặc ít nhất một ảnh/video");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption,
          media,
          placeName: placeName.trim() || undefined,
          lat: coords?.lat,
          lng: coords?.lng,
        }),
      });
      if (res.ok) {
        router.push("/feed");
        return;
      }
      const body = await res.json().catch(() => ({}));
      setError(typeof body.error === "string" ? body.error : "Đăng bài thất bại");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="glass glass-edge" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      <label className="glass-btn" style={{ textAlign: "center", cursor: "pointer" }}>
        {uploading ? t("review.uploading") : t("newpost.addMedia")}
        <input
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={handleFiles}
          style={{ display: "none" }}
        />
      </label>

      {media.length > 0 && (
        <div style={{ display: "grid", gap: 8 }}>
          {media.map((m, i) =>
            m.type === "video" ? (
              <video key={i} src={m.url} controls style={{ width: "100%", borderRadius: 16, background: "#000" }} />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={m.url} alt="preview" style={{ width: "100%", borderRadius: 16, display: "block" }} />
            ),
          )}
        </div>
      )}

      <textarea
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder={t("newpost.caption")}
        rows={3}
        className="field"
        style={{ resize: "vertical" }}
      />

      <input
        value={placeName}
        onChange={(e) => setPlaceName(e.target.value)}
        placeholder={t("newpost.placeName")}
        className="field"
        style={{ borderRadius: 999 }}
      />

      <button type="button" className="glass-btn" onClick={attachLocation}>
        {coords ? `📍 ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : t("newpost.attachLocation")}
      </button>

      {error && <div style={{ color: "#e0466e", fontSize: 14, fontWeight: 600 }}>{error}</div>}

      <button type="submit" className="glass-btn glass-btn-primary" disabled={submitting || uploading}>
        {submitting ? t("newpost.publishing") : t("newpost.publish")}
      </button>
    </form>
  );
}
