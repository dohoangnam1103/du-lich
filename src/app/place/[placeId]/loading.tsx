import Link from "next/link";

// Shown instantly during navigation while the detail page's server data loads.
function Bar({ w, h = 16 }: { w: string | number; h?: number }) {
  return (
    <div
      className="skeleton"
      style={{ width: w, height: h, borderRadius: 8, margin: "8px 0" }}
    />
  );
}

export default function PlaceDetailLoading() {
  return (
    <main style={{ maxWidth: 520, margin: "0 auto", padding: 16, paddingBottom: 48 }}>
      <Link href="/" style={{ color: "var(--text-dim)" }}>← Quay lại / Back</Link>

      {/* Gallery placeholder */}
      <div
        className="skeleton"
        style={{ height: 220, borderRadius: 22, margin: "12px 0" }}
      />

      {/* Title + meta */}
      <Bar w="70%" h={28} />
      <Bar w="40%" />
      <Bar w="55%" />

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
        <div className="skeleton" style={{ width: 130, height: 40, borderRadius: 999 }} />
        <div className="skeleton" style={{ width: 150, height: 40, borderRadius: 999 }} />
        <div className="skeleton" style={{ width: 110, height: 40, borderRadius: 999 }} />
      </div>

      {/* Description block */}
      <div className="glass glass-edge" style={{ padding: 14, marginTop: 20 }}>
        <Bar w="100%" />
        <Bar w="95%" />
        <Bar w="80%" />
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          color: "var(--text-dim)",
          marginTop: 20,
        }}
      >
        <span className="spinner" />
        Đang tải thông tin địa điểm…
      </div>
    </main>
  );
}
