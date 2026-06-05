import type { Db } from "mongodb";

export async function ensureUserNotificationIndexes(db: Db) {
  const col = db.collection("user_notifications");
  await Promise.all([
    col.createIndex(
      { userId: 1, readAt: 1, createdAt: -1 },
      { name: "idx_user_notifications_user_read_created" },
    ),
    col.createIndex(
      { userId: 1, createdAt: -1 },
      { name: "idx_user_notifications_user_created" },
    ),
    col.createIndex(
      { dedupeKey: 1 },
      {
        name: "uniq_user_notifications_dedupe_key",
        unique: true,
        partialFilterExpression: { dedupeKey: { $type: "string" } },
      },
    ),
  ]);
}
