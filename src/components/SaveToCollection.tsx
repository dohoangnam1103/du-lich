"use client";

import { useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { useT } from "@/components/I18nProvider";

type CollectionSummary = { id: string; name: string };

export function SaveToCollection({
  placeId,
  placeName,
  lat,
  lng,
}: {
  placeId: string;
  placeName: string;
  lat: number;
  lng: number;
}) {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const t = useT();

  async function openPicker() {
    if (!session?.user) {
      signIn("google");
      return;
    }
    setOpen((v) => !v);
    if (!loaded) {
      const res = await fetch("/api/collections");
      if (res.ok) {
        const body = await res.json();
        setCollections(body.collections ?? []);
      }
      setLoaded(true);
    }
  }

  async function addTo(collectionId: string) {
    const res = await fetch(`/api/collections/${collectionId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ placeId, placeName, lat, lng }),
    });
    setStatus(res.ok ? t("place.addedToTrip") : t("place.addFailed"));
    setTimeout(() => setStatus(null), 2000);
    setOpen(false);
  }

  async function createAndAdd(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    const res = await fetch("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      const { id } = await res.json();
      setNewName("");
      await addTo(id);
    }
  }

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button type="button" className="glass-btn" onClick={openPicker}>
        {t("place.addToTrip")}
      </button>

      {status && (
        <span className="muted" style={{ marginLeft: 8, fontSize: 13 }}>{status}</span>
      )}

      {open && (
        <div
          className="glass glass-edge"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            zIndex: 40,
            padding: 8,
            minWidth: 240,
          }}
        >
          {collections.length === 0 && (
            <p className="muted" style={{ fontSize: 13, padding: "4px 8px" }}>
              {t("place.noTripYet")}
            </p>
          )}
          {collections.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => addTo(c.id)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                border: "none",
                background: "none",
                cursor: "pointer",
                padding: "9px 10px",
                borderRadius: 10,
                color: "var(--text)",
                fontSize: 14,
              }}
            >
              {c.name}
            </button>
          ))}
          <form onSubmit={createAndAdd} style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <input
              className="field"
              value={newName}
              placeholder={t("place.newTrip")}
              onChange={(e) => setNewName(e.target.value)}
              style={{ padding: "7px 10px" }}
            />
            <button type="submit" className="glass-btn glass-btn-primary" style={{ padding: "7px 12px" }}>
              +
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
