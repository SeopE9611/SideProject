import { randomBytes } from "node:crypto";
import { MongoServerError, ObjectId, type ClientSession, type Db } from "mongodb";
import { getMongoClient, getMongoDatabase } from "@/lib/mongodb";
import type { AdminPrincipal } from "@/features/admin-auth/admin-auth.types";
import { isValidStoredDonor } from "./donor.admin-repository";
import { isDonorReference, isDonorType } from "./donor.types";
import { insertDonationAuditEvent, listDonationAuditEvents } from "./donation.audit-repository";
import type { DonationAuditAction, DonationAuditChangedField, DonationAuditSnapshot } from "./donation.audit";
import {
  isCanonicalDateOnly,
  isDonationMethod,
  isDonationPurpose,
  isDonationReceiptStatus,
  isDonationReference,
  isDonationStatus,
  isValidDonationDate,
  type DonationDocument,
  type DonationMethod,
  type DonationPurpose,
  type DonationReceiptStatus,
  type DonationStatus,
} from "./donation.types";
const oid = (v: string) => {
  if (!/^[0-9a-fA-F]{24}$/.test(v)) return null;
  const x = new ObjectId(v);
  return x.toHexString() === v.toLowerCase() ? x : null;
};
const ref = () => `GFT-${randomBytes(12).toString("base64url").replace(/[-_]/g, "A").toUpperCase().slice(0, 12)}`;
export function isCanonicalMonth(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);
}
const forbiddenPlainTextPattern = /<[^>]*>|[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
const plain = (v: unknown, min: number, max: number) =>
  typeof v === "string" &&
  v === v.trim() &&
  v.length >= min &&
  v.length <= max &&
  !forbiddenPlainTextPattern.test(v) &&
  !/[\r\n\t]/.test(v);
const isMultilinePlainText = (value: unknown, maxLength: number): value is string =>
  typeof value === "string" &&
  value === value.trim() &&
  value.length <= maxLength &&
  !forbiddenPlainTextPattern.test(value) &&
  !/[\r\t]/.test(value);
export function isValidStoredDonation(v: unknown): v is DonationDocument {
  if (!v || typeof v !== "object") return false;
  const d = v as DonationDocument;
  if (
    !(d._id instanceof ObjectId) ||
    !isDonationReference(d.reference) ||
    !isCanonicalDateOnly(d.donatedOn) ||
    !Number.isSafeInteger(d.amountWon) ||
    d.amountWon < 1 ||
    d.amountWon > 1e12 ||
    !isDonationMethod(d.method) ||
    !isDonationPurpose(d.purpose) ||
    !isDonationReceiptStatus(d.receiptStatus) ||
    !isDonationStatus(d.status) ||
    !isMultilinePlainText(d.internalNote, 2000) ||
    !isValidDonationDate(d.createdAt) ||
    !isValidDonationDate(d.updatedAt) ||
    d.updatedAt < d.createdAt
  )
    return false;
  if (d.anonymous !== true && d.anonymous !== false) return false;
  if (d.anonymous) {
    if (
      d.donorId !== null ||
      d.donorReferenceSnapshot !== null ||
      d.donorNameSnapshot !== "익명" ||
      d.donorTypeSnapshot !== null
    )
      return false;
  } else if (
    !(d.donorId instanceof ObjectId) ||
    !isDonorReference(d.donorReferenceSnapshot) ||
    !plain(d.donorNameSnapshot, 1, 100) ||
    !isDonorType(d.donorTypeSnapshot)
  )
    return false;
  if (d.purpose === "general" ? d.purposeDescription !== "" : !plain(d.purposeDescription, 1, 300)) return false;
  if (d.receiptStatus === "issued" ? !isCanonicalDateOnly(d.receiptIssuedOn) : d.receiptIssuedOn !== null) return false;
  if (d.status === "draft") return d.confirmedAt === null && d.voidedAt === null && d.voidReason === "";
  if (d.status === "confirmed")
    return (
      isValidDonationDate(d.confirmedAt) && d.confirmedAt >= d.createdAt && d.voidedAt === null && d.voidReason === ""
    );
  return (
    isValidDonationDate(d.voidedAt) &&
    d.voidedAt >= d.createdAt &&
    plain(d.voidReason, 10, 500) &&
    (d.confirmedAt === null ||
      (isValidDonationDate(d.confirmedAt) && d.confirmedAt >= d.createdAt && d.voidedAt >= d.confirmedAt))
  );
}
export async function listAdminDonations(input: {
  status?: DonationStatus;
  method?: DonationMethod;
  month?: string;
  donorId?: string;
  page: number;
  pageSize: number;
}) {
  const db = await getMongoDatabase();
  let range = {};
  if (isCanonicalMonth(input.month)) {
    const [y, m] = input.month.split("-").map(Number),
      next = new Date(Date.UTC(y, m, 1));
    range = {
      donatedOn: {
        $gte: `${input.month}-01`,
        $lt: `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-01`,
      },
    };
  }
  const donorObjectId = input.donorId ? oid(input.donorId) : null;
  const ds = (
    await db
      .collection<DonationDocument>("donations")
      .find({
        ...(input.status && { status: input.status }),
        ...(input.method && { method: input.method }),
        ...(donorObjectId && { donorId: donorObjectId }),
        ...range,
      })
      .sort({ donatedOn: -1, createdAt: -1, _id: -1 })
      .toArray()
  ).filter(isValidStoredDonation);
  return {
    total: ds.length,
    items: ds
      .slice((input.page - 1) * input.pageSize, input.page * input.pageSize)
      .map((d) => ({
        id: d._id.toHexString(),
        reference: d.reference,
        donorName: d.donorNameSnapshot,
        anonymous: d.anonymous,
        donatedOn: d.donatedOn,
        amountWon: d.amountWon,
        method: d.method,
        purpose: d.purpose,
        receiptStatus: d.receiptStatus,
        status: d.status,
        updatedAt: d.updatedAt.toISOString(),
      })),
  };
}
export async function getAdminDonationCounts() {
  const db = await getMongoDatabase();
  const ds = (await db.collection<DonationDocument>("donations").find().toArray()).filter(isValidStoredDonation);
  return {
    draft: ds.filter((d) => d.status === "draft").length,
    confirmed: ds.filter((d) => d.status === "confirmed").length,
    voided: ds.filter((d) => d.status === "voided").length,
    total: ds.length,
    confirmedAmountWon: ds
      .filter((d) => d.status === "confirmed")
      .reduce((n, d) => {
        const total = n + d.amountWon;
        if (!Number.isSafeInteger(total)) throw new Error("확정 후원금 합계가 안전한 정수 범위를 초과했습니다.");
        return total;
      }, 0),
  };
}
export async function getAdminDonation(id: string) {
  const _id = oid(id);
  if (!_id) return null;
  const db = await getMongoDatabase(),
    d = await db.collection<DonationDocument>("donations").findOne({ _id });
  if (!isValidStoredDonation(d)) return null;
  return {
    ...d,
    _id: undefined,
    id,
    donorId: d.donorId?.toHexString() ?? null,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
    confirmedAt: d.confirmedAt?.toISOString() ?? null,
    voidedAt: d.voidedAt?.toISOString() ?? null,
    audit: await listDonationAuditEvents(db, _id),
  };
}
type Data = {
  donorId: string | null;
  anonymous: boolean;
  donatedOn: string;
  amountWon: number;
  method: DonationMethod;
  purpose: DonationPurpose;
  purposeDescription: string;
  receiptStatus: DonationReceiptStatus;
  receiptIssuedOn: string | null;
  status: DonationStatus;
  voidReason: string;
  internalNote: string;
};
type Reason =
  | "not_found"
  | "edit_conflict"
  | "invalid_document"
  | "invalid_transition"
  | "invalid_donor"
  | "donor_archived"
  | "immutable_fields";
type Result = { ok: true; id: string } | { ok: false; reason: Reason };
const actor = (a: AdminPrincipal) => ({ adminId: new ObjectId(a.id), displayName: a.displayName, role: a.role });
const snap = (d: DonationDocument): DonationAuditSnapshot => ({
  donorReference: d.donorReferenceSnapshot,
  anonymous: d.anonymous,
  donatedOn: d.donatedOn,
  amountWon: d.amountWon,
  method: d.method,
  purpose: d.purpose,
  purposeDescription: d.purposeDescription,
  receiptStatus: d.receiptStatus,
  receiptIssuedOn: d.receiptIssuedOn,
  status: d.status,
});
export function getDonationChangedFields(
  before: DonationDocument | null,
  after: DonationDocument,
): DonationAuditChangedField[] {
  const fields: DonationAuditChangedField[] = [];
  if (
    !before ||
    before.anonymous !== after.anonymous ||
    before.donorId?.toHexString() !== after.donorId?.toHexString() ||
    before.donorReferenceSnapshot !== after.donorReferenceSnapshot ||
    before.donorNameSnapshot !== after.donorNameSnapshot ||
    before.donorTypeSnapshot !== after.donorTypeSnapshot
  )
    fields.push("donor");
  if (!before || before.donatedOn !== after.donatedOn) fields.push("donatedOn");
  if (!before || before.amountWon !== after.amountWon) fields.push("amountWon");
  if (!before || before.method !== after.method) fields.push("method");
  if (!before || before.purpose !== after.purpose || before.purposeDescription !== after.purposeDescription)
    fields.push("purpose");
  if (!before || before.receiptStatus !== after.receiptStatus || before.receiptIssuedOn !== after.receiptIssuedOn)
    fields.push("receipt");
  if (!before || before.status !== after.status) fields.push("status");
  if (!before || before.internalNote !== after.internalNote) fields.push("internalNote");
  return fields;
}
async function donor(db: Db, data: Data, session: ClientSession) {
  if (data.anonymous) return { ok: true as const, id: null, reference: null, name: "익명", type: null };
  const id = data.donorId && oid(data.donorId);
  if (!id) return { ok: false as const, reason: "invalid_donor" as const };
  const d = await db.collection("donors").findOne({ _id: id }, { session });
  if (!isValidStoredDonor(d)) return { ok: false as const, reason: "invalid_donor" as const };
  if (d.status === "archived") return { ok: false as const, reason: "donor_archived" as const };
  return { ok: true as const, id, reference: d.reference, name: d.displayName, type: d.type };
}
export async function createAdminDonation(input: {
  donation: Data;
  actor: AdminPrincipal;
  now?: Date;
}): Promise<Result> {
  for (let a = 0; a < 3; a++) {
    const client = await getMongoClient(),
      db = await getMongoDatabase(),
      session = client.startSession(),
      _id = new ObjectId(),
      at = input.now ?? new Date();
    try {
      return await session.withTransaction(
        async () => {
          const dr = await donor(db, input.donation, session);
          if (!dr.ok) return dr;
          const d: DonationDocument = {
            _id,
            reference: ref(),
            ...input.donation,
            donorId: dr.id,
            donorReferenceSnapshot: dr.reference,
            donorNameSnapshot: dr.name,
            donorTypeSnapshot: dr.type,
            createdAt: at,
            updatedAt: at,
            confirmedAt: input.donation.status === "confirmed" ? at : null,
            voidedAt: input.donation.status === "voided" ? at : null,
          };
          await db.collection<DonationDocument>("donations").insertOne(d, { session });
          await insertDonationAuditEvent(
            db,
            {
              _id: new ObjectId(),
              donationId: _id,
              action: "created",
              actor: actor(input.actor),
              occurredAt: at,
              fromVersionAt: null,
              toVersionAt: at,
              changedFields: getDonationChangedFields(null, d),
              before: null,
              after: snap(d),
            },
            session,
          );
          return { ok: true, id: _id.toHexString() };
        },
        { readConcern: { level: "snapshot" }, writeConcern: { w: "majority" } },
      );
    } catch (e) {
      if (!(e instanceof MongoServerError && e.code === 11000) || a === 2) throw e;
    } finally {
      await session.endSession();
    }
  }
  throw new Error("reference retry exhausted");
}
const core = (d: DonationDocument, x: Data) =>
  d.anonymous !== x.anonymous ||
  d.donorId?.toHexString() !== (x.donorId ?? undefined) ||
  d.donatedOn !== x.donatedOn ||
  d.amountWon !== x.amountWon ||
  d.method !== x.method ||
  d.purpose !== x.purpose ||
  d.purposeDescription !== x.purposeDescription;
export async function updateAdminDonation(input: {
  id: string;
  expectedUpdatedAt: Date;
  donation: Data;
  actor: AdminPrincipal;
  now?: Date;
}): Promise<Result> {
  const _id = oid(input.id);
  if (!_id) return { ok: false, reason: "not_found" };
  const client = await getMongoClient(),
    db = await getMongoDatabase(),
    session = client.startSession();
  try {
    return await session.withTransaction(
      async () => {
        const old = await db.collection<DonationDocument>("donations").findOne({ _id }, { session });
        if (!old) return { ok: false, reason: "not_found" };
        if (!isValidStoredDonation(old)) return { ok: false, reason: "invalid_document" };
        if (old.updatedAt.getTime() !== input.expectedUpdatedAt.getTime())
          return { ok: false, reason: "edit_conflict" };
        if (
          (old.status === "confirmed" && input.donation.status === "draft") ||
          (old.status === "voided" && input.donation.status !== "voided")
        )
          return { ok: false, reason: "invalid_transition" };
        if (old.status === "confirmed" && core(old, input.donation)) return { ok: false, reason: "immutable_fields" };
        if (
          old.status === "voided" &&
          JSON.stringify({ ...input.donation, donorId: input.donation.donorId ?? null }) !==
            JSON.stringify({
              donorId: old.donorId?.toHexString() ?? null,
              anonymous: old.anonymous,
              donatedOn: old.donatedOn,
              amountWon: old.amountWon,
              method: old.method,
              purpose: old.purpose,
              purposeDescription: old.purposeDescription,
              receiptStatus: old.receiptStatus,
              receiptIssuedOn: old.receiptIssuedOn,
              status: old.status,
              voidReason: old.voidReason,
              internalNote: old.internalNote,
            })
        )
          return { ok: false, reason: "immutable_fields" };
        if (old.status === "voided") return { ok: true, id: input.id };
        const identityChanged =
          old.anonymous !== input.donation.anonymous ||
          old.donorId?.toHexString() !== (input.donation.donorId ?? undefined);
        const needsActiveDonor = old.status === "draft" && (identityChanged || input.donation.status === "confirmed");
        const dr = needsActiveDonor
          ? await donor(db, input.donation, session)
          : {
              ok: true as const,
              id: old.donorId,
              reference: old.donorReferenceSnapshot,
              name: old.donorNameSnapshot,
              type: old.donorTypeSnapshot,
            };
        if (!dr.ok) return dr;
        const at = new Date(Math.max((input.now ?? new Date()).getTime(), input.expectedUpdatedAt.getTime() + 1));
        const d: DonationDocument = {
          ...old,
          ...input.donation,
          donorId: dr.id,
          donorReferenceSnapshot: dr.reference,
          donorNameSnapshot: dr.name,
          donorTypeSnapshot: dr.type,
          updatedAt: at,
          confirmedAt: old.confirmedAt ?? (input.donation.status === "confirmed" ? at : null),
          voidedAt: input.donation.status === "voided" ? (old.voidedAt ?? at) : null,
        };
        const fields = getDonationChangedFields(old, d);
        const result = await db
          .collection<DonationDocument>("donations")
          .replaceOne({ _id, updatedAt: input.expectedUpdatedAt }, d, { session });
        if (!result.matchedCount) return { ok: false, reason: "edit_conflict" };
        const action: DonationAuditAction =
          old.status !== d.status ? (d.status === "confirmed" ? "confirmed" : "voided") : "updated";
        await insertDonationAuditEvent(
          db,
          {
            _id: new ObjectId(),
            donationId: _id,
            action,
            actor: actor(input.actor),
            occurredAt: at,
            fromVersionAt: old.updatedAt,
            toVersionAt: at,
            changedFields: fields,
            before: snap(old),
            after: snap(d),
          },
          session,
        );
        return { ok: true, id: input.id };
      },
      { readConcern: { level: "snapshot" }, writeConcern: { w: "majority" } },
    );
  } finally {
    await session.endSession();
  }
}
