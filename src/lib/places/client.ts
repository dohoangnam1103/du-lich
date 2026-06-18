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

// Builds a Wikimedia Commons image URL from a raw file name (P18 / image tag).
function commonsFileUrl(fileName: string, width = WIKI_THUMB_SIZE): string {
  return (
    `https://commons.wikimedia.org/wiki/Special:FilePath/` +
    `${encodeURIComponent(fileName.replace(/^File:/i, ""))}?width=${width}`
  );
}

interface WikidataEntity {
  claims?: Record<string, { mainsnak?: { datavalue?: { value?: unknown } } }[]>;
  sitelinks?: Record<string, { title?: string }>;
}

function wikidataClaimString(entity: WikidataEntity, prop: string): string | undefined {
  const value = entity.claims?.[prop]?.[0]?.mainsnak?.datavalue?.value;
  return typeof value === "string" ? value : undefined;
}

// Picks a Wikipedia sitelink (Vietnamese first, then English) and returns it as
// a raw "lang:title" tag compatible with the Wikipedia helpers above.
function wikidataWikipediaTag(entity: WikidataEntity): string | undefined {
  const vi = entity.sitelinks?.viwiki?.title;
  if (vi) return `vi:${vi}`;
  const en = entity.sitelinks?.enwiki?.title;
  if (en) return `en:${en}`;
  return undefined;
}

// Fetches Wikidata entities by QID (batched, up to 50 per request) and returns
// the image (P18) per QID. Best-effort: skips on any failure.
async function fetchWikidataImages(
  qids: string[],
  fetchImpl: FetchImpl,
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const unique = [...new Set(qids)];
  for (let i = 0; i < unique.length; i += 50) {
    const batch = unique.slice(i, i + 50);
    const url =
      `https://www.wikidata.org/w/api.php` +
      `?action=wbgetentities&format=json&origin=*&props=claims` +
      `&ids=${encodeURIComponent(batch.join("|"))}`;
    try {
      const res = await fetchImpl(url);
      if (!res.ok) continue;
      const data = (await res.json()) as {
        entities?: Record<string, WikidataEntity>;
      };
      for (const [qid, entity] of Object.entries(data.entities ?? {})) {
        const file = wikidataClaimString(entity, "P18");
        if (file) result.set(qid, commonsFileUrl(file));
      }
    } catch {
      // Wikidata is best-effort; skip on failure.
    }
  }
  return result;
}

// Resolves a single Wikidata entity into an image, official website and a
// Wikipedia "lang:title" tag (for fetching a description). Best-effort.
async function fetchWikidataInfo(
  qid: string,
  fetchImpl: FetchImpl,
): Promise<{ image?: string; website?: string; wikipediaTag?: string }> {
  const url =
    `https://www.wikidata.org/w/api.php` +
    `?action=wbgetentities&format=json&origin=*&props=claims|sitelinks` +
    `&ids=${encodeURIComponent(qid)}`;
  try {
    const res = await fetchImpl(url);
    if (!res.ok) return {};
    const data = (await res.json()) as {
      entities?: Record<string, WikidataEntity>;
    };
    const entity = data.entities?.[qid];
    if (!entity) return {};
    const file = wikidataClaimString(entity, "P18");
    return {
      image: file ? commonsFileUrl(file) : undefined,
      website: wikidataClaimString(entity, "P856"),
      wikipediaTag: wikidataWikipediaTag(entity),
    };
  } catch {
    return {};
  }
}

// Reads the extra OSM contact/attribute tags shared by list and detail views.
function buildContactFields(tags: Record<string, string>): {
  phone?: string;
  website?: string;
  openingHours?: string;
  cuisine?: string;
  facebook?: string;
} {
  const phone = tags.phone || tags["contact:phone"] || tags["contact:mobile"];
  const website = tags.website || tags["contact:website"] || tags.url;
  const facebook = tags["contact:facebook"] || tags.facebook;
  return {
    phone: phone || undefined,
    website: website || undefined,
    openingHours: tags.opening_hours || undefined,
    cuisine: tags.cuisine || undefined,
    facebook: facebook || undefined,
  };
}

// Returns a usable image URL from direct OSM tags (image / wikimedia_commons).
function osmTagImage(tags: Record<string, string>): string | undefined {
  if (tags.image && /^https?:\/\//i.test(tags.image)) return tags.image;
  const commons = tags.wikimedia_commons;
  if (commons && /^File:/i.test(commons)) return commonsFileUrl(commons);
  return undefined;
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
      openingHours: tags.opening_hours || undefined,
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

  // Fallback 1: direct OSM image / wikimedia_commons tags.
  elements.forEach((el, i) => {
    if (!places[i].imageUrl) {
      const img = osmTagImage(el.tags ?? {});
      if (img) places[i].imageUrl = img;
    }
  });

  // Fallback 2: Wikidata image (P18) for POIs still without a thumbnail. Many
  // VN places carry a `wikidata` tag even when they lack a `wikipedia` one.
  const wikidataIndex = elements
    .map((el, i) => ({ qid: el.tags?.wikidata, i }))
    .filter((e): e is { qid: string; i: number } => !!e.qid && !places[e.i].imageUrl);
  if (wikidataIndex.length) {
    const images = await fetchWikidataImages(
      wikidataIndex.map((e) => e.qid),
      fetchImpl,
    );
    for (const { qid, i } of wikidataIndex) {
      const url = images.get(qid);
      if (url) places[i].imageUrl = url;
    }
  }

  places.sort((a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0));
  return places;
}

// Enriches places (in place) with thumbnails from Wikipedia, then direct OSM
// image tags, then Wikidata images. `elements` must align by index with
// `places`. Shared by searchNearby and searchByName.
async function enrichPlaceImages(
  places: Place[],
  elements: OverpassElement[],
  fetchImpl: FetchImpl,
): Promise<void> {
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

  elements.forEach((el, i) => {
    if (!places[i].imageUrl) {
      const img = osmTagImage(el.tags ?? {});
      if (img) places[i].imageUrl = img;
    }
  });

  const wikidataIndex = elements
    .map((el, i) => ({ qid: el.tags?.wikidata, i }))
    .filter((e): e is { qid: string; i: number } => !!e.qid && !places[e.i].imageUrl);
  if (wikidataIndex.length) {
    const images = await fetchWikidataImages(
      wikidataIndex.map((e) => e.qid),
      fetchImpl,
    );
    for (const { qid, i } of wikidataIndex) {
      const url = images.get(qid);
      if (url) places[i].imageUrl = url;
    }
  }
}

interface NameSearchParams {
  query: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  maxResults?: number;
}

// Escapes a user string for safe inclusion inside an Overpass regex literal.
function sanitizeOverpassRegex(q: string): string {
  return q.replace(/[\\"]/g, "").replace(/[.*+?^${}()|[\]]/g, "\\$&").trim();
}

function buildNameQuery(params: NameSearchParams): string {
  const q = sanitizeOverpassRegex(params.query);
  const { radiusMeters, lat, lng } = params;
  return (
    `[out:json][timeout:25];\n(\n` +
    `  nwr["name"~"${q}",i](around:${radiusMeters},${lat},${lng});\n` +
    `);\nout center ${params.maxResults ?? 40};`
  );
}

// Searches POIs by name within a radius (e.g. "Highlands", "Phở Hòa").
export async function searchByName(
  params: NameSearchParams,
  options: ClientOptions = {},
): Promise<Place[]> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const overpassUrl = options.overpassUrl ?? DEFAULT_OVERPASS_URL;
  if (sanitizeOverpassRegex(params.query).length < 2) return [];

  const res = await fetchImpl(overpassUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": OVERPASS_USER_AGENT,
    },
    body: `data=${encodeURIComponent(buildNameQuery(params))}`,
  });
  if (!res.ok) {
    throw new Error(`Overpass name search failed: ${res.status}`);
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
      openingHours: tags.opening_hours || undefined,
    };
  });

  await enrichPlaceImages(places, elements, fetchImpl);
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
  const contact = buildContactFields(tags);

  const imageUrls: string[] = [];
  let description: string | undefined;
  let wikiUrl: string | undefined;
  let website = contact.website;

  if (tags.wikipedia) {
    // Primary source: the OSM wikipedia tag.
    const summary = await fetchWikipediaSummary(tags.wikipedia, fetchImpl);
    if (summary.image) imageUrls.push(summary.image);
    description = summary.description;
    wikiUrl = summary.wikiUrl;
  } else if (tags.wikidata) {
    // Fallback: resolve via Wikidata (image P18, official site P856, and a
    // Wikipedia sitelink to pull a description from).
    const info = await fetchWikidataInfo(tags.wikidata, fetchImpl);
    if (info.image) imageUrls.push(info.image);
    if (!website && info.website) website = info.website;
    if (info.wikipediaTag) {
      const summary = await fetchWikipediaSummary(info.wikipediaTag, fetchImpl);
      if (summary.image && !imageUrls.includes(summary.image)) {
        imageUrls.push(summary.image);
      }
      description = summary.description;
      wikiUrl = summary.wikiUrl;
    }
  }

  // Last-resort image: direct OSM image / wikimedia_commons tags.
  if (imageUrls.length === 0) {
    const img = osmTagImage(tags);
    if (img) imageUrls.push(img);
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
    phone: contact.phone,
    website,
    openingHours: contact.openingHours,
    cuisine: contact.cuisine,
    facebook: contact.facebook,
  };
}
