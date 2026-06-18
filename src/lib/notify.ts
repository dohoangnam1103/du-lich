import { db } from "@/db";
import { notifications } from "@/db/schema";

// Inserts a notification, skipping the case where the actor is the recipient
// (you never get notified about your own actions). Best-effort.
export async function notify(params: {
  userId: string; // recipient
  actorId: string;
  type: "like" | "comment" | "follow";
  postId?: string | null;
}): Promise<void> {
  if (params.userId === params.actorId) return;
  try {
    await db.insert(notifications).values({
      userId: params.userId,
      actorId: params.actorId,
      type: params.type,
      postId: params.postId ?? null,
    });
  } catch {
    // Notifications are non-critical; never block the main action.
  }
}
