import Link from "next/link";
import Image from "next/image";
import type { PlaceDetail, Place } from "@/lib/places/types";
import { osmTagsForCategory } from "@/lib/places/types";
import { haversineMeters } from "@/lib/geo";
import { getPlaceDetail, searchNearby } from "@/lib/places/client";
import { getWeather, type Weather } from "@/lib/places/weather";
import { cached, coarse } from "@/lib/cache";
import { auth } from "@/auth";
import { db } from "@/db";
import { posts, reviews, favorites } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { FavoriteButton } from "@/components/FavoriteButton";
import { ReviewForm } from "@/components/ReviewForm";
import { ShareButton } from "@/components/ShareButton";
import { SaveToCollection } from "@/components/SaveToCollection";
import { ReviewDeleteButton } from "@/components/ReviewDeleteButton";
import { communityRating } from "@/lib/places/ratings";
import { PostCard, type FeedPost } from "@/components/PostCard";
import { PlaceCard } from "@/components/PlaceCard";
import { RecordView } from "@/components/RecordView";
import { getT } from "@/lib/i18n/server";

function formatDistance(m: number): string {
  if (m < 1000) return `${m} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

type CommunityReview = {
  id: string;
  userId: string;
  rating: number;
  body: string | null;
  createdAt: string;
  media: { url: string; type: string }[];
  user: { displayName: string | null; avatarUrl: string | null };
};

type DetailResponse = {
  place: PlaceDetail;
  userPosts: FeedPost[];
  userReviews: CommunityReview[];
  isFavorite: boolean;
  rating: { rating: number; count: number } | null;
  currentUserId: string | null;
  weather: Weather | null;
  similar: Place[];
};

async function fetchDetail(placeId: string): Promise<DetailResponse | null> {
  try {
    const place = await getPlaceDetail(placeId);

    const userPosts = await db.query.posts.findMany({
      where: eq(posts.placeId, placeId),
      orderBy: [desc(posts.createdAt)],
      limit: 20,
      with: {
        media: { orderBy: (m, { asc }) => [asc(m.position)] },
        user: { columns: { id: true, displayName: true, avatarUrl: true } },
      },
    });

    const userReviews = await db.query.reviews.findMany({
      where: eq(reviews.placeId, placeId),
      orderBy: [desc(reviews.createdAt)],
      with: {
        media: { orderBy: (m, { asc }) => [asc(m.position)] },
        user: { columns: { displayName: true, avatarUrl: true } },
      },
    });

    const rating = await communityRating(placeId);

    // Current weather + a few similar places nearby (both cached, best-effort).
    const weather = await cached(
      `weather:${coarse(place.lat, 2)}:${coarse(place.lng, 2)}`,
      30 * 60 * 1000,
      () => getWeather(place.lat, place.lng),
    ).catch(() => null);

    const similar = await cached(
      `similar:${coarse(place.lat)}:${coarse(place.lng)}`,
      10 * 60 * 1000,
      () =>
        searchNearby({
          lat: place.lat,
          lng: place.lng,
          radiusMeters: 2000,
          tagFilters: [
            ...osmTagsForCategory("food"),
            ...osmTagsForCategory("cafe"),
            ...osmTagsForCategory("sightseeing"),
          ],
          maxResults: 10,
        }),
    ).catch(() => [] as Place[]);
    const similarPlaces = similar
      .filter((p) => p.placeId !== placeId)
      .slice(0, 6);

    const session = await auth();
    const currentUserId = session?.user?.id ?? null;
    let isFavorite = false;
    if (currentUserId) {
      const fav = await db.query.favorites.findFirst({
        where: and(
          eq(favorites.userId, currentUserId),
          eq(favorites.placeId, placeId),
        ),
      });
      isFavorite = !!fav;
    }

    return {
      place,
      userPosts: userPosts as unknown as FeedPost[],
      userReviews: userReviews as unknown as CommunityReview[],
      isFavorite,
      rating,
      currentUserId,
      weather,
      similar: similarPlaces,
    };
  } catch {
    return null;
  }
}

export default async function PlaceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ placeId: string }>;
  searchParams: Promise<{ lat?: string; lng?: string }>;
}) {
  const { placeId: rawPlaceId } = await params;
  const placeId = decodeURIComponent(rawPlaceId);
  const { lat, lng } = await searchParams;
  const data = await fetchDetail(placeId);
  const t = await getT();

  if (!data) {
    return (
      <main style={{ maxWidth: 520, margin: "0 auto", padding: 16 }}>
        <Link href="/">{t("common.back")}</Link>
        <p style={{ marginTop: 24 }}>{t("place.notFound")}</p>
      </main>
    );
  }

  const { place, userPosts, userReviews, isFavorite, rating, currentUserId, weather, similar } = data;

  const userLat = Number(lat);
  const userLng = Number(lng);
  const distanceMeters =
    Number.isFinite(userLat) && Number.isFinite(userLng)
      ? haversineMeters(userLat, userLng, place.lat, place.lng)
      : null;

  const gallery = [
    ...place.imageUrls,
    ...userReviews.flatMap((r) =>
      r.media.filter((m) => m.type === "image").map((m) => m.url),
    ),
    ...userPosts.flatMap((p) =>
      p.media.filter((m) => m.type === "image").map((m) => m.url),
    ),
  ];

  return (
    <main style={{ maxWidth: 520, margin: "0 auto", padding: 16, paddingBottom: 48 }}>
      <RecordView placeId={placeId} name={place.name} lat={place.lat} lng={place.lng} />
      <Link href="/" style={{ color: "var(--text-dim)" }}>{t("common.back")}</Link>

      {gallery.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: 8,
            overflowX: "auto",
            margin: "12px 0",
            scrollSnapType: "x mandatory",
          }}
        >
          {gallery.map((url, i) => (
            <div
              key={i}
              style={{
                position: "relative",
                flex: gallery.length === 1 ? "1 0 100%" : "0 0 78%",
                height: 220,
                borderRadius: 22,
                overflow: "hidden",
                scrollSnapAlign: "start",
              }}
            >
              <Image
                src={url}
                alt={`${place.name} ${i + 1}`}
                fill
                sizes="(max-width: 520px) 80vw, 420px"
                style={{ objectFit: "cover" }}
              />
            </div>
          ))}
        </div>
      )}

      <h1 style={{ fontSize: 26, fontWeight: 800, margin: "8px 0" }}>{place.name}</h1>
      {rating && (
        <p style={{ fontWeight: 600, margin: "4px 0" }}>
          ⭐ {rating.rating.toFixed(1)}{" "}
          <span className="muted" style={{ fontWeight: 400 }}>
            ({rating.count} {t("place.reviewsCount")})
          </span>
        </p>
      )}
      {place.address && <p style={{ color: "var(--text-dim)" }}>{place.address}</p>}
      {distanceMeters != null && (
        <p style={{ color: "var(--text-dim)" }}>📍 {formatDistance(distanceMeters)}</p>
      )}

      {weather && (
        <p style={{ fontWeight: 600, margin: "4px 0" }}>
          {weather.icon} {weather.temperature}°C{" "}
          <span className="muted" style={{ fontWeight: 400 }}>· {weather.description}</span>
        </p>
      )}

      {place.description && (
        <div className="glass glass-edge" style={{ padding: 14, marginTop: 12 }}>
          <p style={{ lineHeight: 1.6 }}>{place.description}</p>
          {place.wikiUrl && (
            <a
              href={place.wikiUrl}
              target="_blank"
              rel="noreferrer"
              style={{ color: "var(--text-dim)", fontSize: 13 }}
            >
              {t("place.source")}
            </a>
          )}
        </div>
      )}

      {place.cuisine && (
        <p style={{ color: "var(--text-dim)" }}>
          🍽️ {place.cuisine.replace(/_/g, " ").replace(/;/g, ", ")}
        </p>
      )}

      {(place.phone || place.website || place.openingHours || place.facebook) && (
        <div className="glass glass-edge" style={{ padding: 14, marginTop: 12, display: "grid", gap: 8 }}>
          {place.openingHours && (
            <div style={{ display: "flex", gap: 8 }}>
              <span aria-hidden>🕒</span>
              <span style={{ wordBreak: "break-word" }}>{place.openingHours}</span>
            </div>
          )}
          {place.phone && (
            <div style={{ display: "flex", gap: 8 }}>
              <span aria-hidden>📞</span>
              <a href={`tel:${place.phone}`} style={{ color: "inherit" }}>
                {place.phone}
              </a>
            </div>
          )}
          {place.website && (
            <div style={{ display: "flex", gap: 8 }}>
              <span aria-hidden>🌐</span>
              <a
                href={place.website}
                target="_blank"
                rel="noreferrer"
                style={{ color: "inherit", wordBreak: "break-all" }}
              >
                {place.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
              </a>
            </div>
          )}
          {place.facebook && (
            <div style={{ display: "flex", gap: 8 }}>
              <span aria-hidden>📘</span>
              <a
                href={
                  /^https?:\/\//.test(place.facebook)
                    ? place.facebook
                    : `https://facebook.com/${place.facebook}`
                }
                target="_blank"
                rel="noreferrer"
                style={{ color: "inherit", wordBreak: "break-all" }}
              >
                Facebook ↗
              </a>
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
        <FavoriteButton
          placeId={placeId}
          initial={isFavorite}
          placeName={place.name}
          lat={place.lat}
          lng={place.lng}
        />
        <SaveToCollection
          placeId={placeId}
          placeName={place.name}
          lat={place.lat}
          lng={place.lng}
        />
        <ShareButton title={place.name} />
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`}
          target="_blank"
          rel="noreferrer"
          className="glass glass-edge"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            borderRadius: 999,
            textDecoration: "none",
            color: "inherit",
            fontSize: 14,
          }}
        >
          {t("place.directions")}
        </a>
      </div>

      <section style={{ marginTop: 24 }}>
        <h2 className="section-title">{t("place.writeReview")}</h2>
        <ReviewForm placeId={placeId} />
      </section>

      {similar.length > 0 && (
        <section style={{ marginTop: 24 }}>
          <h2 className="section-title">{t("place.similar")}</h2>
          {similar.map((p) => (
            <PlaceCard
              key={p.placeId}
              place={p}
              userCoords={{ lat: place.lat, lng: place.lng }}
            />
          ))}
        </section>
      )}

      <section style={{ marginTop: 24 }}>
        <h2 className="section-title">{t("place.communityReviews")}</h2>
        {userReviews.length === 0 && (
          <p style={{ color: "var(--text-dim)" }}>{t("place.noReviews")}</p>
        )}
        {userReviews.map((r) => (
          <div key={r.id} className="glass glass-edge" style={{ padding: 14, marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong>{r.user.displayName ?? t("post.anon")}</strong>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <span>⭐ {r.rating}</span>
                {currentUserId === r.userId && <ReviewDeleteButton reviewId={r.id} />}
              </span>
            </div>
            {r.body && <p style={{ marginTop: 6 }}>{r.body}</p>}
            {r.media.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 8 }}>
                {r.media
                  .filter((m) => m.type === "image")
                  .map((m, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={m.url}
                      alt=""
                      style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 12 }}
                    />
                  ))}
              </div>
            )}
          </div>
        ))}
      </section>

      <section style={{ marginTop: 24 }}>
        <h2 className="section-title">{t("place.communityPosts")}</h2>
        {userPosts.length === 0 && (
          <p style={{ color: "var(--text-dim)" }}>{t("place.noPosts")}</p>
        )}
        {userPosts.map((p) => (
          <PostCard key={p.id} post={p} />
        ))}
      </section>
    </main>
  );
}
