// Placeholder card shown while nearby/search results are loading.
export function PlaceCardSkeleton() {
  return (
    <div className="glass glass-edge place-card" style={{ alignItems: "center" }}>
      <div
        className="skeleton"
        style={{ width: 84, height: 84, borderRadius: 16, flex: "0 0 auto" }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="skeleton" style={{ width: "70%", height: 16, borderRadius: 8 }} />
        <div className="skeleton" style={{ width: "90%", height: 13, borderRadius: 8, marginTop: 8 }} />
        <div className="skeleton" style={{ width: 90, height: 20, borderRadius: 999, marginTop: 10 }} />
      </div>
    </div>
  );
}

export function PlaceCardSkeletonList({ count = 5 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <PlaceCardSkeleton key={i} />
      ))}
    </>
  );
}
