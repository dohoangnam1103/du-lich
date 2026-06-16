import { haversineMeters } from "@/lib/geo";
import type { Place, PlaceDetail } from "./types";

type FetchImpl = typeof fetch;

interface ClientOptions {
  fetchImpl?: FetchImpl;
  overpassUrl?: string;
}

interface NearbyParams {
  lat: number;
  lng: number;
  radiusMeters: number;
  tagFilters: [string, string][];
  maxResults?: number;
}

const DEFAULT_OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const OVERPASS_USER_AGENT = "dia-diem-du-lich/1.0 (https://dulich.hoangnam.cloud)";
const WIKI_THUMB_SIZE = 800;

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements?: OverpassElement[];
}

function elementCoords(el: OverpassElement): { lat: number; lng: number } {
  const lat = el.lat ?? el.center?.lat ?? 0;
  const lng = el.lon ?? el.center?.lon ?? 0;
  return { lat, lng };
}

function buildAddress(tags: Record<string, string>): string | undefined {
  const parts = [
    tags["addr:housenumber"],
    tags["addr:street"],
    tags["addr:district"],
    tags["addr:city"],
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : undefined;
}

// Parses an OSM `wikipedia` tag (e.g. "vi:Văn Miếu") into { lang, title }.
function parseWikipediaTag(tag: string): { lang: string; title: string } | null {
  const idx = tag.indexOf(":");
  if (idx <= 0) return null;
  const lang = tag.slice(0, idx).trim();
  const title = tag.slice(idx + 1).trim();
  if (!lang || !title) return null;
  return { lang, title };
}

// Fetches Wikipedia thumbnails, batching titles per language (the API accepts
// up to 50 titles joined by "|"). Returns a map keyed by the raw "lang:title".
async function fetchWikipediaImages(
  rawTags: string[],
  fetchImpl: FetchImpl,
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const byLang = new Map<string, Map<string, string>>(); // lang -> (title -> rawTag)

  for (const raw of rawTags) {
    const parsed = parseWikipediaTag(raw);
    if (!parsed) continue;
    let titles = byLang.get(parsed.lang);
    if (!titles) {
      titles = new Map();
      byLang.set(parsed.lang, titles);
    }
    titles.set(parsed.title, raw);
  }

  await Promise.all(
    [...byLang.entries()].map(async ([lang, titleMap]) => {
      const titles = [...titleMap.keys()];
      for (let i = 0; i < titles.length; i += 50) {
        const batch = titles.slice(i, i + 50);
        const url =
          `https://${lang}.wikipedia.org/w/api.php` +
          `?action=query&format=json&origin=*&prop=pageimages` +
          `&pithumbsize=${WIKI_THUMB_SIZE}` +
          `&titles=${encodeURIComponent(batch.join("|"))}`;
        try {
          const res = await fetchImpl(url);
          if (!res.ok) continue;
          const data = (await res.json()) as {
            query?: {
              pages?: Record<
                string,
                { title?: string; thumbnail?: { source?: string } }
              >;
            };
          };
          const pages = data.query?.pages ?? {};
          for (const page of Object.values(pages)) {
            const src = page.thumbnail?.source;
            const title = page.title;
            if (!src || !title) continue;
            const raw = titleMap.get(title);
            if (raw) result.set(raw, src);
          }
        } catch {
          // Wikipedia is best-effort; skip on failure.
        }
      }
    }),
  );

  return result;
}

// Fetches a single article's intro extract + thumbnail + canonical URL.
// Best-effort: returns an empty object on any failure.
async function fetchWikipediaSummary(
  rawTag: string,
  fetchImpl: FetchImpl,
): Promise<{ image?: string; description?: string; wikiUrl?: string }> {
  const parsed = parseWikipediaTag(rawTag);
  if (!parsed) return {};
  const { lang, title } = parsed;
  const url =
    `https://${lang}.wikipedia.org/w/api.php` +
    `?action=query&format=json&origin=*&redirects=1` +
    `&prop=extracts|pageimages|info&inprop=url` +
    `&exintro=1&explaintext=1&exsentences=4` +
    `&pithumbsize=${WIKI_THUMB_SIZE}` +
    `&titles=${encodeURIComponent(title)}`;
  try {
    const res = await fetchImpl(url);
    if (!res.ok) return {};
    const data = (await res.json()) as {
      query?: {
        pages?: Record<
          string,
          {
            extract?: string;
            thumbnail?: { source?: string };
            fullurl?: string;
          }
        >;
      };
    };
    const page = Object.values(data.query?.pages ?? {})[0];
    if (!page) return {};
    const description = page.extract?.trim() || undefined;
    return {
      image: page.thumbnail?.source,
      description,
      wikiUrl: page.fullurl,
    };
  } catch {
    return {};
  }
}

function buildNearbyQuery(params: NearbyParams): string {
  const clauses = params.tagFilters
    .map(
      ([k, v]) =>
        `node["${k}"="${v}"](around:${params.radiusMeters},${params.lat},${params.lng});`,
    )
    .join("\n  ");
  return `[out:json][timeout:25];\n(\n  ${clauses}\n);\nout center ${params.maxResults ?? 50};`;
}

export async function searchNearby(
  params: NearbyParams,
  options: ClientOptions = {},
): Promise<Place[]> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const overpassUrl = options.overpassUrl ?? DEFAULT_OVERPASS_URL;

  const res = await fetchImpl(overpassUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": OVERPASS_USER_AGENT,
    },
    body: `data=${encodeURIComponent(buildNearbyQuery(params))}`,
  });

  if (!res.ok) {
    throw new Error(`Overpass nearby failed: ${res.status}`);
  }

  const data = (await res.json()) as OverpassResponse;
  const elements = (data.elements ?? []).filter((el) => el.tags?.name);

  const places: Place[] = elements.map((el) => {
    const { lat, lng } = elementCoords(el);
    const tags = el.tags ?? {};
    return {
      placeId: `${el.type}/${el.id}`,
      name: tags.name,
      address: buildAddress(tags),
      lat,
      lng,
      distanceMeters: haversineMeters(params.lat, params.lng, lat, lng),
    };
  });

  const wikiTags = elements
    .map((el) => el.tags?.wikipedia)
    .filter((t): t is string => !!t);
  if (wikiTags.length) {
    const images = await fetchWikipediaImages(wikiTags, fetchImpl);
    elements.forEach((el, i) => {
      const tag = el.tags?.wikipedia;
      if (tag) {
        const url = images.get(tag);
        if (url) places[i].imageUrl = url;
      }
    });
  }

  places.sort((a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0));
  return places;
}

function buildDetailQuery(placeId: string): string | null {
  const slash = placeId.indexOf("/");
  if (slash <= 0) return null;
  const type = placeId.slice(0, slash);
  const id = placeId.slice(slash + 1);
  if (!/^(node|way|relation)$/.test(type) || !/^\d+$/.test(id)) return null;
  return `[out:json][timeout:25];\n${type}(${id});\nout center 1;`;
}

export async function getPlaceDetail(
  placeId: string,
  options: ClientOptions = {},
): Promise<PlaceDetail> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const overpassUrl = options.overpassUrl ?? DEFAULT_OVERPASS_URL;

  const query = buildDetailQuery(placeId);
  if (!query) {
    throw new Error(`Invalid placeId: ${placeId}`);
  }

  const res = await fetchImpl(overpassUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": OVERPASS_USER_AGENT,
    },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!res.ok) {
    throw new Error(`Overpass detail failed: ${res.status}`);
  }

  const data = (await res.json()) as OverpassResponse;
  const el = (data.elements ?? [])[0];
  if (!el) {
    throw new Error(`Place not found: ${placeId}`);
  }

  const { lat, lng } = elementCoords(el);
  const tags = el.tags ?? {};

  const imageUrls: string[] = [];
  let description: string | undefined;
  let wikiUrl: string | undefined;
  if (tags.wikipedia) {
    const summary = await fetchWikipediaSummary(tags.wikipedia, fetchImpl);
    if (summary.image) imageUrls.push(summary.image);
    description = summary.description;
    wikiUrl = summary.wikiUrl;
  }

  return {
    placeId: `${el.type}/${el.id}`,
    name: tags.name ?? "(không tên)",
    address: buildAddress(tags),
    lat,
    lng,
    imageUrl: imageUrls[0],
    imageUrls,
    description,
    wikiUrl,
  };
}
