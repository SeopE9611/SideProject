import { ObjectId, type ClientSession, type Db } from "mongodb";
import type { AdminPrincipal } from "@/features/admin-auth/admin-auth.types";
import { getMongoClient, getMongoDatabase } from "@/lib/mongodb";
import {
  createFacilitySpaceAuditSnapshot,
  getFacilitySpaceChangedFields,
  facilitySpaceAuditChangedFields,
} from "./facility-space.audit";
import { insertFacilitySpaceAuditEvent, listAdminFacilitySpaceAuditHistory } from "./facility-space.audit-repository";
import { FACILITY_SPACE_COLLECTION_NAME, type MongoFacilitySpaceDocument } from "./facility-space.mongo-schema";
import { validateFacilitySpaceInput } from "./facility-space.validation";
import {
  isValidFacilitySpaceDate,
  type FacilitySpaceInput,
  type FacilitySpacePublicationStatus,
} from "./facility-space.types";
export type AdminFacilitySpaceListItem = {
  id: string;
  title: string;
  publicationStatus: FacilitySpacePublicationStatus;
  displayOrder: number;
  updatedAt: string;
};
export type AdminFacilitySpaceDetail = FacilitySpaceInput & {
  id: string;
  publishedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  auditHistory: Awaited<ReturnType<typeof listAdminFacilitySpaceAuditHistory>>;
};
export type SaveAdminFacilitySpaceResult =
  | { ok: true; id: string; created: boolean; updatedAt: string }
  | { ok: false; reason: "not_found" | "edit_conflict" | "invalid_transition" | "invalid_document" };
function isValidStoredFacilitySpace(d: MongoFacilitySpaceDocument): boolean {
  const validInput = validateFacilitySpaceInput({
    title: d.title,
    description: d.description,
    publicationStatus: d.publicationStatus,
    displayOrder: d.displayOrder,
  }).ok;
  const validDates =
    d.publicationStatus === "draft"
      ? d.publishedAt === null && d.archivedAt === null
      : d.publicationStatus === "published"
        ? isValidFacilitySpaceDate(d.publishedAt) && d.archivedAt === null
        : d.publicationStatus === "archived"
          ? d.publishedAt === null && isValidFacilitySpaceDate(d.archivedAt)
          : false;
  return (
    validInput &&
    d._id instanceof ObjectId &&
    isValidFacilitySpaceDate(d.createdAt) &&
    isValidFacilitySpaceDate(d.updatedAt) &&
    validDates
  );
}
async function transaction<T>(work: (database: Db, session: ClientSession) => Promise<T>): Promise<T> {
  const client = await getMongoClient();
  const database = await getMongoDatabase();
  const session = client.startSession();
  try {
    return await session.withTransaction(() => work(database, session), {
      readConcern: { level: "snapshot" },
      writeConcern: { w: "majority" },
    });
  } finally {
    await session.endSession();
  }
}
function statusDates(input: FacilitySpaceInput, before: MongoFacilitySpaceDocument | null, at: Date) {
  if (input.publicationStatus === "draft") return { publishedAt: null, archivedAt: null };
  if (input.publicationStatus === "archived")
    return { publishedAt: null, archivedAt: before?.publicationStatus === "archived" ? before.archivedAt : at };
  return { publishedAt: before?.publicationStatus === "published" ? before.publishedAt : at, archivedAt: null };
}
export async function listAdminFacilitySpaces(): Promise<readonly AdminFacilitySpaceListItem[]> {
  const docs = await (
    await getMongoDatabase()
  )
    .collection<MongoFacilitySpaceDocument>(FACILITY_SPACE_COLLECTION_NAME)
    .find({})
    .sort({ publicationStatus: 1, displayOrder: 1, updatedAt: -1, _id: -1 })
    .toArray();
  return docs.flatMap((d) =>
    isValidStoredFacilitySpace(d)
      ? [
          {
            id: d._id.toHexString(),
            title: d.title,
            publicationStatus: d.publicationStatus,
            displayOrder: d.displayOrder,
            updatedAt: d.updatedAt.toISOString(),
          },
        ]
      : [],
  );
}
export async function getAdminFacilitySpace(id: string): Promise<AdminFacilitySpaceDetail | null> {
  if (!ObjectId.isValid(id) || new ObjectId(id).toHexString() !== id.toLowerCase()) return null;
  const d = await (
    await getMongoDatabase()
  )
    .collection<MongoFacilitySpaceDocument>(FACILITY_SPACE_COLLECTION_NAME)
    .findOne({ _id: new ObjectId(id) });
  if (!d || !isValidStoredFacilitySpace(d)) return null;
  return {
    id,
    title: d.title,
    description: d.description,
    publicationStatus: d.publicationStatus,
    displayOrder: d.displayOrder,
    publishedAt: d.publishedAt?.toISOString() ?? null,
    archivedAt: d.archivedAt?.toISOString() ?? null,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
    auditHistory: await listAdminFacilitySpaceAuditHistory(id),
  };
}
export async function createAdminFacilitySpace(
  input: FacilitySpaceInput,
  actor: AdminPrincipal,
  now = new Date(),
): Promise<SaveAdminFacilitySpaceResult> {
  const id = new ObjectId();
  const document: MongoFacilitySpaceDocument = {
    _id: id,
    ...input,
    ...statusDates(input, null, now),
    createdAt: now,
    updatedAt: now,
  };
  return transaction(async (database, session) => {
    await database
      .collection<MongoFacilitySpaceDocument>(FACILITY_SPACE_COLLECTION_NAME)
      .insertOne(document, { session });
    await insertFacilitySpaceAuditEvent({
      database,
      session,
      eventId: new ObjectId(),
      facilitySpaceId: id,
      action: "created",
      actor,
      occurredAt: now,
      fromVersionAt: null,
      toVersionAt: now,
      before: null,
      after: createFacilitySpaceAuditSnapshot(document),
      changedFields: facilitySpaceAuditChangedFields,
    });
    return { ok: true, id: id.toHexString(), created: true, updatedAt: now.toISOString() };
  });
}
export async function updateAdminFacilitySpace(
  id: string,
  input: FacilitySpaceInput,
  expectedUpdatedAt: Date,
  actor: AdminPrincipal,
  now = new Date(),
): Promise<SaveAdminFacilitySpaceResult> {
  if (!ObjectId.isValid(id)) return { ok: false, reason: "not_found" };
  const objectId = new ObjectId(id);
  return transaction(async (database, session) => {
    const collection = database.collection<MongoFacilitySpaceDocument>(FACILITY_SPACE_COLLECTION_NAME);
    const before = await collection.findOne({ _id: objectId }, { session });
    if (!before) return { ok: false, reason: "not_found" };
    if (!isValidStoredFacilitySpace(before)) return { ok: false, reason: "invalid_document" };
    if (before.updatedAt.getTime() !== expectedUpdatedAt.getTime()) return { ok: false, reason: "edit_conflict" };
    if (before.publicationStatus === "archived" && input.publicationStatus === "published")
      return { ok: false, reason: "invalid_transition" };
    const transitionAt = new Date(Math.max(now.getTime(), expectedUpdatedAt.getTime() + 1));
    const after = { ...before, ...input, ...statusDates(input, before, transitionAt), updatedAt: transitionAt };
    const result = await collection.replaceOne({ _id: objectId, updatedAt: expectedUpdatedAt }, after, { session });
    if (result.modifiedCount !== 1) return { ok: false, reason: "edit_conflict" };
    await insertFacilitySpaceAuditEvent({
      database,
      session,
      eventId: new ObjectId(),
      facilitySpaceId: objectId,
      action: "updated",
      actor,
      occurredAt: transitionAt,
      fromVersionAt: expectedUpdatedAt,
      toVersionAt: transitionAt,
      before: createFacilitySpaceAuditSnapshot(before),
      after: createFacilitySpaceAuditSnapshot(after),
      changedFields: getFacilitySpaceChangedFields(before, after),
    });
    return { ok: true, id, created: false, updatedAt: transitionAt.toISOString() };
  });
}
export async function getAdminFacilitySpaceCounts() {
  const docs = await (
    await getMongoDatabase()
  )
    .collection<MongoFacilitySpaceDocument>(FACILITY_SPACE_COLLECTION_NAME)
    .find({})
    .toArray();
  const valid = docs.filter(isValidStoredFacilitySpace);
  return { total: valid.length, published: valid.filter((d) => d.publicationStatus === "published").length };
}
