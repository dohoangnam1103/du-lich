// Multi-stop routing via the public OSRM demo server (free, OSM-based).
// Returns total distance/duration plus the route geometry for drawing on a map.

type FetchImpl = typeof fetch;

const OSRM_URL = "https://router.project-osrm.org/route/v1/driving";
const OSRM_TRIP_URL = "https://router.project-osrm.org/trip/v1/driving";

export interface RoutePoint {
  lat: number;
  lng: number;
}

export interface RouteResult {
  distanceMeters: number;
  durationSeconds: number;
  geometry: [number, number][]; // [lat, lng] pairs
}

interface OsrmResponse {
  code?: string;
  routes?: {
    distance?: number;
    duration?: number;
    geometry?: { coordinates?: [number, number][] };
  }[];
}

export async function getRoute(
  points: RoutePoint[],
  options: { fetchImpl?: FetchImpl } = {},
): Promise<RouteResult | null> {
  const fetchImpl = options.fetchImpl ?? fetch;
  if (points.length < 2) return null;

  // OSRM expects lng,lat order, semicolon-separated.
  const coords = points.map((p) => `${p.lng},${p.lat}`).join(";");
  const url = `${OSRM_URL}/${coords}?overview=full&geometries=geojson`;

  const res = await fetchImpl(url);
  if (!res.ok) {
    throw new Error(`OSRM failed: ${res.status}`);
  }
  const data = (await res.json()) as OsrmResponse;
  const route = data.routes?.[0];
  if (data.code !== "Ok" || !route) return null;

  // GeoJSON coordinates come as [lng, lat]; flip to [lat, lng] for Leaflet.
  const geometry = (route.geometry?.coordinates ?? []).map(
    ([lng, lat]) => [lat, lng] as [number, number],
  );

  return {
    distanceMeters: Math.round(route.distance ?? 0),
    durationSeconds: Math.round(route.duration ?? 0),
    geometry,
  };
}

export interface TripResult extends RouteResult {
  order: number[]; // input indices in optimal visiting order
}

interface OsrmTripResponse {
  code?: string;
  trips?: {
    distance?: number;
    duration?: number;
    geometry?: { coordinates?: [number, number][] };
  }[];
  waypoints?: { waypoint_index?: number }[];
}

// Computes an optimized visiting order (open trip, keeps the first stop fixed)
// using OSRM's Trip service. Returns the ordering plus route geometry/totals.
export async function getTrip(
  points: RoutePoint[],
  options: { fetchImpl?: FetchImpl } = {},
): Promise<TripResult | null> {
  const fetchImpl = options.fetchImpl ?? fetch;
  if (points.length < 2) return null;

  const coords = points.map((p) => `${p.lng},${p.lat}`).join(";");
  const url =
    `${OSRM_TRIP_URL}/${coords}` +
    `?source=first&roundtrip=false&overview=full&geometries=geojson`;

  const res = await fetchImpl(url);
  if (!res.ok) {
    throw new Error(`OSRM trip failed: ${res.status}`);
  }
  const data = (await res.json()) as OsrmTripResponse;
  const trip = data.trips?.[0];
  if (data.code !== "Ok" || !trip || !data.waypoints) return null;

  // waypoints[i].waypoint_index = position of input point i in the trip.
  // Invert it to get the input index for each visiting position.
  const order: number[] = new Array(data.waypoints.length);
  data.waypoints.forEach((w, inputIdx) => {
    if (typeof w.waypoint_index === "number") {
      order[w.waypoint_index] = inputIdx;
    }
  });

  const geometry = (trip.geometry?.coordinates ?? []).map(
    ([lng, lat]) => [lat, lng] as [number, number],
  );

  return {
    distanceMeters: Math.round(trip.distance ?? 0),
    durationSeconds: Math.round(trip.duration ?? 0),
    geometry,
    order: order.filter((i) => i !== undefined),
  };
}
