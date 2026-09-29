import { ObjectId, type ClientSession, type Db } from "mongodb";
import type { AdminPrincipal } from "@/features/admin-auth/admin-auth.types";
import { getMongoClient, getMongoDatabase } from "@/lib/mongodb";
import { createStaffAuditSnapshot, getStaffChangedFields, staffAuditChangedFields } from "./staff.audit";
import { insertStaffAuditEvent, listAdminStaffAuditHistory } from "./staff.audit-repository";
import { STAFF_COLLECTION_NAME, type MongoStaffProfileDocument } from "./staff.mongo-schema";
import { validateStaffProfileInput } from "./staff.validation";
import { isValidStaffDate, type StaffProfileInput, type StaffPublicationStatus } from "./staff.types";
export type AdminStaffProfileListItem = {
  id: string;
  role: string;
  publicName: string;
  publicationStatus: StaffPublicationStatus;
  displayOrder: number;
  updatedAt: string;
};
export type AdminStaffProfileDetail = StaffProfileInput & {
  id: string;
  nameDisclosureConfirmedAt: string | null;
  publishedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  auditHistory: Awaited<ReturnType<typeof listAdminStaffAuditHistory>>;
};
export type SaveAdminStaffProfileResult =
  | { ok: true; id: string; created: boolean; updatedAt: string }
  | {
      ok: false;
      reason: "not_found" | "edit_conflict" | "invalid_transition" | "invalid_document";
    };
function isValidStoredStaffProfile(document: MongoStaffProfileDocument): boolean {
  const validInput = validateStaffProfileInput({
    role: document.role,
    responsibility: document.responsibility,
    name: document.name,
    showName: document.showName,
    nameDisclosureConfirmed: document.nameDisclosureConfirmed,
    nameDisclosureReference: document.nameDisclosureReference,
    publicationStatus: document.publicationStatus,
    displayOrder: document.displayOrder,
  }).ok;
  const validStatusDates =
    document.publicationStatus === "draft"
      ? document.publishedAt === null && document.archivedAt === null
      : document.publicationStatus === "published"
        ? isValidStaffDate(document.publishedAt) && document.archivedAt === null
        : document.publicationStatus === "archived"
          ? document.publishedAt === null && isValidStaffDate(document.archivedAt)
          : false;
  const validDisclosure = document.showName
    ? document.name.trim() !== "" &&
      document.nameDisclosureConfirmed === true &&
      document.nameDisclosureReference.trim() !== "" &&
      isValidStaffDate(document.nameDisclosureConfirmedAt)
    : document.nameDisclosureConfirmed === false &&
      document.nameDisclosureReference === "" &&
      document.nameDisclosureConfirmedAt === null;
  return (
    validInput &&
    document._id instanceof ObjectId &&
    isValidStaffDate(document.createdAt) &&
    isValidStaffDate(document.updatedAt) &&
    validStatusDates &&
    validDisclosure
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
function statusDates(input: StaffProfileInput, before: MongoStaffProfileDocument | null, at: Date) {
  if (input.publicationStatus === "draft") return { publishedAt: null, archivedAt: null };
  if (input.publicationStatus === "archived")
    return {
      publishedAt: null,
      archivedAt: before?.publicationStatus === "archived" ? before.archivedAt : at,
    };
  return {
    publishedAt: before?.publicationStatus === "published" ? before.publishedAt : at,
    archivedAt: null,
  };
}
function disclosureDate(input: StaffProfileInput, before: MongoStaffProfileDocument | null, at: Date) {
  if (!input.showName) return null;
  return before?.showName === true &&
    before.nameDisclosureConfirmed === true &&
    input.nameDisclosureConfirmed === true &&
    before.name === input.name &&
    before.nameDisclosureReference === input.nameDisclosureReference &&
    isValidStaffDate(before.nameDisclosureConfirmedAt)
    ? before.nameDisclosureConfirmedAt
    : at;
}
export async function listAdminStaffProfiles(): Promise<readonly AdminStaffProfileListItem[]> {
  const docs = await (
    await getMongoDatabase()
  )
    .collection<MongoStaffProfileDocument>(STAFF_COLLECTION_NAME)
    .find({})
    .sort({ publicationStatus: 1, displayOrder: 1, updatedAt: -1, _id: -1 })
    .toArray();
  return docs.flatMap((d) =>
    isValidStoredStaffProfile(d)
      ? [
          {
            id: d._id.toHexString(),
            role: d.role,
            publicName: d.showName ? d.name : "이름 비공개",
            publicationStatus: d.publicationStatus,
            displayOrder: d.displayOrder,
            updatedAt: d.updatedAt.toISOString(),
          },
        ]
      : [],
  );
}
export async function getAdminStaffProfile(id: string): Promise<AdminStaffProfileDetail | null> {
  if (!ObjectId.isValid(id)) return null;
  const d = await (
    await getMongoDatabase()
  )
    .collection<MongoStaffProfileDocument>(STAFF_COLLECTION_NAME)
    .findOne({ _id: new ObjectId(id) });
  if (!d || !isValidStoredStaffProfile(d)) return null;
  return {
    id,
    role: d.role,
    responsibility: d.responsibility,
    name: d.name,
    showName: d.showName,
    nameDisclosureConfirmed: d.nameDisclosureConfirmed,
    nameDisclosureReference: d.nameDisclosureReference,
    publicationStatus: d.publicationStatus,
    displayOrder: d.displayOrder,
    nameDisclosureConfirmedAt: d.nameDisclosureConfirmedAt?.toISOString() ?? null,
    publishedAt: d.publishedAt?.toISOString() ?? null,
    archivedAt: d.archivedAt?.toISOString() ?? null,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
    auditHistory: await listAdminStaffAuditHistory(id),
  };
}
export async function createAdminStaffProfile(
  input: StaffProfileInput,
  actor: AdminPrincipal,
  now = new Date(),
): Promise<SaveAdminStaffProfileResult> {
  const id = new ObjectId();
  const dates = statusDates(input, null, now);
  const document: MongoStaffProfileDocument = {
    _id: id,
    ...input,
    ...dates,
    nameDisclosureConfirmedAt: disclosureDate(input, null, now),
    createdAt: now,
    updatedAt: now,
  };
  return transaction(async (database, session) => {
    await database.collection<MongoStaffProfileDocument>(STAFF_COLLECTION_NAME).insertOne(document, { session });
    await insertStaffAuditEvent({
      database,
      session,
      eventId: new ObjectId(),
      staffProfileId: id,
      action: "created",
      actor,
      occurredAt: now,
      fromVersionAt: null,
      toVersionAt: now,
      before: null,
      after: createStaffAuditSnapshot(document),
      changedFields: staffAuditChangedFields,
    });
    return {
      ok: true,
      id: id.toHexString(),
      created: true,
      updatedAt: now.toISOString(),
    };
  });
}
export async function updateAdminStaffProfile(
  id: string,
  input: StaffProfileInput,
  expectedUpdatedAt: Date,
  actor: AdminPrincipal,
  now = new Date(),
): Promise<SaveAdminStaffProfileResult> {
  if (!ObjectId.isValid(id)) return { ok: false, reason: "not_found" };
  const objectId = new ObjectId(id);
  return transaction(async (database, session) => {
    const collection = database.collection<MongoStaffProfileDocument>(STAFF_COLLECTION_NAME);
    const before = await collection.findOne({ _id: objectId }, { session });
    if (!before) return { ok: false, reason: "not_found" };
    if (!isValidStoredStaffProfile(before)) return { ok: false, reason: "invalid_document" };
    if (before.updatedAt.getTime() !== expectedUpdatedAt.getTime()) return { ok: false, reason: "edit_conflict" };
    if (before.publicationStatus === "archived" && input.publicationStatus === "published")
      return { ok: false, reason: "invalid_transition" };
    const transitionAt = new Date(Math.max(now.getTime(), expectedUpdatedAt.getTime() + 1));
    const after: MongoStaffProfileDocument = {
      ...before,
      ...input,
      ...statusDates(input, before, transitionAt),
      nameDisclosureConfirmedAt: disclosureDate(input, before, transitionAt),
      updatedAt: transitionAt,
    };
    const result = await collection.replaceOne({ _id: objectId, updatedAt: expectedUpdatedAt }, after, { session });
    if (result.modifiedCount !== 1) return { ok: false, reason: "edit_conflict" };
    await insertStaffAuditEvent({
      database,
      session,
      eventId: new ObjectId(),
      staffProfileId: objectId,
      action: "updated",
      actor,
      occurredAt: transitionAt,
      fromVersionAt: expectedUpdatedAt,
      toVersionAt: transitionAt,
      before: createStaffAuditSnapshot(before),
      after: createStaffAuditSnapshot(after),
      changedFields: getStaffChangedFields(before, after),
    });
    return {
      ok: true,
      id,
      created: false,
      updatedAt: transitionAt.toISOString(),
    };
  });
}
export async function getAdminStaffCounts() {
  const collection = (await getMongoDatabase()).collection<MongoStaffProfileDocument>(STAFF_COLLECTION_NAME);
  const [total, published] = await Promise.all([
    collection.countDocuments({}),
    collection.countDocuments({ publicationStatus: "published" }),
  ]);
  return { total, published };
}
