import { randomUUID } from "crypto";
import { ObjectId, type Db, type Document, type Filter } from "mongodb";

import {
  acquireAdminExecutionLock,
  releaseAdminExecutionLock,
} from "@/lib/admin/adminExecutionLock";

const APPLICATION_COLLECTION_NAME = "academy_lesson_applications";
const CLASS_COLLECTION_NAME = "academy_classes";
const LOCK_TTL_MS = 15_000;
const LOCK_RETRY_COUNT = 20;
const LOCK_RETRY_DELAY_MS = 50;

export const ACADEMY_CLASS_FULL_ERROR = {
  success: false as const,
  code: "ACADEMY_CLASS_FULL" as const,
  message: "정원이 마감된 클래스입니다.",
};

function buildClassApplicationFilter(classId: string): Filter<Document> {
  const matchers: unknown[] = [classId];
  if (ObjectId.isValid(classId)) matchers.push(new ObjectId(classId));
  return { $or: [{ classId: { $in: matchers } }, { "classSnapshot.classId": classId }] };
}

export function getAcademyApplicationClassId(application: Document) {
  const value = application.classId ?? application.classSnapshot?.classId;
  if (value instanceof ObjectId) return value.toHexString();
  return typeof value === "string" ? value : "";
}

export async function acquireAcademyClassCapacityLocks(db: Db, classIds: string[]) {
  const ids = [...new Set(classIds.filter((id) => ObjectId.isValid(id)))].sort();
  const owner = randomUUID();
  const acquiredKeys: string[] = [];

  for (const classId of ids) {
    const lockKey = `admin.academy.class-capacity:${classId}`;
    let acquired = false;
    for (let attempt = 0; attempt < LOCK_RETRY_COUNT; attempt += 1) {
      const result = await acquireAdminExecutionLock({
        db,
        lockKey,
        owner,
        ttlMs: LOCK_TTL_MS,
        meta: { classId },
      });
      if (result.ok) {
        acquired = true;
        acquiredKeys.push(lockKey);
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, LOCK_RETRY_DELAY_MS));
    }

    if (!acquired) {
      await Promise.all(acquiredKeys.map((key) => releaseAdminExecutionLock(db, key, owner)));
      return null;
    }
  }

  return async () => {
    for (const lockKey of acquiredKeys.reverse()) {
      await releaseAdminExecutionLock(db, lockKey, owner);
    }
  };
}

export async function acquireAcademyApplicationLock(db: Db, applicationId: string) {
  const owner = randomUUID();
  const lockKey = `admin.academy.application:${applicationId}`;
  for (let attempt = 0; attempt < LOCK_RETRY_COUNT; attempt += 1) {
    const result = await acquireAdminExecutionLock({
      db,
      lockKey,
      owner,
      ttlMs: LOCK_TTL_MS,
      meta: { applicationId },
    });
    if (result.ok) {
      return () => releaseAdminExecutionLock(db, lockKey, owner);
    }
    await new Promise((resolve) => setTimeout(resolve, LOCK_RETRY_DELAY_MS));
  }
  return null;
}

export async function getAcademyClass(db: Db, classId: string) {
  if (!ObjectId.isValid(classId)) return null;
  return db.collection(CLASS_COLLECTION_NAME).findOne({ _id: new ObjectId(classId) });
}

export async function isAcademyClassAtCapacity(
  db: Db,
  academyClass: Document,
  applicationId: ObjectId,
) {
  const capacity =
    typeof academyClass.capacity === "number" ? Math.trunc(academyClass.capacity) : null;
  if (!capacity || capacity <= 0) return false;

  const classId = String(academyClass._id);
  const confirmedCount = await db.collection(APPLICATION_COLLECTION_NAME).countDocuments({
    ...buildClassApplicationFilter(classId),
    _id: { $ne: applicationId },
    status: "confirmed",
    adminDeletedAt: { $exists: false },
  });
  return confirmedCount >= capacity;
}

export async function reconcileAcademyClassCapacity(db: Db, academyClass: Document) {
  const capacity =
    typeof academyClass.capacity === "number" ? Math.trunc(academyClass.capacity) : null;
  if (!capacity || capacity <= 0) {
    return { classAutoClosed: false, confirmedCount: null, capacity };
  }

  const confirmedCount = await db.collection(APPLICATION_COLLECTION_NAME).countDocuments({
    ...buildClassApplicationFilter(String(academyClass._id)),
    status: "confirmed",
    adminDeletedAt: { $exists: false },
  });
  const now = new Date().toISOString();

  if (academyClass.status === "visible" && confirmedCount >= capacity) {
    const result = await db
      .collection(CLASS_COLLECTION_NAME)
      .updateOne(
        { _id: academyClass._id, status: "visible" },
        { $set: { status: "closed", capacityAutoClosedAt: now, updatedAt: now } },
      );
    return { classAutoClosed: result.modifiedCount > 0, confirmedCount, capacity };
  }

  if (
    academyClass.status === "closed" &&
    academyClass.capacityAutoClosedAt &&
    confirmedCount < capacity
  ) {
    await db
      .collection(CLASS_COLLECTION_NAME)
      .updateOne(
        { _id: academyClass._id, status: "closed", capacityAutoClosedAt: { $exists: true } },
        { $set: { status: "visible", updatedAt: now }, $unset: { capacityAutoClosedAt: "" } },
      );
  }

  return { classAutoClosed: false, confirmedCount, capacity };
}
