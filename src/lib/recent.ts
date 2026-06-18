// Recently viewed places, persisted in the browser's localStorage.

export interface RecentPlace {
  placeId: string;
  name: string;
  lat: number;
  lng: number;
}

const KEY = "recentPlaces";
const MAX = 12;

export function getRecent(): RecentPlace[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as RecentPlace[]) : [];
  } catch {
    return [];
  }
}

export function addRecent(place: RecentPlace): void {
  if (typeof window === "undefined") return;
  try {
    const current = getRecent().filter((p) => p.placeId !== place.placeId);
    const next = [place, ...current].slice(0, MAX);
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable; ignore */
  }
}
