import { createHash, randomBytes } from "node:crypto";
import { MongoServerError, ObjectId, type Db } from "mongodb";
import { getMongoDatabase } from "@/lib/mongodb";
import { inquiryPrivacyConsentVersion, type InquiryDocument, type InquiryKind } from "./inquiry.types";
export type CreatePublicInquiryResult = { ok: true; reference: string } | { ok: false; reason: "rate_limited" | "unavailable" };
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
export function createInquiryReference(): string { const bytes = randomBytes(12); return `INQ-${Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("")}`; }
async function incrementInquirySubmissionLimit(db: Db, input: { keyHash: string; windowStartedAt: Date; expiresAt: Date }): Promise<number> {
  const filter = { keyHash: input.keyHash, windowStartedAt: input.windowStartedAt };
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const limit = await db.collection("inquiry_submission_limits").findOneAndUpdate(filter, { $inc: { count: 1 }, $setOnInsert: { expiresAt: input.expiresAt } }, { upsert: attempt === 0, returnDocument: "after" });
      if (limit && Number.isFinite(limit.count) && Number.isInteger(limit.count) && limit.count > 0) return limit.count;
    } catch (error) {
      if (!(error instanceof MongoServerError && error.code === 11000) || attempt === 2) throw error;
    }
  }
  throw new Error("InquirySubmissionLimitIncrementFailed");
}
export async function createPublicInquiry(input: { kind: InquiryKind; name: string; phone: string; email: string; message: string; clientAddress: string; now?: Date }): Promise<CreatePublicInquiryResult> {
  try {
    const db = await getMongoDatabase(); const now = input.now ?? new Date(); const windowMs = 30 * 60 * 1000;
    const windowStartedAt = new Date(Math.floor(now.getTime() / windowMs) * windowMs);
    const keyHash = createHash("sha256").update(`shalom-inquiry-rate-limit\n${input.clientAddress}`).digest("hex");
    const count = await incrementInquirySubmissionLimit(db, { keyHash, windowStartedAt, expiresAt: new Date(windowStartedAt.getTime() + 45 * 60 * 1000) });
    if (count > 5) return { ok: false, reason: "rate_limited" };
    for (let attempt = 0; attempt < 3; attempt++) { const reference = createInquiryReference(); try { await db.collection<InquiryDocument>("inquiries").insertOne({ _id: new ObjectId(), reference, kind: input.kind, status: "received", name: input.name, phone: input.phone, email: input.email, message: input.message, privacyConsentVersion: inquiryPrivacyConsentVersion, privacyConsentedAt: now, internalNote: "", createdAt: now, updatedAt: now, completedAt: null, archivedAt: null, deleteAfter: null }); return { ok: true, reference }; } catch (error) { if (!(error instanceof MongoServerError && error.code === 11000) || attempt === 2) throw error; } }
    return { ok: false, reason: "unavailable" };
  } catch { return { ok: false, reason: "unavailable" }; }
}
