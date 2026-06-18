// Free geocoding via OpenStreetMap Nominatim. Used to search a place/area by
// name (e.g. "Đà Lạt") so users can explore somewhere other than their GPS
// location, and as a fallback when geolocation is denied.

type FetchImpl = typeof fetch;

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "dia-diem-du-lich/1.0 (https://dulich.hoangnam.cloud)";

export interface GeoResult {
  name: string;
  lat: number;
  lng: number;
}

interface NominatimItem {
  display_name?: string;
  lat?: string;
  lon?: string;
}

export async function geocode(
  query: string,
  options: { fetchImpl?: FetchImpl; limit?: number } = {},
): Promise<GeoResult[]> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const q = query.trim();
  if (!q) return [];

  const url =
    `${NOMINATIM_URL}?format=jsonv2&addressdetails=0` +
    `&limit=${options.limit ?? 5}&accept-language=vi` +
    `&q=${encodeURIComponent(q)}`;

  const res = await fetchImpl(url, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!res.ok) {
    throw new Error(`Nominatim failed: ${res.status}`);
  }

  const data = (await res.json()) as NominatimItem[];
  const results: GeoResult[] = [];
  for (const item of data) {
    const lat = Number(item.lat);
    const lng = Number(item.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    results.push({
      name: item.display_name ?? q,
      lat,
      lng,
    });
  }
  return results;
}
