"use client";

import { useEffect } from "react";
import { addRecent } from "@/lib/recent";

// Invisible helper: records a place into the "recently viewed" list on mount.
export function RecordView({
  placeId,
  name,
  lat,
  lng,
}: {
  placeId: string;
  name: string;
  lat: number;
  lng: number;
}) {
  useEffect(() => {
    addRecent({ placeId, name, lat, lng });
  }, [placeId, name, lat, lng]);
  return null;
}
