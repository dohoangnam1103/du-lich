import Link from "next/link";
import { db } from "@/db";
import { posts, reviews, users, follows } from "@/db/schema";
import { desc, eq, and } from "drizzle-orm";
import { auth } from "@/auth";
import { PostCard, type FeedPost } from "@/components/PostCard";
import { EditProfile } from "@/components/EditProfile";
import { FollowButton } from "@/components/FollowButton";
import { getT } from "@/lib/i18n/server";
import { isUuid } from "@/lib/validation";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const t = await getT();

  const user = isUuid(userId)
    ? await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: { id: true, displayName: true, name: true, avatarUrl: true, image: true },
      })
    : null;

  if (!user) {
    return (
      <main style={{ maxWidth: 600, margin: "0 auto", padding: 16 }}>
        <Link href="/feed" style={{ color: "var(--text-dim)" }}>← {t("feed.title")}</Link>
        <p style={{ marginTop: 24 }}>{t("profile.notFound")}</p>
      </main>
    );
  }

  const userPosts = await db.query.posts.findMany({
    where: eq(posts.userId, userId),
    orderBy: [desc(posts.createdAt)],
    limit: 30,
    with: {
      media: { orderBy: (m, { asc }) => [asc(m.position)] },
      user: { columns: { id: true, displayName: true, avatarUrl: true } },
      likes: { columns: { userId: true } },
      comments: {
        orderBy: (c, { asc }) => [asc(c.createdAt)],
        with: { user: { columns: { displayName: true, avatarUrl: true } } },
      },
    },
  });

  const reviewCount = await db.$count(reviews, eq(reviews.userId, userId));
  const followerCount = await db.$count(follows, eq(follows.followingId, userId));
  const followingCount = await db.$count(follows, eq(follows.followerId, userId));

  const session = await auth();
  const isSelf = session?.user?.id === userId;
  let isFollowing = false;
  if (session?.user?.id && !isSelf) {
    const row = await db.query.follows.findFirst({
      where: and(
        eq(follows.followerId, session.user.id),
        eq(follows.followingId, userId),
      ),
    });
    isFollowing = !!row;
  }

  const displayName = user.displayName ?? user.name ?? t("profile.user");
  const avatar = user.avatarUrl ?? user.image ?? null;
  const initial = displayName.trim().charAt(0).toUpperCase() || "?";

  const feed: FeedPost[] = userPosts.map((p) => {
    const likes = p.likes ?? [];
    const { likes: _l, ...rest } = p;
    void _l;
    return { ...rest, likeCount: likes.length, liked: false } as unknown as FeedPost;
  });

  return (
    <main style={{ maxWidth: 600, margin: "0 auto", padding: 16 }}>
      <Link href="/feed" style={{ color: "var(--text-dim)" }}>← {t("feed.title")}</Link>

      <div
        className="glass glass-edge"
        style={{ padding: 20, marginTop: 12, display: "flex", alignItems: "center", gap: 16 }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            flex: "0 0 auto",
            display: "grid",
            placeItems: "center",
            fontSize: 26,
            fontWeight: 700,
            color: "#fff",
            background: avatar ? `center/cover url(${avatar})` : "var(--accent-grad)",
          }}
        >
          {avatar ? "" : initial}
        </div>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>{displayName}</h1>
          <p className="muted" style={{ margin: "6px 0 0", fontSize: 14 }}>
            {userPosts.length} {t("profile.posts")} · {reviewCount} {t("profile.reviews")} · {followerCount} {t("profile.followers")} · {t("profile.followingCount")} {followingCount}
          </p>
          {isSelf && <EditProfile currentName={displayName} />}
          {!isSelf && <FollowButton targetUserId={userId} initialFollowing={isFollowing} />}
        </div>
      </div>

      <h2 className="section-title" style={{ marginTop: 24 }}>{t("profile.postsTitle")}</h2>
      {feed.length === 0 && <p className="muted">{t("place.noPosts")}</p>}
      {feed.map((p) => (
        <PostCard key={p.id} post={p} />
      ))}
    </main>
  );
}
