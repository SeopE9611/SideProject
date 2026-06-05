import { ObjectId, type Db } from "mongodb";
import type {
  UserNotificationDoc,
  UserNotificationPriority,
  UserNotificationType,
} from "./types";

type NotificationSource = {
  collection?: string;
  id?: ObjectId | string;
  kind?: string;
};

export type CreateUserNotificationParams = {
  userId: ObjectId | string;
  type: UserNotificationType;
  title: string;
  body?: string;
  href?: string;
  source?: NotificationSource;
  dedupeKey?: string;
  priority?: UserNotificationPriority;
  metadata?: Record<string, unknown>;
};

function isDuplicateKeyError(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      ("code" in error ? (error as { code?: unknown }).code === 11000 : false),
  );
}

function toUserObjectId(userId: ObjectId | string) {
  if (userId instanceof ObjectId) return userId;
  if (!ObjectId.isValid(userId)) {
    throw Object.assign(new Error("INVALID_USER_ID"), { code: "INVALID_USER_ID" });
  }
  return new ObjectId(userId);
}

function buildDoc(params: CreateUserNotificationParams): UserNotificationDoc {
  const now = new Date();
  return {
    _id: new ObjectId(),
    userId: toUserObjectId(params.userId),
    type: params.type,
    title: params.title,
    ...(params.body ? { body: params.body } : {}),
    ...(params.href ? { href: params.href } : {}),
    ...(params.source ? { source: params.source } : {}),
    ...(params.dedupeKey ? { dedupeKey: params.dedupeKey } : {}),
    createdAt: now,
    readAt: null,
    archivedAt: null,
    ...(params.priority ? { priority: params.priority } : {}),
    ...(params.metadata ? { metadata: params.metadata } : {}),
  };
}

export async function createUserNotification(
  db: Db,
  params: CreateUserNotificationParams,
) {
  try {
    const doc = buildDoc(params);
    await db.collection<UserNotificationDoc>("user_notifications").insertOne(doc);
    return { ok: true as const, insertedId: doc._id, duplicated: false };
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return { ok: true as const, insertedId: null, duplicated: true };
    }
    throw error;
  }
}

export async function createUserNotifications(
  db: Db,
  params: CreateUserNotificationParams[],
) {
  if (params.length === 0) return { ok: true as const, insertedCount: 0, duplicated: 0 };
  const docs = params.map(buildDoc);
  try {
    const res = await db
      .collection<UserNotificationDoc>("user_notifications")
      .insertMany(docs, { ordered: false });
    return { ok: true as const, insertedCount: res.insertedCount, duplicated: 0 };
  } catch (error: any) {
    if (isDuplicateKeyError(error)) {
      const writeErrors = Array.isArray(error?.writeErrors) ? error.writeErrors : [];
      const duplicated = writeErrors.filter((e: any) => e?.code === 11000).length;
      const fatal = writeErrors.some((e: any) => e?.code !== 11000);
      if (!fatal) {
        return {
          ok: true as const,
          insertedCount: Number(error?.result?.insertedCount ?? 0),
          duplicated,
        };
      }
    }
    throw error;
  }
}

export function serializeUserNotification(doc: UserNotificationDoc) {
  return {
    id: doc._id.toString(),
    userId: doc.userId.toString(),
    type: doc.type,
    title: doc.title,
    body: doc.body ?? null,
    href: doc.href ?? null,
    source: doc.source
      ? {
          collection: doc.source.collection,
          id: doc.source.id instanceof ObjectId ? doc.source.id.toString() : doc.source.id,
          kind: doc.source.kind,
        }
      : null,
    dedupeKey: doc.dedupeKey ?? null,
    createdAt: doc.createdAt.toISOString(),
    readAt: doc.readAt ? doc.readAt.toISOString() : null,
    archivedAt: doc.archivedAt ? doc.archivedAt.toISOString() : null,
    priority: doc.priority ?? "normal",
    metadata: doc.metadata ?? null,
  };
}
