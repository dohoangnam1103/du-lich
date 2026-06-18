// Small in-process TTL cache + single-flight + minimum-interval throttle.
//
// Purpose: the app relies on free, rate-limited external services (Overpass,
// Nominatim, Wikidata, Open-Meteo). Caching repeated queries and throttling
// bursts keeps us within their usage policies and speeds up responses.
//
// Note: this cache lives in the server process memory. On a single instance it
// works well; across serverless instances each has its own copy. For this app's
// scale that is an acceptable trade-off and avoids extra infrastructure.

interface Entry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, Entry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

const MAX_ENTRIES = 500;

function setEntry<T>(key: string, value: T, ttlMs: number) {
  if (store.size >= MAX_ENTRIES) {
    // Drop the oldest inserted key (Map preserves insertion order).
    const oldest = store.keys().next().value;
    if (oldest !== undefined) store.delete(oldest);
  }
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

// Wraps an async producer with caching + single-flight dedup. Concurrent calls
// for the same key share one in-flight promise.
export async function cached<T>(
  key: string,
  ttlMs: number,
  producer: () => Promise<T>,
): Promise<T> {
  const hit = store.get(key);
  if (hit && hit.expiresAt > Date.now()) {
    return hit.value as T;
  }

  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;

  const promise = (async () => {
    try {
      const value = await producer();
      setEntry(key, value, ttlMs);
      return value;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, promise);
  return promise;
}

// Per-key throttle ensuring calls are spaced at least `minIntervalMs` apart.
// Used to respect Nominatim's ~1 request/second policy.
const lastCall = new Map<string, number>();

export async function throttle(key: string, minIntervalMs: number): Promise<void> {
  const now = Date.now();
  const prev = lastCall.get(key) ?? 0;
  const wait = prev + minIntervalMs - now;
  if (wait > 0) {
    await new Promise((r) => setTimeout(r, wait));
  }
  lastCall.set(key, Date.now());
}

// Rounds a coordinate so nearby requests share a cache key (~110m at 3 dp).
export function coarse(value: number, decimals = 3): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}
