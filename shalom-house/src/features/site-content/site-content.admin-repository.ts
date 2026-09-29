import { MongoServerError, ObjectId, type ClientSession, type Db } from "mongodb";
import { getMongoClient, getMongoDatabase } from "@/lib/mongodb";
import type { AdminPrincipal } from "@/features/admin-auth/admin-auth.types";
import {
  defaultContactInformationContent,
  defaultDonationGuidanceContent,
  defaultFacilityOverviewContent,
  defaultGreetingContent,
} from "./site-content.defaults";
import { insertSiteContentAuditEvent } from "./site-content.audit-repository";
import { getSiteContentChangedFields } from "./site-content.audit";
import { SITE_CONTENT_COLLECTION_NAME, type MongoSiteContentDocument } from "./site-content.mongo-schema";
import type {
  ContactInformationContent,
  DonationGuidanceContent,
  FacilityOverviewContent,
  GreetingContent,
  SiteContentKey,
} from "./site-content.types";
import {
  validateContactInformationInput,
  validateDonationGuidanceInput,
  validateFacilityOverviewInput,
  validateGreetingInput,
} from "./site-content.validation";

export type AdminSiteContentDetail =
  | {
      key: "facility-overview";
      persisted: boolean;
      content: FacilityOverviewContent;
      updatedAt: string | null;
    }
  | {
      key: "greeting";
      persisted: boolean;
      content: GreetingContent;
      updatedAt: string | null;
    }
  | {
      key: "contact-information";
      persisted: boolean;
      content: ContactInformationContent;
      updatedAt: string | null;
    }
  | {
      key: "donation-guidance";
      persisted: boolean;
      content: DonationGuidanceContent;
      updatedAt: string | null;
    };
export type SaveAdminSiteContentResult =
  | { ok: true; key: SiteContentKey; created: boolean; updatedAt: string }
  | { ok: false; reason: "not_found" | "edit_conflict" | "invalid_document" };

function validDate(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}
function nextDate(expected: Date, now: Date) {
  return new Date(Math.max(now.getTime(), expected.getTime() + 1));
}

export function getAdminSiteContent(
  key: "facility-overview",
): Promise<Extract<AdminSiteContentDetail, { key: "facility-overview" }>>;
export function getAdminSiteContent(key: "greeting"): Promise<Extract<AdminSiteContentDetail, { key: "greeting" }>>;
export function getAdminSiteContent(
  key: "contact-information",
): Promise<Extract<AdminSiteContentDetail, { key: "contact-information" }>>;
export function getAdminSiteContent(
  key: "donation-guidance",
): Promise<Extract<AdminSiteContentDetail, { key: "donation-guidance" }>>;
export async function getAdminSiteContent(key: SiteContentKey): Promise<AdminSiteContentDetail> {
  const document = await (
    await getMongoDatabase()
  )
    .collection<MongoSiteContentDocument>(SITE_CONTENT_COLLECTION_NAME)
    .findOne({ key });
  const fallback = (() => {
    switch (key) {
      case "facility-overview":
        return defaultFacilityOverviewContent;
      case "greeting":
        return defaultGreetingContent;
      case "contact-information":
        return defaultContactInformationContent;
      case "donation-guidance":
        return defaultDonationGuidanceContent;
    }
  })();
  if (!document)
    return {
      key,
      persisted: false,
      content: fallback,
      updatedAt: null,
    } as AdminSiteContentDetail;
  if (!validDate(document.updatedAt)) throw new Error("공식 콘텐츠 수정 시각이 유효하지 않습니다.");
  const result = (() => {
    switch (key) {
      case "facility-overview":
        return validateFacilityOverviewInput(document.content);
      case "greeting":
        return validateGreetingInput(document.content);
      case "contact-information":
        return validateContactInformationInput(document.content);
      case "donation-guidance":
        return validateDonationGuidanceInput(document.content);
    }
  })();
  if (!result.ok) throw new Error("공식 콘텐츠 문서가 유효하지 않습니다.");
  return {
    key,
    persisted: true,
    content: result.value,
    updatedAt: document.updatedAt.toISOString(),
  } as AdminSiteContentDetail;
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

export async function saveAdminSiteContent(input: {
  key: SiteContentKey;
  content: FacilityOverviewContent | GreetingContent | ContactInformationContent | DonationGuidanceContent;
  expectedUpdatedAt: Date | null;
  actor: AdminPrincipal;
  now?: Date;
}): Promise<SaveAdminSiteContentResult> {
  const now = input.now ?? new Date();
  try {
    return await transaction(async (database, session) => {
      const collection = database.collection<MongoSiteContentDocument>(SITE_CONTENT_COLLECTION_NAME);
      const existing = await collection.findOne({ key: input.key }, { session });
      if (input.expectedUpdatedAt === null && existing) return { ok: false, reason: "edit_conflict" };
      if (input.expectedUpdatedAt !== null && !existing) return { ok: false, reason: "not_found" };
      if (existing) {
        if (!validDate(existing.updatedAt)) return { ok: false, reason: "invalid_document" };
        const validation = (() => {
          switch (input.key) {
            case "facility-overview":
              return validateFacilityOverviewInput(existing.content);
            case "greeting":
              return validateGreetingInput(existing.content);
            case "contact-information":
              return validateContactInformationInput(existing.content);
            case "donation-guidance":
              return validateDonationGuidanceInput(existing.content);
          }
        })();
        if (!validation.ok) return { ok: false, reason: "invalid_document" };
      }
      const transitionAt = input.expectedUpdatedAt === null ? now : nextDate(input.expectedUpdatedAt, now);
      if (!existing)
        await collection.insertOne(
          {
            _id: new ObjectId(),
            key: input.key,
            content: input.content,
            createdAt: transitionAt,
            updatedAt: transitionAt,
          } as MongoSiteContentDocument,
          { session },
        );
      else {
        const updated = await database
          .collection(SITE_CONTENT_COLLECTION_NAME)
          .updateOne(
            { key: input.key, updatedAt: input.expectedUpdatedAt! },
            { $set: { content: input.content, updatedAt: transitionAt } },
            { session },
          );
        if (updated.matchedCount !== 1) return { ok: false, reason: "edit_conflict" };
      }
      await insertSiteContentAuditEvent({
        database,
        session,
        eventId: new ObjectId(),
        siteContentKey: input.key,
        action: existing ? "updated" : "created",
        actor: input.actor,
        occurredAt: transitionAt,
        fromVersionAt: input.expectedUpdatedAt,
        toVersionAt: transitionAt,
        before: existing?.content ?? null,
        after: input.content,
        changedFields: getSiteContentChangedFields(input.key, existing?.content ?? null, input.content),
      });
      return {
        ok: true,
        key: input.key,
        created: !existing,
        updatedAt: transitionAt.toISOString(),
      };
    });
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) return { ok: false, reason: "edit_conflict" };
    throw error;
  }
}
