# Plan 1 — Foundation + Discovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the core "discovery" MVP — a Next.js web app that uses phone GPS to find nearby food/leisure places via Google Places, filtered by vehicle radius and category, sorted near→far, with a place-detail screen.

**Architecture:** Next.js (App Router) full-stack. Browser gets GPS coords and sends them to Next.js API routes. API routes hold the Google API key (server-only) and call Google Places (Nearby Search + Place Details), then return results to the client. Postgres (self-hosted via Docker) + Drizzle ORM are set up now but only lightly used in Plan 1 (schema + connection); the social tables get exercised in Plan 2. Media is local filesystem.

**Tech Stack:** Next.js 15 (App Router, TypeScript), Drizzle ORM, Postgres 16 (Docker), Vitest for tests, Google Places API (New) via REST from the server.

---

## File Structure

Files created in this plan and their single responsibility:

- `package.json`, `tsconfig.json`, `next.config.ts`, `.env.local`, `.env.example` — project config + secrets.
- `docker-compose.yml` — local Postgres for development.
- `drizzle.config.ts` — Drizzle migration config.
- `src/db/schema.ts` — full Postgres schema (all tables; Plan 2 uses the social ones).
- `src/db/index.ts` — Drizzle client (Postgres connection).
- `src/lib/vehicle.ts` — pure mapping `vehicle → radius (meters)`. No I/O. Easy to unit-test.
- `src/lib/geo.ts` — pure haversine distance helper. No I/O.
- `src/lib/places/types.ts` — TypeScript types for normalized place results.
- `src/lib/places/client.ts` — Google Places API wrapper (server-only). Takes `fetch` injectable for tests.
- `src/app/api/places/nearby/route.ts` — `GET /api/places/nearby` handler.
- `src/app/api/places/[placeId]/route.ts` — `GET /api/places/[placeId]` handler.
- `src/app/page.tsx` — Discovery screen (client component): GPS, vehicle toggle, category chips, list.
- `src/app/place/[placeId]/page.tsx` — Place detail screen.
- `src/components/` — UI pieces: `VehicleToggle.tsx`, `CategoryChips.tsx`, `PlaceCard.tsx`, `GlassPanel.tsx`.
- `src/app/globals.css` — base styles + glassmorphism utility classes.
- Test files under `src/**/__tests__/` or co-located `*.test.ts`.

---

## Task 1: Initialize Next.js project + TypeScript + Vitest

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `.gitignore`
- Create: `src/app/layout.tsx`, `src/app/page.tsx` (placeholder)

- [ ] **Step 1: Scaffold the Next.js app**

Run in the project root (`/Users/namdo/Documents/learning/dia_diem_du_lich`):

```bash
npx create-next-app@latest . --typescript --app --eslint --src-dir --no-tailwind --import-alias "@/*" --use-npm
```

When prompted about the non-empty directory (because of `docs/` and `.superpowers/`), choose to continue. Accept defaults for Turbopack.

- [ ] **Step 2: Add Vitest + testing deps**

Run:

```bash
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```

- [ ] **Step 3: Create `vitest.config.ts`**

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

- [ ] **Step 4: Create `vitest.setup.ts`**

```typescript
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 5: Add test script to `package.json`**

In the `"scripts"` block, add:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 6: Add a trivial passing test to verify the harness**

Create `src/lib/__tests__/smoke.test.ts`:

```typescript
import { describe, it, expect } from "vitest";

describe("vitest harness", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 7: Run the test**

Run: `npm test`
Expected: 1 passed.

- [ ] **Step 8: Ensure `.gitignore` ignores secrets + brainstorm dir**

Confirm `.gitignore` contains these lines (add any missing):

```
.env.local
.env*.local
.superpowers/
/node_modules
/.next
```

- [ ] **Step 9: Commit**

```bash
git init
git add -A
git commit -m "chore: scaffold Next.js app with Vitest"
```

---

## Task 2: Local Postgres via Docker + Drizzle connection

**Files:**
- Create: `docker-compose.yml`, `drizzle.config.ts`, `.env.example`, `.env.local`
- Create: `src/db/index.ts`

- [ ] **Step 1: Create `docker-compose.yml`**

```yaml
services:
  db:
    image: postgres:16
    restart: unless-stopped
    environment:
      POSTGRES_USER: ddl
      POSTGRES_PASSWORD: ddl_dev_pw
      POSTGRES_DB: dia_diem
    ports:
      - "5432:5432"
    volumes:
      - ddl_pgdata:/var/lib/postgresql/data

volumes:
  ddl_pgdata:
```

- [ ] **Step 2: Create `.env.example`**

```
DATABASE_URL=postgres://ddl:ddl_dev_pw@localhost:5432/dia_diem
GOOGLE_MAPS_API_KEY=replace_me
```

- [ ] **Step 3: Create `.env.local` (real values, git-ignored)**

```
DATABASE_URL=postgres://ddl:ddl_dev_pw@localhost:5432/dia_diem
GOOGLE_MAPS_API_KEY=replace_me
```

The user must replace `GOOGLE_MAPS_API_KEY` with a real key from Google Cloud Console (enable "Places API (New)").

- [ ] **Step 4: Install Drizzle + Postgres driver**

```bash
npm install drizzle-orm postgres
npm install -D drizzle-kit
```

- [ ] **Step 5: Create `drizzle.config.ts`**

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

- [ ] **Step 6: Create `src/db/index.ts`**

```typescript
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

const client = postgres(connectionString);
export const db = drizzle(client, { schema });
```

- [ ] **Step 7: Start the database**

```bash
docker compose up -d
```

Expected: container `db` running. Verify with `docker compose ps`.

- [ ] **Step 8: Commit**

```bash
git add docker-compose.yml drizzle.config.ts .env.example src/db/index.ts
git commit -m "feat: add Docker Postgres and Drizzle connection"
```

---

## Task 3: Database schema (all tables)

**Files:**
- Create: `src/db/schema.ts`

Defines every table from the spec now so Plan 2 needs no migration churn. Plan 1 only reads/writes none of these directly yet — this task is schema + migration only.

- [ ] **Step 1: Write `src/db/schema.ts`**

```typescript
import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  doublePrecision,
  primaryKey,
  unique,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  googleId: text("google_id").notNull().unique(),
  displayName: text("display_name").notNull(),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const posts = pgTable("posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  placeId: text("place_id"),
  placeName: text("place_name"),
  caption: text("caption"),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const postMedia = pgTable("post_media", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id")
    .notNull()
    .references(() => posts.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  type: text("type").notNull(), // 'image' | 'video'
  position: integer("position").notNull().default(0),
});

export const comments = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id")
    .notNull()
    .references(() => posts.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    placeId: text("place_id").notNull(),
    rating: integer("rating").notNull(), // 1..5
    body: text("body"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniqUserPlace: unique().on(t.userId, t.placeId),
  }),
);

export const favorites = pgTable(
  "favorites",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    placeId: text("place_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.placeId] }),
  }),
);
```

- [ ] **Step 2: Add migration scripts to `package.json`**

In `"scripts"`:

```json
"db:generate": "drizzle-kit generate",
"db:migrate": "drizzle-kit migrate"
```

- [ ] **Step 3: Generate the migration**

Run: `npm run db:generate`
Expected: a new SQL file appears under `drizzle/`.

- [ ] **Step 4: Apply the migration**

Run: `npm run db:migrate`
Expected: tables created. Verify with:

```bash
docker compose exec db psql -U ddl -d dia_diem -c "\dt"
```

Expected: lists `users`, `posts`, `post_media`, `comments`, `reviews`, `favorites`.

- [ ] **Step 5: Commit**

```bash
git add src/db/schema.ts drizzle/ package.json
git commit -m "feat: add full database schema and initial migration"
```

---

## Task 4: Vehicle → radius mapping (pure function, TDD)

**Files:**
- Create: `src/lib/vehicle.ts`
- Test: `src/lib/__tests__/vehicle.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from "vitest";
import { radiusForVehicle, VEHICLES, type Vehicle } from "@/lib/vehicle";

describe("radiusForVehicle", () => {
  it("maps walk to 1000m", () => {
    expect(radiusForVehicle("walk")).toBe(1000);
  });
  it("maps motorbike to 5000m", () => {
    expect(radiusForVehicle("motorbike")).toBe(5000);
  });
  it("maps car to 15000m", () => {
    expect(radiusForVehicle("car")).toBe(15000);
  });
  it("falls back to motorbike radius for unknown values", () => {
    expect(radiusForVehicle("rocket" as Vehicle)).toBe(5000);
  });
  it("exposes the list of supported vehicles", () => {
    expect(VEHICLES).toEqual(["walk", "motorbike", "car"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/vehicle.test.ts`
Expected: FAIL — cannot find module `@/lib/vehicle`.

- [ ] **Step 3: Write minimal implementation**

```typescript
export const VEHICLES = ["walk", "motorbike", "car"] as const;
export type Vehicle = (typeof VEHICLES)[number];

const RADIUS_METERS: Record<Vehicle, number> = {
  walk: 1000,
  motorbike: 5000,
  car: 15000,
};

export function radiusForVehicle(vehicle: Vehicle): number {
  return RADIUS_METERS[vehicle] ?? RADIUS_METERS.motorbike;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/vehicle.test.ts`
Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/vehicle.ts src/lib/__tests__/vehicle.test.ts
git commit -m "feat: add vehicle-to-radius mapping"
```

---

## Task 5: Haversine distance helper (pure function, TDD)

**Files:**
- Create: `src/lib/geo.ts`
- Test: `src/lib/__tests__/geo.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from "vitest";
import { haversineMeters } from "@/lib/geo";

describe("haversineMeters", () => {
  it("returns 0 for identical points", () => {
    expect(haversineMeters(10.78, 106.69, 10.78, 106.69)).toBe(0);
  });
  it("computes a known distance within 1% tolerance", () => {
    // Ben Thanh Market -> Independence Palace ~ 1.5km
    const d = haversineMeters(10.7721, 106.698, 10.7773, 106.6953);
    expect(d).toBeGreaterThan(550);
    expect(d).toBeLessThan(750);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/geo.test.ts`
Expected: FAIL — cannot find module `@/lib/geo`.

- [ ] **Step 3: Write minimal implementation**

```typescript
const EARTH_RADIUS_M = 6_371_000;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(EARTH_RADIUS_M * c);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/geo.test.ts`
Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/geo.ts src/lib/__tests__/geo.test.ts
git commit -m "feat: add haversine distance helper"
```

---

## Task 6: Place result types + category mapping

**Files:**
- Create: `src/lib/places/types.ts`
- Test: `src/lib/places/__tests__/category.test.ts`

The category chips (Ăn uống / Cà phê / Vui chơi / Tham quan) map to Google Places "included types".

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from "vitest";
import { CATEGORIES, googleTypesForCategory, type Category } from "@/lib/places/types";

describe("googleTypesForCategory", () => {
  it("maps food to restaurant-ish types", () => {
    expect(googleTypesForCategory("food")).toContain("restaurant");
  });
  it("maps cafe to cafe", () => {
    expect(googleTypesForCategory("cafe")).toContain("cafe");
  });
  it("maps fun to entertainment types", () => {
    expect(googleTypesForCategory("fun")).toContain("amusement_park");
  });
  it("maps sightseeing to tourist_attraction", () => {
    expect(googleTypesForCategory("sightseeing")).toContain("tourist_attraction");
  });
  it("lists all four categories", () => {
    expect(CATEGORIES).toEqual(["food", "cafe", "fun", "sightseeing"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/places/__tests__/category.test.ts`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write `src/lib/places/types.ts`**

```typescript
export const CATEGORIES = ["food", "cafe", "fun", "sightseeing"] as const;
export type Category = (typeof CATEGORIES)[number];

const CATEGORY_TYPES: Record<Category, string[]> = {
  food: ["restaurant", "meal_takeaway"],
  cafe: ["cafe", "coffee_shop"],
  fun: ["amusement_park", "tourist_attraction", "park"],
  sightseeing: ["tourist_attraction", "museum", "park"],
};

export function googleTypesForCategory(category: Category): string[] {
  return CATEGORY_TYPES[category] ?? CATEGORY_TYPES.food;
}

export interface Place {
  placeId: string;
  name: string;
  lat: number;
  lng: number;
  address?: string;
  rating?: number;
  userRatingCount?: number;
  distanceMeters?: number;
  photoName?: string; // Google photo resource name (for fetching photo via API)
}

export interface PlaceReview {
  authorName: string;
  authorUri?: string;
  rating: number;
  text?: string;
  relativeTime?: string;
}

export interface PlaceDetail extends Place {
  reviews: PlaceReview[];
  photoNames: string[];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/places/__tests__/category.test.ts`
Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/places/types.ts src/lib/places/__tests__/category.test.ts
git commit -m "feat: add place types and category-to-Google-types mapping"
```

---

## Task 7: Google Places client — Nearby Search (TDD with injected fetch)

**Files:**
- Create: `src/lib/places/client.ts`
- Test: `src/lib/places/__tests__/client.nearby.test.ts`

Uses Places API (New) `searchNearby` (POST `https://places.googleapis.com/v1/places:searchNearby`). `fetch` is injected so tests don't hit the network.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi } from "vitest";
import { searchNearby } from "@/lib/places/client";

function fakeFetch(jsonBody: unknown) {
  return vi.fn(async () =>
    new Response(JSON.stringify(jsonBody), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
  );
}

const sampleResponse = {
  places: [
    {
      id: "place_a",
      displayName: { text: "Quán A" },
      formattedAddress: "1 Đường A",
      location: { latitude: 10.78, longitude: 106.69 },
      rating: 4.5,
      userRatingCount: 120,
      photos: [{ name: "places/place_a/photos/xyz" }],
    },
  ],
};

describe("searchNearby", () => {
  it("normalizes Google response into Place[] and computes distance", async () => {
    const fetchImpl = fakeFetch(sampleResponse);
    const places = await searchNearby(
      { lat: 10.78, lng: 106.69, radiusMeters: 5000, includedTypes: ["restaurant"] },
      { apiKey: "k", fetchImpl },
    );
    expect(places).toHaveLength(1);
    expect(places[0]).toMatchObject({
      placeId: "place_a",
      name: "Quán A",
      rating: 4.5,
      userRatingCount: 120,
      photoName: "places/place_a/photos/xyz",
    });
    expect(places[0].distanceMeters).toBe(0);
  });

  it("sorts results near to far", async () => {
    const far = {
      places: [
        {
          id: "far",
          displayName: { text: "Far" },
          location: { latitude: 10.9, longitude: 106.9 },
        },
        {
          id: "near",
          displayName: { text: "Near" },
          location: { latitude: 10.781, longitude: 106.691 },
        },
      ],
    };
    const places = await searchNearby(
      { lat: 10.78, lng: 106.69, radiusMeters: 50000, includedTypes: ["restaurant"] },
      { apiKey: "k", fetchImpl: fakeFetch(far) },
    );
    expect(places.map((p) => p.placeId)).toEqual(["near", "far"]);
  });

  it("sends apiKey and field mask in headers", async () => {
    const fetchImpl = fakeFetch(sampleResponse);
    await searchNearby(
      { lat: 10.78, lng: 106.69, radiusMeters: 5000, includedTypes: ["restaurant"] },
      { apiKey: "secret", fetchImpl },
    );
    const [, init] = fetchImpl.mock.calls[0];
    const headers = init.headers as Record<string, string>;
    expect(headers["X-Goog-Api-Key"]).toBe("secret");
    expect(headers["X-Goog-FieldMask"]).toContain("places.id");
  });

  it("throws on non-ok response", async () => {
    const fetchImpl = vi.fn(async () => new Response("nope", { status: 403 }));
    await expect(
      searchNearby(
        { lat: 1, lng: 1, radiusMeters: 1000, includedTypes: ["restaurant"] },
        { apiKey: "k", fetchImpl },
      ),
    ).rejects.toThrow(/places api/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/places/__tests__/client.nearby.test.ts`
Expected: FAIL — cannot find module `@/lib/places/client`.

- [ ] **Step 3: Write `src/lib/places/client.ts` (nearby portion)**

```typescript
import { haversineMeters } from "@/lib/geo";
import type { Place } from "./types";

type FetchImpl = typeof fetch;

interface ClientOptions {
  apiKey: string;
  fetchImpl?: FetchImpl;
}

interface NearbyParams {
  lat: number;
  lng: number;
  radiusMeters: number;
  includedTypes: string[];
  maxResults?: number;
}

const NEARBY_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.rating",
  "places.userRatingCount",
  "places.photos",
].join(",");

interface GooglePlace {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  rating?: number;
  userRatingCount?: number;
  photos?: { name: string }[];
}

export async function searchNearby(
  params: NearbyParams,
  options: ClientOptions,
): Promise<Place[]> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const res = await fetchImpl("https://places.googleapis.com/v1/places:searchNearby", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": options.apiKey,
      "X-Goog-FieldMask": NEARBY_FIELD_MASK,
    },
    body: JSON.stringify({
      includedTypes: params.includedTypes,
      maxResultCount: params.maxResults ?? 20,
      locationRestriction: {
        circle: {
          center: { latitude: params.lat, longitude: params.lng },
          radius: params.radiusMeters,
        },
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Places API nearby failed: ${res.status}`);
  }

  const data = (await res.json()) as { places?: GooglePlace[] };
  const places: Place[] = (data.places ?? []).map((p) => {
    const lat = p.location?.latitude ?? 0;
    const lng = p.location?.longitude ?? 0;
    return {
      placeId: p.id,
      name: p.displayName?.text ?? "(không tên)",
      address: p.formattedAddress,
      lat,
      lng,
      rating: p.rating,
      userRatingCount: p.userRatingCount,
      photoName: p.photos?.[0]?.name,
      distanceMeters: haversineMeters(params.lat, params.lng, lat, lng),
    };
  });

  places.sort((a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0));
  return places;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/places/__tests__/client.nearby.test.ts`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/places/client.ts src/lib/places/__tests__/client.nearby.test.ts
git commit -m "feat: add Google Places nearby search client"
```

---

## Task 8: Google Places client — Place Details (TDD with injected fetch)

**Files:**
- Modify: `src/lib/places/client.ts` (add `getPlaceDetail`)
- Test: `src/lib/places/__tests__/client.detail.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi } from "vitest";
import { getPlaceDetail } from "@/lib/places/client";

const detailResponse = {
  id: "place_a",
  displayName: { text: "Quán A" },
  formattedAddress: "1 Đường A",
  location: { latitude: 10.78, longitude: 106.69 },
  rating: 4.5,
  userRatingCount: 120,
  photos: [{ name: "places/place_a/photos/p1" }, { name: "places/place_a/photos/p2" }],
  reviews: [
    {
      authorAttribution: { displayName: "Nguyễn A", uri: "https://maps.google.com/x" },
      rating: 5,
      text: { text: "Ngon!" },
      relativePublishTimeDescription: "2 tuần trước",
    },
  ],
};

function fakeFetch(body: unknown, status = 200) {
  return vi.fn(async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    }),
  );
}

describe("getPlaceDetail", () => {
  it("normalizes detail with reviews and photoNames", async () => {
    const detail = await getPlaceDetail("place_a", {
      apiKey: "k",
      fetchImpl: fakeFetch(detailResponse),
    });
    expect(detail.placeId).toBe("place_a");
    expect(detail.name).toBe("Quán A");
    expect(detail.photoNames).toEqual([
      "places/place_a/photos/p1",
      "places/place_a/photos/p2",
    ]);
    expect(detail.reviews).toHaveLength(1);
    expect(detail.reviews[0]).toMatchObject({
      authorName: "Nguyễn A",
      authorUri: "https://maps.google.com/x",
      rating: 5,
      text: "Ngon!",
      relativeTime: "2 tuần trước",
    });
  });

  it("calls the place-specific endpoint with the id", async () => {
    const fetchImpl = fakeFetch(detailResponse);
    await getPlaceDetail("place_a", { apiKey: "k", fetchImpl });
    const [url] = fetchImpl.mock.calls[0];
    expect(String(url)).toBe("https://places.googleapis.com/v1/places/place_a");
  });

  it("throws on non-ok", async () => {
    await expect(
      getPlaceDetail("x", { apiKey: "k", fetchImpl: fakeFetch("no", 404) }),
    ).rejects.toThrow(/places api/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/places/__tests__/client.detail.test.ts`
Expected: FAIL — `getPlaceDetail` is not exported.

- [ ] **Step 3: Add `getPlaceDetail` to `src/lib/places/client.ts`**

Append to the file (and reuse the existing `ClientOptions`, `FetchImpl`, `GooglePlace` types — add the missing review fields to `GooglePlace`):

```typescript
import type { PlaceDetail, PlaceReview } from "./types";

const DETAIL_FIELD_MASK = [
  "id",
  "displayName",
  "formattedAddress",
  "location",
  "rating",
  "userRatingCount",
  "photos",
  "reviews",
].join(",");

interface GoogleReview {
  authorAttribution?: { displayName?: string; uri?: string };
  rating?: number;
  text?: { text?: string };
  relativePublishTimeDescription?: string;
}

export async function getPlaceDetail(
  placeId: string,
  options: ClientOptions,
): Promise<PlaceDetail> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const res = await fetchImpl(`https://places.googleapis.com/v1/places/${placeId}`, {
    method: "GET",
    headers: {
      "X-Goog-Api-Key": options.apiKey,
      "X-Goog-FieldMask": DETAIL_FIELD_MASK,
    },
  });

  if (!res.ok) {
    throw new Error(`Places API detail failed: ${res.status}`);
  }

  const p = (await res.json()) as GooglePlace & { reviews?: GoogleReview[] };
  const reviews: PlaceReview[] = (p.reviews ?? []).map((r) => ({
    authorName: r.authorAttribution?.displayName ?? "Ẩn danh",
    authorUri: r.authorAttribution?.uri,
    rating: r.rating ?? 0,
    text: r.text?.text,
    relativeTime: r.relativePublishTimeDescription,
  }));

  const lat = p.location?.latitude ?? 0;
  const lng = p.location?.longitude ?? 0;
  return {
    placeId: p.id,
    name: p.displayName?.text ?? "(không tên)",
    address: p.formattedAddress,
    lat,
    lng,
    rating: p.rating,
    userRatingCount: p.userRatingCount,
    photoName: p.photos?.[0]?.name,
    photoNames: (p.photos ?? []).map((ph) => ph.name),
    reviews,
  };
}
```

Note: ensure the `GooglePlace` interface from Task 7 stays compatible (it already has `photos`, `location`, etc.). The `reviews` field is added inline via the intersection type above so no edit to `GooglePlace` is needed.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/places/__tests__/client.detail.test.ts`
Expected: 3 passed.

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/places/client.ts src/lib/places/__tests__/client.detail.test.ts
git commit -m "feat: add Google Places detail client"
```

---

## Task 9: Nearby API route

**Files:**
- Create: `src/app/api/places/nearby/route.ts`
- Test: `src/app/api/places/nearby/__tests__/route.test.ts`

The route validates query params, maps vehicle→radius and category→types, then calls `searchNearby`. To keep it testable, the route imports `searchNearby` and we mock that module.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/places/client", () => ({
  searchNearby: vi.fn(),
}));

import { GET } from "@/app/api/places/nearby/route";
import { searchNearby } from "@/lib/places/client";

const mockedSearch = vi.mocked(searchNearby);

function makeRequest(qs: string) {
  return new Request(`http://localhost/api/places/nearby?${qs}`);
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.GOOGLE_MAPS_API_KEY = "test-key";
});

describe("GET /api/places/nearby", () => {
  it("400s when lat/lng missing", async () => {
    const res = await GET(makeRequest("vehicle=walk&category=food"));
    expect(res.status).toBe(400);
  });

  it("400s on invalid vehicle", async () => {
    const res = await GET(makeRequest("lat=10&lng=106&vehicle=plane&category=food"));
    expect(res.status).toBe(400);
  });

  it("calls searchNearby with mapped radius + types and returns places", async () => {
    mockedSearch.mockResolvedValue([
      { placeId: "p1", name: "A", lat: 10, lng: 106, distanceMeters: 100 },
    ]);
    const res = await GET(makeRequest("lat=10&lng=106&vehicle=motorbike&category=cafe"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.places).toHaveLength(1);
    const arg = mockedSearch.mock.calls[0][0];
    expect(arg.radiusMeters).toBe(5000);
    expect(arg.includedTypes).toContain("cafe");
  });

  it("500s when the client throws", async () => {
    mockedSearch.mockRejectedValue(new Error("boom"));
    const res = await GET(makeRequest("lat=10&lng=106&vehicle=walk&category=food"));
    expect(res.status).toBe(500);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/api/places/nearby/__tests__/route.test.ts`
Expected: FAIL — cannot find module the route.

- [ ] **Step 3: Write `src/app/api/places/nearby/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { searchNearby } from "@/lib/places/client";
import { radiusForVehicle, VEHICLES, type Vehicle } from "@/lib/vehicle";
import {
  googleTypesForCategory,
  CATEGORIES,
  type Category,
} from "@/lib/places/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const vehicle = searchParams.get("vehicle") as Vehicle;
  const category = (searchParams.get("category") ?? "food") as Category;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat/lng required" }, { status: 400 });
  }
  if (!VEHICLES.includes(vehicle)) {
    return NextResponse.json({ error: "invalid vehicle" }, { status: 400 });
  }
  if (!CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "invalid category" }, { status: 400 });
  }

  try {
    const places = await searchNearby(
      {
        lat,
        lng,
        radiusMeters: radiusForVehicle(vehicle),
        includedTypes: googleTypesForCategory(category),
      },
      { apiKey: process.env.GOOGLE_MAPS_API_KEY! },
    );
    return NextResponse.json({ places });
  } catch {
    return NextResponse.json({ error: "places lookup failed" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/api/places/nearby/__tests__/route.test.ts`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/places/nearby/route.ts src/app/api/places/nearby/__tests__/route.test.ts
git commit -m "feat: add nearby places API route"
```

---

## Task 10: Place detail API route (Google detail + user content placeholder)

**Files:**
- Create: `src/app/api/places/[placeId]/route.ts`
- Test: `src/app/api/places/[placeId]/__tests__/route.test.ts`

Plan 1 returns Google detail plus an empty `userPosts: []` and `userReviews: []` (wired to real DB queries in Plan 2). This keeps the response shape stable across plans.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/places/client", () => ({
  getPlaceDetail: vi.fn(),
}));

import { GET } from "@/app/api/places/[placeId]/route";
import { getPlaceDetail } from "@/lib/places/client";

const mockedDetail = vi.mocked(getPlaceDetail);

beforeEach(() => {
  vi.clearAllMocks();
  process.env.GOOGLE_MAPS_API_KEY = "test-key";
});

function ctx(placeId: string) {
  return { params: Promise.resolve({ placeId }) };
}

describe("GET /api/places/[placeId]", () => {
  it("returns google detail plus empty user content", async () => {
    mockedDetail.mockResolvedValue({
      placeId: "p1",
      name: "A",
      lat: 10,
      lng: 106,
      reviews: [],
      photoNames: [],
    });
    const res = await GET(new Request("http://localhost/api/places/p1"), ctx("p1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.place.placeId).toBe("p1");
    expect(body.userPosts).toEqual([]);
    expect(body.userReviews).toEqual([]);
  });

  it("500s when the client throws", async () => {
    mockedDetail.mockRejectedValue(new Error("boom"));
    const res = await GET(new Request("http://localhost/api/places/p1"), ctx("p1"));
    expect(res.status).toBe(500);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run "src/app/api/places/[placeId]/__tests__/route.test.ts"`
Expected: FAIL — cannot find module the route.

- [ ] **Step 3: Write `src/app/api/places/[placeId]/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { getPlaceDetail } from "@/lib/places/client";

export async function GET(
  _request: Request,
  context: { params: Promise<{ placeId: string }> },
) {
  const { placeId } = await context.params;
  try {
    const place = await getPlaceDetail(placeId, {
      apiKey: process.env.GOOGLE_MAPS_API_KEY!,
    });
    // Plan 2 fills these from Postgres (posts + reviews for this place_id).
    return NextResponse.json({ place, userPosts: [], userReviews: [] });
  } catch {
    return NextResponse.json({ error: "place detail failed" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run "src/app/api/places/[placeId]/__tests__/route.test.ts"`
Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add "src/app/api/places/[placeId]/route.ts" "src/app/api/places/[placeId]/__tests__/route.test.ts"
git commit -m "feat: add place detail API route"
```

---

## Task 11: Photo proxy route (serve Google photos without exposing key)

**Files:**
- Create: `src/app/api/places/photo/route.ts`

Google photo media is fetched via `https://places.googleapis.com/v1/{photoName}/media?key=...&maxWidthPx=...`. The browser must not see the key, so the server proxies the redirect. Per ToS we do not store the bytes — we redirect/stream live each request.

- [ ] **Step 1: Write `src/app/api/places/photo/route.ts`**

```typescript
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name"); // e.g. places/xxx/photos/yyy
  const maxWidth = searchParams.get("w") ?? "800";

  if (!name) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }

  const url =
    `https://places.googleapis.com/v1/${name}/media` +
    `?maxWidthPx=${encodeURIComponent(maxWidth)}` +
    `&key=${process.env.GOOGLE_MAPS_API_KEY}`;

  const upstream = await fetch(url);
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: "photo failed" }, { status: 502 });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "image/jpeg",
      // Short cache only; do not persist per Google ToS.
      "Cache-Control": "private, max-age=300",
    },
  });
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/places/photo/route.ts
git commit -m "feat: add server-side Google photo proxy"
```

---

## Task 12: Glassmorphism base styles + GlassPanel component

**Files:**
- Modify: `src/app/globals.css`
- Create: `src/components/GlassPanel.tsx`
- Test: `src/components/__tests__/GlassPanel.test.tsx`

- [ ] **Step 1: Replace `src/app/globals.css` with base + glass utilities**

```css
:root {
  --bg-grad-1: #1b2a4a;
  --bg-grad-2: #3a1c5e;
  --glass-bg: rgba(255, 255, 255, 0.12);
  --glass-border: rgba(255, 255, 255, 0.35);
  --glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.35);
  --text: #f5f7ff;
  --text-dim: rgba(245, 247, 255, 0.7);
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  min-height: 100vh;
  background: linear-gradient(160deg, var(--bg-grad-1), var(--bg-grad-2));
  background-attachment: fixed;
}

.glass {
  background: var(--glass-bg);
  backdrop-filter: blur(18px) saturate(140%);
  -webkit-backdrop-filter: blur(18px) saturate(140%);
  border: 1px solid var(--glass-border);
  border-radius: 22px;
  box-shadow: var(--glass-shadow);
}

.glass-edge {
  position: relative;
  overflow: hidden;
}

.glass-edge::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.7),
    rgba(255, 255, 255, 0) 40%,
    rgba(255, 255, 255, 0) 60%,
    rgba(255, 255, 255, 0.3)
  );
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}
```

- [ ] **Step 2: Write the failing test**

```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { GlassPanel } from "@/components/GlassPanel";

describe("GlassPanel", () => {
  it("renders children inside a glass container", () => {
    render(<GlassPanel>hello</GlassPanel>);
    const el = screen.getByText("hello");
    expect(el.className).toContain("glass");
  });

  it("merges extra className", () => {
    render(<GlassPanel className="extra">x</GlassPanel>);
    expect(screen.getByText("x").className).toContain("extra");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/components/__tests__/GlassPanel.test.tsx`
Expected: FAIL — cannot find module.

- [ ] **Step 4: Write `src/components/GlassPanel.tsx`**

```typescript
import type { ReactNode } from "react";

export function GlassPanel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`glass glass-edge ${className}`}>{children}</div>;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/__tests__/GlassPanel.test.tsx`
Expected: 2 passed.

- [ ] **Step 6: Commit**

```bash
git add src/app/globals.css src/components/GlassPanel.tsx src/components/__tests__/GlassPanel.test.tsx
git commit -m "feat: add glassmorphism base styles and GlassPanel"
```

---

## Task 13: VehicleToggle + CategoryChips components

**Files:**
- Create: `src/components/VehicleToggle.tsx`
- Create: `src/components/CategoryChips.tsx`
- Test: `src/components/__tests__/VehicleToggle.test.tsx`
- Test: `src/components/__tests__/CategoryChips.test.tsx`

- [ ] **Step 1: Write the failing VehicleToggle test**

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { VehicleToggle } from "@/components/VehicleToggle";

describe("VehicleToggle", () => {
  it("renders three vehicle buttons and marks the active one", () => {
    render(<VehicleToggle value="motorbike" onChange={() => {}} />);
    const active = screen.getByRole("button", { name: /xe máy/i });
    expect(active.getAttribute("aria-pressed")).toBe("true");
  });

  it("calls onChange with the chosen vehicle", () => {
    const onChange = vi.fn();
    render(<VehicleToggle value="walk" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /ô tô/i }));
    expect(onChange).toHaveBeenCalledWith("car");
  });
});
```

- [ ] **Step 2: Run it (fails)**

Run: `npx vitest run src/components/__tests__/VehicleToggle.test.tsx`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write `src/components/VehicleToggle.tsx`**

```typescript
"use client";

import type { Vehicle } from "@/lib/vehicle";

const ITEMS: { value: Vehicle; label: string; icon: string }[] = [
  { value: "walk", label: "Đi bộ", icon: "🚶" },
  { value: "motorbike", label: "Xe máy", icon: "🛵" },
  { value: "car", label: "Ô tô", icon: "🚗" },
];

export function VehicleToggle({
  value,
  onChange,
}: {
  value: Vehicle;
  onChange: (v: Vehicle) => void;
}) {
  return (
    <div className="glass glass-edge" style={{ display: "flex", gap: 4, padding: 4 }}>
      {ITEMS.map((it) => {
        const active = it.value === value;
        return (
          <button
            key={it.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(it.value)}
            style={{
              flex: 1,
              border: "none",
              cursor: "pointer",
              borderRadius: 16,
              padding: "10px 8px",
              color: "var(--text)",
              background: active ? "rgba(255,255,255,0.25)" : "transparent",
              fontSize: 14,
            }}
          >
            <span style={{ fontSize: 18 }}>{it.icon}</span> {it.label}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Run it (passes)**

Run: `npx vitest run src/components/__tests__/VehicleToggle.test.tsx`
Expected: 2 passed.

- [ ] **Step 5: Write the failing CategoryChips test**

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CategoryChips } from "@/components/CategoryChips";

describe("CategoryChips", () => {
  it("renders all four category chips", () => {
    render(<CategoryChips value="food" onChange={() => {}} />);
    expect(screen.getByRole("button", { name: /ăn uống/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cà phê/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /vui chơi/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /tham quan/i })).toBeInTheDocument();
  });

  it("calls onChange with category key", () => {
    const onChange = vi.fn();
    render(<CategoryChips value="food" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /cà phê/i }));
    expect(onChange).toHaveBeenCalledWith("cafe");
  });
});
```

- [ ] **Step 6: Run it (fails)**

Run: `npx vitest run src/components/__tests__/CategoryChips.test.tsx`
Expected: FAIL — cannot find module.

- [ ] **Step 7: Write `src/components/CategoryChips.tsx`**

```typescript
"use client";

import type { Category } from "@/lib/places/types";

const ITEMS: { value: Category; label: string }[] = [
  { value: "food", label: "Ăn uống" },
  { value: "cafe", label: "Cà phê" },
  { value: "fun", label: "Vui chơi" },
  { value: "sightseeing", label: "Tham quan" },
];

export function CategoryChips({
  value,
  onChange,
}: {
  value: Category;
  onChange: (c: Category) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "4px 0" }}>
      {ITEMS.map((it) => {
        const active = it.value === value;
        return (
          <button
            key={it.value}
            type="button"
            onClick={() => onChange(it.value)}
            className="glass-edge"
            style={{
              flex: "0 0 auto",
              border: "1px solid var(--glass-border)",
              cursor: "pointer",
              borderRadius: 999,
              padding: "8px 16px",
              color: "var(--text)",
              background: active ? "rgba(255,255,255,0.3)" : "var(--glass-bg)",
              backdropFilter: "blur(12px)",
              fontSize: 14,
            }}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 8: Run it (passes)**

Run: `npx vitest run src/components/__tests__/CategoryChips.test.tsx`
Expected: 2 passed.

- [ ] **Step 9: Commit**

```bash
git add src/components/VehicleToggle.tsx src/components/CategoryChips.tsx src/components/__tests__/VehicleToggle.test.tsx src/components/__tests__/CategoryChips.test.tsx
git commit -m "feat: add VehicleToggle and CategoryChips"
```

---

## Task 14: PlaceCard component

**Files:**
- Create: `src/components/PlaceCard.tsx`
- Test: `src/components/__tests__/PlaceCard.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PlaceCard } from "@/components/PlaceCard";

const place = {
  placeId: "p1",
  name: "Quán Ngon",
  lat: 10,
  lng: 106,
  rating: 4.3,
  userRatingCount: 88,
  distanceMeters: 1234,
};

describe("PlaceCard", () => {
  it("shows name, rating and human distance", () => {
    render(<PlaceCard place={place} />);
    expect(screen.getByText("Quán Ngon")).toBeInTheDocument();
    expect(screen.getByText(/4.3/)).toBeInTheDocument();
    expect(screen.getByText(/1.2 km/)).toBeInTheDocument();
  });

  it("shows meters when under 1km", () => {
    render(<PlaceCard place={{ ...place, distanceMeters: 450 }} />);
    expect(screen.getByText(/450 m/)).toBeInTheDocument();
  });

  it("links to the detail page", () => {
    render(<PlaceCard place={place} />);
    expect(screen.getByRole("link").getAttribute("href")).toBe("/place/p1");
  });
});
```

- [ ] **Step 2: Run it (fails)**

Run: `npx vitest run src/components/__tests__/PlaceCard.test.tsx`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write `src/components/PlaceCard.tsx`**

```typescript
import Link from "next/link";
import type { Place } from "@/lib/places/types";

function formatDistance(m?: number): string {
  if (m == null) return "";
  if (m < 1000) return `${m} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

export function PlaceCard({ place }: { place: Place }) {
  const photoSrc = place.photoName
    ? `/api/places/photo?name=${encodeURIComponent(place.photoName)}&w=400`
    : null;

  return (
    <Link href={`/place/${place.placeId}`} style={{ textDecoration: "none", color: "inherit" }}>
      <div className="glass glass-edge" style={{ display: "flex", gap: 12, padding: 12, marginBottom: 12 }}>
        <div
          style={{
            width: 84,
            height: 84,
            borderRadius: 16,
            flex: "0 0 auto",
            background: photoSrc ? `center/cover url(${photoSrc})` : "rgba(255,255,255,0.15)",
          }}
        />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 16 }}>{place.name}</div>
          <div style={{ color: "var(--text-dim)", fontSize: 13, marginTop: 2 }}>
            {place.address}
          </div>
          <div style={{ marginTop: 6, fontSize: 13, display: "flex", gap: 12 }}>
            {place.rating != null && (
              <span>⭐ {place.rating} ({place.userRatingCount ?? 0})</span>
            )}
            <span>📍 {formatDistance(place.distanceMeters)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
```

- [ ] **Step 4: Run it (passes)**

Run: `npx vitest run src/components/__tests__/PlaceCard.test.tsx`
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add src/components/PlaceCard.tsx src/components/__tests__/PlaceCard.test.tsx
git commit -m "feat: add PlaceCard component"
```

---

## Task 15: Discovery screen (home page, client component)

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/layout.tsx` (set title/lang)

This wires GPS + the toggle/chips + fetch to `/api/places/nearby` + list of `PlaceCard`. No unit test (it's I/O + browser geolocation); it gets manually verified in Task 16.

- [ ] **Step 1: Set `src/app/layout.tsx`**

```typescript
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Địa Điểm Du Lịch",
  description: "Tìm quán ăn & chỗ vui chơi quanh đây",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 2: Write `src/app/page.tsx`**

```typescript
"use client";

import { useEffect, useState, useCallback } from "react";
import { VehicleToggle } from "@/components/VehicleToggle";
import { CategoryChips } from "@/components/CategoryChips";
import { PlaceCard } from "@/components/PlaceCard";
import type { Vehicle } from "@/lib/vehicle";
import type { Category, Place } from "@/lib/places/types";

type Coords = { lat: number; lng: number };

export default function Home() {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle>("motorbike");
  const [category, setCategory] = useState<Category>("food");
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setGeoError("Trình duyệt không hỗ trợ định vị.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setGeoError("Cần cho phép quyền vị trí để tìm địa điểm quanh đây."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  const load = useCallback(async () => {
    if (!coords) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        lat: String(coords.lat),
        lng: String(coords.lng),
        vehicle,
        category,
      });
      const res = await fetch(`/api/places/nearby?${qs}`);
      const body = await res.json();
      setPlaces(body.places ?? []);
    } finally {
      setLoading(false);
    }
  }, [coords, vehicle, category]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <main style={{ maxWidth: 520, margin: "0 auto", padding: 16, paddingBottom: 48 }}>
      <h1 style={{ fontSize: 22, margin: "8px 0 16px" }}>Quanh đây</h1>

      <div style={{ marginBottom: 12 }}>
        <VehicleToggle value={vehicle} onChange={setVehicle} />
      </div>
      <div style={{ marginBottom: 16 }}>
        <CategoryChips value={category} onChange={setCategory} />
      </div>

      {geoError && (
        <div className="glass glass-edge" style={{ padding: 16, marginBottom: 16 }}>
          {geoError}
        </div>
      )}

      {loading && <p style={{ color: "var(--text-dim)" }}>Đang tìm…</p>}

      {!loading && coords && places.length === 0 && (
        <p style={{ color: "var(--text-dim)" }}>Không tìm thấy địa điểm nào trong bán kính.</p>
      )}

      {places.map((p) => (
        <PlaceCard key={p.placeId} place={p} />
      ))}
    </main>
  );
}
```

- [ ] **Step 3: Typecheck + full test suite**

Run: `npx tsc --noEmit && npm test`
Expected: no type errors, all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx src/app/layout.tsx
git commit -m "feat: add discovery home screen with GPS + nearby search"
```

---

## Task 16: Place detail screen

**Files:**
- Create: `src/app/place/[placeId]/page.tsx`

Server component that fetches the detail route and renders Google info + reviews (with attribution) + a placeholder section for community posts (filled in Plan 2).

- [ ] **Step 1: Write `src/app/place/[placeId]/page.tsx`**

```typescript
import Link from "next/link";
import { headers } from "next/headers";
import type { PlaceDetail } from "@/lib/places/types";

async function fetchDetail(placeId: string): Promise<PlaceDetail | null> {
  const h = await headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  const res = await fetch(`${proto}://${host}/api/places/${placeId}`, {
    cache: "no-store",
  });
  if (!res.ok) return null;
  const body = await res.json();
  return body.place as PlaceDetail;
}

export default async function PlaceDetailPage({
  params,
}: {
  params: Promise<{ placeId: string }>;
}) {
  const { placeId } = await params;
  const place = await fetchDetail(placeId);

  if (!place) {
    return (
      <main style={{ maxWidth: 520, margin: "0 auto", padding: 16 }}>
        <Link href="/">← Quay lại</Link>
        <p style={{ marginTop: 24 }}>Không tải được thông tin địa điểm.</p>
      </main>
    );
  }

  const hero = place.photoNames[0]
    ? `/api/places/photo?name=${encodeURIComponent(place.photoNames[0])}&w=800`
    : null;

  return (
    <main style={{ maxWidth: 520, margin: "0 auto", padding: 16, paddingBottom: 48 }}>
      <Link href="/" style={{ color: "var(--text-dim)" }}>← Quay lại</Link>

      {hero && (
        <div
          style={{
            height: 220,
            borderRadius: 22,
            margin: "12px 0",
            background: `center/cover url(${hero})`,
          }}
        />
      )}

      <h1 style={{ fontSize: 24, margin: "8px 0" }}>{place.name}</h1>
      {place.address && <p style={{ color: "var(--text-dim)" }}>{place.address}</p>}
      {place.rating != null && (
        <p>⭐ {place.rating} · {place.userRatingCount ?? 0} đánh giá (Google)</p>
      )}

      <section style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 18 }}>Đánh giá từ Google</h2>
        {place.reviews.length === 0 && (
          <p style={{ color: "var(--text-dim)" }}>Chưa có đánh giá.</p>
        )}
        {place.reviews.map((r, i) => (
          <div key={i} className="glass glass-edge" style={{ padding: 14, marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong>
                {r.authorUri ? (
                  <a href={r.authorUri} target="_blank" rel="noreferrer" style={{ color: "var(--text)" }}>
                    {r.authorName}
                  </a>
                ) : (
                  r.authorName
                )}
              </strong>
              <span>⭐ {r.rating}</span>
            </div>
            {r.relativeTime && (
              <div style={{ color: "var(--text-dim)", fontSize: 12 }}>{r.relativeTime}</div>
            )}
            {r.text && <p style={{ marginTop: 6 }}>{r.text}</p>}
          </div>
        ))}
        <p style={{ color: "var(--text-dim)", fontSize: 12, marginTop: 12 }}>
          Đánh giá &amp; ảnh được cung cấp bởi Google.
        </p>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 18 }}>Bài đăng cộng đồng</h2>
        <p style={{ color: "var(--text-dim)" }}>Sắp có (Plan 2).</p>
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "src/app/place/[placeId]/page.tsx"
git commit -m "feat: add place detail screen with Google reviews"
```

---

## Task 17: Manual verification (real GPS + Google API)

**Files:** none (manual QA).

- [ ] **Step 1: Confirm prerequisites**

- `.env.local` has a real `GOOGLE_MAPS_API_KEY` (Places API New enabled, billing on).
- `docker compose ps` shows the db running.

- [ ] **Step 2: Start the dev server**

Run: `npm run dev`
Open `http://localhost:3000` on a phone on the same network (or use browser devtools geolocation override on desktop, since `navigator.geolocation` over plain `http://<lan-ip>` is blocked on real phones).

> Note: Mobile browsers require HTTPS (or `localhost`) for geolocation. For real-phone testing use one of: Chrome devtools device emulation with a mocked location, a tunneling tool that gives HTTPS, or test the geolocation path on desktop `localhost`. Document whichever you used.

- [ ] **Step 3: Verify the golden path**

- Allow location → list of nearby places loads, sorted near→far.
- Switch vehicle walk→car → radius widens, more/farther results appear.
- Switch category chips → result set changes (cafe vs food vs fun vs sightseeing).
- Tap a card → detail page loads with photo, rating, and up to ~5 Google reviews with author attribution.

- [ ] **Step 4: Verify edge cases**

- Deny location permission → friendly message shows, no crash.
- A place with no photo → placeholder block renders (no broken image).
- A place with no rating → card omits the rating line cleanly.

- [ ] **Step 5: Record the result**

Note in the commit/PR description what was tested and on which environment (real phone vs desktop emulation). If geolocation could only be verified via desktop emulation, say so explicitly.

- [ ] **Step 6: Final commit (if any tweaks were needed)**

```bash
git add -A
git commit -m "chore: discovery MVP verified end-to-end"
```

---

## Done criteria for Plan 1

- `npm test` green; `npx tsc --noEmit` clean.
- Home screen finds nearby places by GPS, filtered by vehicle radius + category, sorted near→far.
- Detail screen shows Google info/photos/reviews with attribution; key never reaches the client.
- DB + full schema provisioned and migrated, ready for Plan 2 (social).
