import type { Db } from "mongodb";

export async function ensureRacketCareIndexes(db: Db) {
  const col = db.collection("racket_care_items");
  await Promise.all([
    col.createIndex({ userId: 1, updatedAt: -1 }, { name: "idx_racket_care_user_updated" }),
    col.createIndex(
      { reminderEnabled: 1, reminderSentFor: 1, lastStringingAt: 1 },
      { name: "idx_racket_care_reminder_due" },
    ),
  ]);
}
