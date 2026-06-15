# Plan 2 — Social Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Prerequisite:** Plan 1 (Foundation + Discovery) is complete. DB, full schema (`users`, `posts`, `post_media`, `comments`, `reviews`, `favorites`), Drizzle client (`src/db/index.ts`), and the discovery/detail screens already exist.

**Goal:** Add the social layer (part B): Google OAuth login, posting photos/videos with a location, comments, place reviews (1..5 stars), favorites, and a community feed. Browse stays free; only write actions require login.

**Architecture:** Next.js (App Router) full-stack, self-hosted on a mini PC. Auth via NextAuth.js (Auth.js v5) with Google provider, sessions in Postgres via the Drizzle adapter. User media uploads land on the **local filesystem** (`./uploads`, git-ignored) and are served back through a Next.js route. All write API routes check the session server-side.

**Tech Stack (additions to Plan 1):** NextAuth.js v5 (`next-auth@beta`) + `@auth/drizzle-adapter`, `zod` for input validation, Node `fs/promises` for local media storage.

---

## File Structure

Files created or modified in this plan and their single responsibility:

- `src/db/schema.ts` — **modify**: add NextAuth adapter tables (`accounts`, `sessions`, `verification_tokens`). Existing social tables stay as-is.
- `src/auth.ts` — NextAuth config (Google provider, Drizzle adapter, session callback exposing `user.id`).
- `src/app/api/auth/[...nextauth]/route.ts` — NextAuth route handlers (GET/POST).
- `src/lib/session.ts` — `requireUser()` helper for write routes (throws 401 if no session).
- `src/lib/validation.ts` — zod schemas for post/comment/review/favorite payloads.
- `src/lib/upload.ts` — save an uploaded file to `./uploads`, return its public URL. Validates mime + size.
- `src/app/api/upload/route.ts` — `POST /api/upload` (multipart) → stores media, returns `{ url, type }`.
- `src/app/uploads/[...path]/route.ts` — serves files from `./uploads` (streamed, with content-type).
- `src/app/api/posts/route.ts` — `GET` (feed, paginated) + `POST` (create post, login required).
- `src/app/api/posts/[postId]/route.ts` — `GET` single post with media + comments.
- `src/app/api/posts/[postId]/comments/route.ts` — `POST` comment (login required).
- `src/app/api/reviews/route.ts` — `POST`/`PUT` upsert review for a place (login required).
- `src/app/api/places/[placeId]/route.ts` — **modify**: also return user posts + user reviews for that place.
- `src/app/api/favorites/route.ts` — `POST` add favorite (login required).
- `src/app/api/favorites/[placeId]/route.ts` — `DELETE` remove favorite (login required).
- `src/components/AuthButton.tsx` — sign in / sign out with Google.
- `src/components/SessionProvider.tsx` — client wrapper around NextAuth `SessionProvider`.
- `src/components/PostCard.tsx` — one feed item (media carousel + caption + place + comment box).
- `src/components/NewPostForm.tsx` — create-post form (media picker, caption, current-location capture).
- `src/components/ReviewForm.tsx` — star rating + body, used on the place-detail screen.
- `src/components/FavoriteButton.tsx` — toggle favorite on the place-detail screen.
- `src/app/feed/page.tsx` — feed screen (infinite-scroll list of `PostCard`).
- `src/app/post/new/page.tsx` — create-post screen.
- `src/app/place/[placeId]/page.tsx` — **modify**: wire in `FavoriteButton`, `ReviewForm`, and the community posts list.
- `src/app/layout.tsx` — **modify**: wrap children in `SessionProvider`, add `AuthButton` to the header.
- Test files co-located as `*.test.ts` / in `__tests__/`.

---

## Task 1: Add NextAuth + Drizzle adapter tables

**Files:**
- Modify: `src/db/schema.ts`
- Install: `next-auth@beta`, `@auth/drizzle-adapter`

- [ ] **Step 1: Install auth dependencies**

```bash
npm install next-auth@beta @auth/drizzle-adapter zod
```

- [ ] **Step 2: Add adapter tables to `src/db/schema.ts`**

Append the standard Auth.js Drizzle tables. Keep existing imports; add `boolean` and `primaryKey` if not already imported.

```typescript
import { boolean } from "drizzle-orm/pg-core";

export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.provider, t.providerAccountId] }),
  }),
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { withTimezone: true }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.identifier, t.token] }),
  }),
);
```

Note: the existing `users` table already has `id`, `displayName`, `avatarUrl`. The Drizzle adapter expects `name`, `email`, `emailVerified`, `image`. Add the missing columns so the adapter can write to them, keeping `displayName`/`avatarUrl` for app display:

```typescript
// add to the users pgTable definition:
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("email_verified", { withTimezone: true }),
  image: text("image"),
```

- [ ] **Step 3: Generate + apply migration**

```bash
npm run db:generate
npm run db:migrate
```

Verify the new tables exist:

```bash
docker compose exec db psql -U ddl -d dia_diem -c "\dt"
```

Expected: now also lists `accounts`, `sessions`, `verification_tokens`.

- [ ] **Step 4: Commit**

```bash
git add src/db/schema.ts drizzle/ package.json package-lock.json
git commit -m "feat: add NextAuth adapter tables to schema"
```

---

## Task 2: NextAuth configuration + Google OAuth

**Files:**
- Create: `src/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`
- Modify: `.env.example`, `.env.local`

- [ ] **Step 1: Add auth env vars**

Add to `.env.example` and `.env.local`:

```
AUTH_SECRET=replace_me
AUTH_GOOGLE_ID=replace_me
AUTH_GOOGLE_SECRET=replace_me
```

Generate a secret for `.env.local`:

```bash
npx auth secret
```

The user must create an OAuth client in Google Cloud Console (type: Web application), add `http://localhost:3000/api/auth/callback/google` as an authorized redirect URI (and the mini-PC's real origin for production), then paste the client ID/secret.

- [ ] **Step 2: Create `src/auth.ts`**

```typescript
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db";
import {
  users,
  accounts,
  sessions,
  verificationTokens,
} from "@/db/schema";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [Google],
  session: { strategy: "database" },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
});
```

- [ ] **Step 3: Create the route handler**

`src/app/api/auth/[...nextauth]/route.ts`:

```typescript
import { handlers } from "@/auth";
export const { GET, POST } = handlers;
```

- [ ] **Step 4: Type augmentation for `session.user.id`**

Create `src/types/next-auth.d.ts`:

```typescript
import "next-auth";
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}
```

- [ ] **Step 5: Manual verification**

Start the dev server (`npm run dev`), open `http://localhost:3000/api/auth/signin`, complete Google login. Confirm a row lands in `users` and `accounts`:

```bash
docker compose exec db psql -U ddl -d dia_diem -c "select id, email from users;"
```

- [ ] **Step 6: Commit**

```bash
git add src/auth.ts src/app/api/auth src/types/next-auth.d.ts .env.example
git commit -m "feat: add NextAuth Google OAuth with Drizzle session store"
```

---

## Task 3: Session helper + input validation

**Files:**
- Create: `src/lib/session.ts`, `src/lib/validation.ts`
- Test: `src/lib/__tests__/validation.test.ts`

- [ ] **Step 1: Write the failing validation test**

`src/lib/__tests__/validation.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { postSchema, commentSchema, reviewSchema } from "../validation";

describe("validation schemas", () => {
  it("accepts a valid post", () => {
    const r = postSchema.safeParse({
      caption: "Bún chả ngon",
      placeId: "abc",
      placeName: "Quán X",
      lat: 21.0,
      lng: 105.8,
      media: [{ url: "/uploads/a.jpg", type: "image" }],
    });
    expect(r.success).toBe(true);
  });

  it("rejects a post with no caption and no media", () => {
    const r = postSchema.safeParse({ caption: "", media: [] });
    expect(r.success).toBe(false);
  });

  it("rejects a review rating outside 1..5", () => {
    expect(reviewSchema.safeParse({ placeId: "x", rating: 6 }).success).toBe(false);
    expect(reviewSchema.safeParse({ placeId: "x", rating: 0 }).success).toBe(false);
  });

  it("accepts a valid review", () => {
    expect(
      reviewSchema.safeParse({ placeId: "x", rating: 4, body: "ổn" }).success,
    ).toBe(true);
  });

  it("rejects an empty comment", () => {
    expect(commentSchema.safeParse({ body: "" }).success).toBe(false);
  });
});
```

Run `npm test` — fails (module missing).

- [ ] **Step 2: Implement `src/lib/validation.ts`**

```typescript
import { z } from "zod";

export const mediaSchema = z.object({
  url: z.string().min(1),
  type: z.enum(["image", "video"]),
});

export const postSchema = z
  .object({
    caption: z.string().max(2000).optional().default(""),
    placeId: z.string().optional(),
    placeName: z.string().optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
    media: z.array(mediaSchema).max(10).default([]),
  })
  .refine((d) => d.caption.trim().length > 0 || d.media.length > 0, {
    message: "Post must have a caption or at least one media item",
  });

export const commentSchema = z.object({
  body: z.string().trim().min(1).max(1000),
});

export const reviewSchema = z.object({
  placeId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  body: z.string().max(2000).optional(),
});

export const favoriteSchema = z.object({
  placeId: z.string().min(1),
});
```

Run `npm test` — green.

- [ ] **Step 3: Implement `src/lib/session.ts`**

```typescript
import { auth } from "@/auth";

export class UnauthorizedError extends Error {}

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new UnauthorizedError("Login required");
  }
  return session.user;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/session.ts src/lib/validation.ts src/lib/__tests__/validation.test.ts
git commit -m "feat: add session guard and zod input validation"
```

---

## Task 4: Local media upload + serving

**Files:**
- Create: `src/lib/upload.ts`, `src/app/api/upload/route.ts`, `src/app/uploads/[...path]/route.ts`
- Modify: `.gitignore` (add `uploads/`)
- Test: `src/lib/__tests__/upload.test.ts`

- [ ] **Step 1: Git-ignore the uploads dir**

Add to `.gitignore`:

```
/uploads
```

- [ ] **Step 2: Write the failing test for the filename/mime guard**

`upload.ts` exposes a pure `pickExtension(mime)` and a `MAX_BYTES` constant we can test without touching the filesystem.

`src/lib/__tests__/upload.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { pickExtension, isAllowedMime } from "../upload";

describe("upload guards", () => {
  it("maps known image/video mimes to extensions", () => {
    expect(pickExtension("image/jpeg")).toBe(".jpg");
    expect(pickExtension("image/png")).toBe(".png");
    expect(pickExtension("video/mp4")).toBe(".mp4");
  });

  it("rejects disallowed mimes", () => {
    expect(isAllowedMime("application/x-msdownload")).toBe(false);
    expect(isAllowedMime("image/jpeg")).toBe(true);
  });
});
```

Run `npm test` — fails.

- [ ] **Step 3: Implement `src/lib/upload.ts`**

```typescript
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const MAX_BYTES = 50 * 1024 * 1024; // 50 MB

const MIME_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "video/mp4": ".mp4",
  "video/quicktime": ".mov",
  "video/webm": ".webm",
};

export function isAllowedMime(mime: string): boolean {
  return mime in MIME_EXT;
}

export function pickExtension(mime: string): string {
  return MIME_EXT[mime] ?? "";
}

export function mediaTypeOf(mime: string): "image" | "video" {
  return mime.startsWith("video/") ? "video" : "image";
}

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

export async function saveUpload(
  file: File,
): Promise<{ url: string; type: "image" | "video" }> {
  if (!isAllowedMime(file.type)) {
    throw new Error(`Unsupported file type: ${file.type}`);
  }
  if (file.size > MAX_BYTES) {
    throw new Error("File too large");
  }
  await mkdir(UPLOAD_DIR, { recursive: true });
  const name = `${randomUUID()}${pickExtension(file.type)}`;
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOAD_DIR, name), buf);
  return { url: `/uploads/${name}`, type: mediaTypeOf(file.type) };
}
```

Run `npm test` — green.

- [ ] **Step 4: Implement `POST /api/upload`**

`src/app/api/upload/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireUser, UnauthorizedError } from "@/lib/session";
import { saveUpload } from "@/lib/upload";

export async function POST(req: NextRequest) {
  try {
    await requireUser();
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file" }, { status: 400 });
    }
    const saved = await saveUpload(file);
    return NextResponse.json(saved);
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Login required" }, { status: 401 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload failed" },
      { status: 400 },
    );
  }
}
```

- [ ] **Step 5: Implement file serving `src/app/uploads/[...path]/route.ts`**

```typescript
import { NextRequest } from "next/server";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: parts } = await params;
  // Prevent path traversal: resolve and confirm it stays inside UPLOAD_DIR.
  const resolved = path.resolve(UPLOAD_DIR, ...parts);
  if (!resolved.startsWith(UPLOAD_DIR + path.sep)) {
    return new Response("Forbidden", { status: 403 });
  }
  try {
    await stat(resolved);
  } catch {
    return new Response("Not found", { status: 404 });
  }
  const ext = path.extname(resolved).toLowerCase();
  const stream = createReadStream(resolved);
  return new Response(stream as unknown as ReadableStream, {
    headers: {
      "Content-Type": CONTENT_TYPES[ext] ?? "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
```

> Security note: the traversal guard above is load-bearing — uploaded filenames are server-generated UUIDs, but the serving route still rejects any `..` that resolves outside `uploads/`. Don't remove it.

- [ ] **Step 6: Manual verification**

With a logged-in session, POST a small image to `/api/upload` (use the browser devtools or a form), then open the returned `/uploads/...` URL — the image renders.

- [ ] **Step 7: Commit**

```bash
git add src/lib/upload.ts src/lib/__tests__/upload.test.ts src/app/api/upload src/app/uploads .gitignore
git commit -m "feat: add local filesystem media upload and serving"
```

---

## Task 5: Posts API (create + feed) and comments

**Files:**
- Create: `src/app/api/posts/route.ts`, `src/app/api/posts/[postId]/route.ts`, `src/app/api/posts/[postId]/comments/route.ts`

- [ ] **Step 1: Implement `GET`/`POST /api/posts`**

`src/app/api/posts/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { posts, postMedia } from "@/db/schema";
import { desc, lt } from "drizzle-orm";
import { requireUser, UnauthorizedError } from "@/lib/session";
import { postSchema } from "@/lib/validation";

const PAGE = 10;

export async function GET(req: NextRequest) {
  const cursor = req.nextUrl.searchParams.get("cursor"); // ISO date of last seen
  const where = cursor ? lt(posts.createdAt, new Date(cursor)) : undefined;
  const rows = await db.query.posts.findMany({
    where,
    orderBy: [desc(posts.createdAt)],
    limit: PAGE + 1,
    with: {
      media: { orderBy: (m, { asc }) => [asc(m.position)] },
      user: { columns: { id: true, displayName: true, avatarUrl: true } },
    },
  });
  const hasMore = rows.length > PAGE;
  const page = rows.slice(0, PAGE);
  const nextCursor = hasMore
    ? page[page.length - 1].createdAt.toISOString()
    : null;
  return NextResponse.json({ posts: page, nextCursor });
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const parsed = postSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const d = parsed.data;
    const [post] = await db
      .insert(posts)
      .values({
        userId: user.id,
        placeId: d.placeId,
        placeName: d.placeName,
        caption: d.caption,
        lat: d.lat,
        lng: d.lng,
      })
      .returning();

    if (d.media.length > 0) {
      await db.insert(postMedia).values(
        d.media.map((m, i) => ({
          postId: post.id,
          url: m.url,
          type: m.type,
          position: i,
        })),
      );
    }
    return NextResponse.json({ id: post.id }, { status: 201 });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Login required" }, { status: 401 });
    }
    throw e;
  }
}
```

> This uses Drizzle relational queries (`db.query.posts.findMany` with `with`). That requires relations declared in the schema. Add Step 2.

- [ ] **Step 2: Declare Drizzle relations in `src/db/schema.ts`**

Append:

```typescript
import { relations } from "drizzle-orm";

export const postsRelations = relations(posts, ({ one, many }) => ({
  user: one(users, { fields: [posts.userId], references: [users.id] }),
  media: many(postMedia),
  comments: many(comments),
}));

export const postMediaRelations = relations(postMedia, ({ one }) => ({
  post: one(posts, { fields: [postMedia.postId], references: [posts.id] }),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  post: one(posts, { fields: [comments.postId], references: [posts.id] }),
  user: one(users, { fields: [comments.userId], references: [users.id] }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
  comments: many(comments),
}));
```

No migration needed — relations are query-time only.

- [ ] **Step 3: Implement `GET /api/posts/[postId]`** (single post + media + comments)

`src/app/api/posts/[postId]/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { posts } from "@/db/schema";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ postId: string }> },
) {
  const { postId } = await params;
  const post = await db.query.posts.findFirst({
    where: eq(posts.id, postId),
    with: {
      media: { orderBy: (m, { asc }) => [asc(m.position)] },
      user: { columns: { id: true, displayName: true, avatarUrl: true } },
      comments: {
        orderBy: (c, { asc }) => [asc(c.createdAt)],
        with: { user: { columns: { displayName: true, avatarUrl: true } } },
      },
    },
  });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ post });
}
```

- [ ] **Step 4: Implement `POST /api/posts/[postId]/comments`**

`src/app/api/posts/[postId]/comments/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { db } from "@/db";
import { comments } from "@/db/schema";
import { requireUser, UnauthorizedError } from "@/lib/session";
import { commentSchema } from "@/lib/validation";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ postId: string }> },
) {
  try {
    const user = await requireUser();
    const { postId } = await params;
    const parsed = commentSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const [c] = await db
      .insert(comments)
      .values({ postId, userId: user.id, body: parsed.data.body })
      .returning();
    return NextResponse.json({ id: c.id }, { status: 201 });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Login required" }, { status: 401 });
    }
    throw e;
  }
}
```

- [ ] **Step 5: Manual verification**

Logged in, POST a post to `/api/posts`, then `GET /api/posts` returns it; POST a comment and confirm `GET /api/posts/[id]` includes it.

- [ ] **Step 6: Commit**

```bash
git add src/db/schema.ts src/app/api/posts
git commit -m "feat: add posts feed, single-post, and comments API"
```

---

## Task 6: Reviews + favorites API

**Files:**
- Create: `src/app/api/reviews/route.ts`, `src/app/api/favorites/route.ts`, `src/app/api/favorites/[placeId]/route.ts`

- [ ] **Step 1: Implement `POST /api/reviews`** (upsert: 1 review per user per place)

`src/app/api/reviews/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { db } from "@/db";
import { reviews } from "@/db/schema";
import { requireUser, UnauthorizedError } from "@/lib/session";
import { reviewSchema } from "@/lib/validation";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const parsed = reviewSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const { placeId, rating, body } = parsed.data;
    const [r] = await db
      .insert(reviews)
      .values({ userId: user.id, placeId, rating, body })
      .onConflictDoUpdate({
        target: [reviews.userId, reviews.placeId],
        set: { rating, body },
      })
      .returning();
    return NextResponse.json({ id: r.id }, { status: 201 });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Login required" }, { status: 401 });
    }
    throw e;
  }
}
```

- [ ] **Step 2: Implement favorites add/remove**

`src/app/api/favorites/route.ts` (add):

```typescript
import { NextResponse } from "next/server";
import { db } from "@/db";
import { favorites } from "@/db/schema";
import { requireUser, UnauthorizedError } from "@/lib/session";
import { favoriteSchema } from "@/lib/validation";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const parsed = favoriteSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    await db
      .insert(favorites)
      .values({ userId: user.id, placeId: parsed.data.placeId })
      .onConflictDoNothing();
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Login required" }, { status: 401 });
    }
    throw e;
  }
}
```

`src/app/api/favorites/[placeId]/route.ts` (remove):

```typescript
import { NextResponse } from "next/server";
import { db } from "@/db";
import { favorites } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireUser, UnauthorizedError } from "@/lib/session";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ placeId: string }> },
) {
  try {
    const user = await requireUser();
    const { placeId } = await params;
    await db
      .delete(favorites)
      .where(and(eq(favorites.userId, user.id), eq(favorites.placeId, placeId)));
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Login required" }, { status: 401 });
    }
    throw e;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/reviews src/app/api/favorites
git commit -m "feat: add reviews upsert and favorites toggle API"
```

---

## Task 7: Merge user content into place detail

**Files:**
- Modify: `src/app/api/places/[placeId]/route.ts`

- [ ] **Step 1: Extend the place-detail response with DB content**

Where the route currently returns Google place details, also query and attach:
- `userPosts`: posts with `placeId === placeId`, newest first, with media + author.
- `userReviews`: reviews for the place with author display name + avatar.
- `isFavorite`: whether the current session user (if any) has favorited this place.

Add near the top of the handler (after fetching Google details):

```typescript
import { auth } from "@/auth";
import { db } from "@/db";
import { posts, reviews, favorites } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";

// inside GET, after googleDetails is built:
const userPosts = await db.query.posts.findMany({
  where: eq(posts.placeId, placeId),
  orderBy: [desc(posts.createdAt)],
  limit: 20,
  with: {
    media: { orderBy: (m, { asc }) => [asc(m.position)] },
    user: { columns: { displayName: true, avatarUrl: true } },
  },
});

const userReviews = await db.query.reviews.findMany({
  where: eq(reviews.placeId, placeId),
  orderBy: [desc(reviews.createdAt)],
  with: { /* needs reviews→users relation, see Step 2 */ },
});

const session = await auth();
let isFavorite = false;
if (session?.user?.id) {
  const fav = await db.query.favorites.findFirst({
    where: and(
      eq(favorites.userId, session.user.id),
      eq(favorites.placeId, placeId),
    ),
  });
  isFavorite = !!fav;
}

// include userPosts, userReviews, isFavorite in the JSON response
```

- [ ] **Step 2: Add `reviews` + `favorites` relations to schema**

Append to `src/db/schema.ts`:

```typescript
export const reviewsRelations = relations(reviews, ({ one }) => ({
  user: one(users, { fields: [reviews.userId], references: [users.id] }),
}));

export const favoritesRelations = relations(favorites, ({ one }) => ({
  user: one(users, { fields: [favorites.userId], references: [users.id] }),
}));
```

Then make `userReviews` include `with: { user: { columns: { displayName: true, avatarUrl: true } } }`.

- [ ] **Step 3: Manual verification**

Create a post and a review for a known `placeId`, then `GET /api/places/[placeId]` returns Google data plus `userPosts`, `userReviews`, and correct `isFavorite`.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/places/[placeId]/route.ts src/db/schema.ts
git commit -m "feat: merge community posts/reviews/favorite state into place detail"
```

---

## Task 8: Auth UI + session provider

**Files:**
- Create: `src/components/SessionProvider.tsx`, `src/components/AuthButton.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Client session provider**

`src/components/SessionProvider.tsx`:

```typescript
"use client";
import { SessionProvider } from "next-auth/react";
export default SessionProvider;
```

- [ ] **Step 2: Auth button**

`src/components/AuthButton.tsx`:

```typescript
"use client";
import { useSession, signIn, signOut } from "next-auth/react";

export function AuthButton() {
  const { data: session, status } = useSession();
  if (status === "loading") return null;
  if (session?.user) {
    return (
      <button className="glass-btn" onClick={() => signOut()}>
        {session.user.name ?? "Đăng xuất"} · Thoát
      </button>
    );
  }
  return (
    <button className="glass-btn" onClick={() => signIn("google")}>
      Đăng nhập Google
    </button>
  );
}
```

- [ ] **Step 3: Wrap layout + add the button to the header**

In `src/app/layout.tsx`, wrap `{children}` in `<SessionProvider>` and render `<AuthButton />` in the header. Reuse the glass styling from Plan 1.

- [ ] **Step 4: Manual verification**

Header shows "Đăng nhập Google" when logged out, name + "Thoát" when logged in; clicking toggles state.

- [ ] **Step 5: Commit**

```bash
git add src/components/SessionProvider.tsx src/components/AuthButton.tsx src/app/layout.tsx
git commit -m "feat: add auth button and session provider to layout"
```

---

## Task 9: Feed screen + post card

**Files:**
- Create: `src/app/feed/page.tsx`, `src/components/PostCard.tsx`

- [ ] **Step 1: PostCard component**

`src/components/PostCard.tsx` — a glass card showing: author (avatar + display name), media (image `<img>` / video `<video controls>`), caption, place name (links to `/place/[placeId]` when present), and a comment list + add-comment box (posts to `/api/posts/[postId]/comments`, login-gated). Keep it a client component for the comment box.

- [ ] **Step 2: Feed page with infinite scroll**

`src/app/feed/page.tsx` (client component): fetch `/api/posts`, render `PostCard` list, use an `IntersectionObserver` sentinel to load the next page via `?cursor=`. Per spec, paginate with infinite scroll.

- [ ] **Step 3: Manual verification**

Open `/feed` on a phone-sized viewport: posts render in glass cards, scrolling loads more, video plays, comments post when logged in and prompt login otherwise.

- [ ] **Step 4: Commit**

```bash
git add src/app/feed src/components/PostCard.tsx
git commit -m "feat: add community feed screen with infinite scroll"
```

---

## Task 10: New-post screen

**Files:**
- Create: `src/app/post/new/page.tsx`, `src/components/NewPostForm.tsx`

- [ ] **Step 1: NewPostForm**

`src/components/NewPostForm.tsx` (client): media file picker (multiple), each file uploaded via `POST /api/upload` to get a `{ url, type }`; caption textarea; a "Gắn vị trí hiện tại" button that calls `navigator.geolocation` and stores `lat`/`lng` (and optionally a `placeName` typed by the user). On submit, POST the assembled payload to `/api/posts`, then redirect to `/feed`.

- [ ] **Step 2: New-post page**

`src/app/post/new/page.tsx`: render `NewPostForm`. If not logged in, prompt `signIn("google")` instead of the form.

- [ ] **Step 3: Manual verification**

Logged in: pick an image + video, write a caption, attach current location, submit → new post appears at the top of `/feed` with media and place.

- [ ] **Step 4: Commit**

```bash
git add src/app/post/new src/components/NewPostForm.tsx
git commit -m "feat: add create-post screen with media upload and location"
```

---

## Task 11: Wire favorite + review + community posts into place detail screen

**Files:**
- Create: `src/components/FavoriteButton.tsx`, `src/components/ReviewForm.tsx`
- Modify: `src/app/place/[placeId]/page.tsx`

- [ ] **Step 1: FavoriteButton**

`src/components/FavoriteButton.tsx` (client): takes `placeId` + initial `isFavorite`. Toggles via `POST /api/favorites` / `DELETE /api/favorites/[placeId]`. If logged out, triggers `signIn("google")`.

- [ ] **Step 2: ReviewForm**

`src/components/ReviewForm.tsx` (client): 1–5 star picker + body textarea, submits to `POST /api/reviews`. Login-gated. On success, refresh the detail view.

- [ ] **Step 3: Extend the place detail screen**

In `src/app/place/[placeId]/page.tsx` add three sections below the existing Google info:
- `FavoriteButton` + "Viết review" (`ReviewForm`).
- Community reviews list (`userReviews` from the API).
- Community posts list (`userPosts`) reusing `PostCard` or a compact variant.

- [ ] **Step 4: Manual verification**

On a place detail page: favorite toggles and persists across reload; submitting a review shows it in the community reviews section; community posts for that place appear.

- [ ] **Step 5: Commit**

```bash
git add src/components/FavoriteButton.tsx src/components/ReviewForm.tsx src/app/place/[placeId]/page.tsx
git commit -m "feat: add favorite, review, and community content to place detail"
```

---

## Task 12: Full social verification + final commit

**Files:** none (verification)

- [ ] **Step 1: Run the test + type suite**

```bash
npm test
npx tsc --noEmit
```

Both must be clean before proceeding.

- [ ] **Step 2: End-to-end manual run (real phone if possible)**

Walk the golden path: log in with Google → create a post with photo + video + current location → see it in the feed → comment on it → open a place detail → favorite it → write a review → reload and confirm everything persisted. Then log out and confirm browse-only still works (discovery + viewing feed) while write actions prompt login.

- [ ] **Step 3: Edge cases**

- Posting with no caption and no media → blocked by validation (400), friendly error shown.
- Uploading a disallowed file type → rejected with a clear message.
- Submitting a 2nd review for the same place → updates the existing one (no duplicate row).
- Removing a favorite → button reflects the change, row gone from DB.
- A post with `placeId = null` (free post) → renders in feed without a broken place link.

- [ ] **Step 4: Record the result**

Note in the commit/PR description what was tested and on which environment (real phone vs desktop emulation), and explicitly call out anything only verified via desktop emulation.

- [ ] **Step 5: Final commit (if any tweaks were needed)**

```bash
git add -A
git commit -m "chore: social MVP verified end-to-end"
```

---

## Done criteria for Plan 2

- `npm test` green; `npx tsc --noEmit` clean.
- Google OAuth login works; sessions persist in Postgres.
- Logged-in users can post photos/videos with a location, comment, review (1..5, one per place), and favorite places.
- Browse stays free; every write route enforces the session server-side.
- Media uploads land on the local filesystem and serve back correctly, with a path-traversal guard on the serving route.
- Place detail screen blends Google data with community posts, reviews, and favorite state.
