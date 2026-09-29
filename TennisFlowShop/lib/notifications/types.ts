import type { ObjectId } from "mongodb";

export type UserNotificationType =
  | "message"
  | "order_status"
  | "academy_status"
  | "point_granted"
  | "point_deducted"
  | "package_status"
  | "stringing_status"
  | "racket_care"
  | "system";

export type UserNotificationPriority = "low" | "normal" | "high";

export type UserNotificationDoc = {
  _id: ObjectId;
  userId: ObjectId;
  type: UserNotificationType;
  title: string;
  body?: string;
  href?: string;
  source?: { collection?: string; id?: ObjectId | string; kind?: string };
  dedupeKey?: string;
  createdAt: Date;
  readAt: Date | null;
  archivedAt?: Date | null;
  priority?: UserNotificationPriority;
  metadata?: Record<string, unknown>;
};
