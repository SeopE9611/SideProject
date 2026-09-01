import { ObjectId, type Filter } from "mongodb";
import { getMongoDatabase } from "@/lib/mongodb";
import { GALLERY_ITEM_COLLECTION_NAME, type MongoGalleryItemDocument } from "./gallery.mongo-schema";
import {
  ADMIN_GALLERY_IMAGE_MAX_BYTES,
  ADMIN_GALLERY_IMAGE_MAX_DIMENSION,
  normalizeAdminGalleryOriginalFileName,
} from "./gallery.admin-validation";
import { getGalleryPrivateBucketName } from "./gallery.storage";
import {
  getSeoulCalendarDate,
  isCanonicalGalleryDate,
  isGalleryConsentReadyForPublication,
  isGalleryApprovalStatus,
  isGalleryConsentStatus,
  isGalleryPublicationStatus,
  isGallerySubjectPresence,
  isValidGallerySlug,
} from "./gallery.types";
import type {
  GalleryRepository,
  PublicGalleryItem,
  PublicGalleryMedia,
  PublicGallerySummary,
  PublicGalleryCoverReference,
} from "./gallery.repository";

export function publicGalleryFilter(now = new Date()): Filter<MongoGalleryItemDocument> {
  const today = getSeoulCalendarDate(now);

  return {
    publicationStatus: "published",
    approvalStatus: "approved",
    publishedAt: { $ne: null, $lte: now },
    archivedAt: null,
    consentWithdrawnAt: null,
    $and: [
      { $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }] },
      {
        $or: [{ displayStartOn: null }, { displayStartOn: { $lte: today } }],
      },
      {
        $or: [{ displayEndOn: null }, { displayEndOn: { $gte: today } }],
      },
      {
        $or: [
          {
            subjectPresence: { $in: ["none", "non_identifiable"] },
            consentStatus: "not_required",
            consentCheckedOn: null,
            consentReferenceCode: null,
          },
          {
            subjectPresence: "identifiable",
            consentStatus: "confirmed",
            consentCheckedOn: { $type: "string" },
            consentReferenceCode: { $type: "string" },
          },
        ],
      },
    ],
  };
}

const projection = {
  slug: 1,
  title: 1,
  category: 1,
  description: 1,
  altText: 1,
  activityDate: 1,
  "media.width": 1,
  "media.height": 1,
  publishedAt: 1,
  subjectPresence: 1,
  consentStatus: 1,
  consentCheckedOn: 1,
  consentReferenceCode: 1,
  consentWithdrawnAt: 1,
} as const;

export function isValidStoredGalleryItem(document: MongoGalleryItemDocument): boolean {
  const validDate = (value: unknown): value is Date => value instanceof Date && !Number.isNaN(value.getTime());
  const nullableDate = (value: unknown) => value === null || validDate(value);
  const nullableCalendarDate = (value: unknown) => value === null || isCanonicalGalleryDate(value);
  const validReference = document.consentReferenceCode === null ||
    typeof document.consentReferenceCode === "string" && /^[A-Za-z0-9_-]{1,80}$/.test(document.consentReferenceCode);
  const noConsentRequired = (document.subjectPresence === "none" || document.subjectPresence === "non_identifiable") &&
    document.consentStatus === "not_required" && document.consentCheckedOn === null &&
    document.consentReferenceCode === null && document.consentWithdrawnAt === null;
  const identifiablePending = document.subjectPresence === "identifiable" && document.consentStatus === "pending" &&
    document.consentCheckedOn === null && document.consentReferenceCode === null && document.consentWithdrawnAt === null;
  const identifiableConfirmed = document.subjectPresence === "identifiable" && document.consentStatus === "confirmed" &&
    isCanonicalGalleryDate(document.consentCheckedOn) && document.consentReferenceCode !== null &&
    validReference && document.consentWithdrawnAt === null;
  const identifiableWithdrawn = document.subjectPresence === "identifiable" && document.consentStatus === "withdrawn" &&
    isCanonicalGalleryDate(document.consentCheckedOn) && document.consentReferenceCode !== null && validReference &&
    validDate(document.consentWithdrawnAt) && validDate(document.updatedAt) && document.consentWithdrawnAt <= document.updatedAt;
  const media = document.media;
  return document._id instanceof ObjectId && isValidGallerySlug(document.slug) &&
    [document.title, document.category, document.description, document.altText].every(
      (value) => typeof value === "string" && value === value.trim() && value.length > 0,
    ) && isCanonicalGalleryDate(document.activityDate) &&
    isGallerySubjectPresence(document.subjectPresence) && isGalleryConsentStatus(document.consentStatus) &&
    isGalleryPublicationStatus(document.publicationStatus) && isGalleryApprovalStatus(document.approvalStatus) &&
    validDate(document.createdAt) && validDate(document.updatedAt) && document.updatedAt >= document.createdAt &&
    nullableDate(document.publishedAt) && nullableDate(document.archivedAt) &&
    (document.deletedAt === undefined || nullableDate(document.deletedAt)) && nullableDate(document.consentWithdrawnAt) &&
    nullableCalendarDate(document.displayStartOn) && nullableCalendarDate(document.displayEndOn) &&
    (document.displayStartOn === null || document.displayEndOn === null || document.displayStartOn <= document.displayEndOn) &&
    nullableCalendarDate(document.consentCheckedOn) && validReference &&
    (noConsentRequired || identifiablePending || identifiableConfirmed || identifiableWithdrawn) &&
    Boolean(media) && media.bucket === getGalleryPrivateBucketName() &&
    media.objectPath === `shalom-house/gallery/${document._id.toHexString()}/image.webp` &&
    media.mimeType === "image/webp" && Number.isSafeInteger(media.byteSize) && media.byteSize >= 1 &&
    media.byteSize <= ADMIN_GALLERY_IMAGE_MAX_BYTES && Number.isSafeInteger(media.width) && media.width >= 1 &&
    media.width <= ADMIN_GALLERY_IMAGE_MAX_DIMENSION && Number.isSafeInteger(media.height) && media.height >= 1 &&
    media.height <= ADMIN_GALLERY_IMAGE_MAX_DIMENSION && /^[a-f0-9]{64}$/.test(media.sha256) &&
    normalizeAdminGalleryOriginalFileName(media.originalFileName) === media.originalFileName;
}

export function toPublicGalleryItem(document: MongoGalleryItemDocument): PublicGalleryItem | null {
  const validTextFields =
    typeof document.title === "string" &&
    document.title.trim().length > 0 &&
    typeof document.category === "string" &&
    document.category.trim().length > 0 &&
    typeof document.description === "string" &&
    document.description.trim().length > 0 &&
    typeof document.altText === "string" &&
    document.altText.trim().length > 0;
  const validPublishedAt = document.publishedAt instanceof Date && !Number.isNaN(document.publishedAt.getTime());
  const validDimensions =
    Number.isInteger(document.media?.width) &&
    document.media.width > 0 &&
    Number.isInteger(document.media?.height) &&
    document.media.height > 0;

  if (
    !isValidGallerySlug(document.slug) ||
    !validTextFields ||
    !isCanonicalGalleryDate(document.activityDate) ||
    !validPublishedAt ||
    !validDimensions ||
    !isGalleryConsentReadyForPublication(document)
  ) {
    return null;
  }

  const publishedAt = document.publishedAt;
  if (!(publishedAt instanceof Date)) {
    return null;
  }

  return {
    slug: document.slug,
    title: document.title,
    category: document.category,
    description: document.description,
    altText: document.altText,
    activityDate: document.activityDate,
    width: document.media.width,
    height: document.media.height,
    publishedAt: publishedAt.toISOString(),
  };
}

export class MongoGalleryRepository implements GalleryRepository {
  async findPublicCoverById(id: ObjectId): Promise<PublicGalleryCoverReference | null> {
    return (await this.findPublicCoversByIds([id])).get(id.toHexString()) ?? null;
  }

  async findPublicCoversByIds(ids: readonly ObjectId[]): Promise<ReadonlyMap<string, PublicGalleryCoverReference>> {
    const unique = [...new Map(ids.map((id) => [id.toHexString(), id])).values()];
    if (unique.length === 0) return new Map();
    const documents = await (await getMongoDatabase())
      .collection<MongoGalleryItemDocument>(GALLERY_ITEM_COLLECTION_NAME)
      .find({ ...publicGalleryFilter(), _id: { $in: unique } }, { projection: { ...projection, _id: 1 } })
      .toArray();
    const result = new Map<string, PublicGalleryCoverReference>();
    for (const document of documents) {
      const item = toPublicGalleryItem(document);
      if (item) result.set(document._id.toHexString(), {
        id: document._id.toHexString(), slug: item.slug, title: item.title, altText: item.altText,
        width: item.width, height: item.height, mediaUrl: `/api/gallery/${encodeURIComponent(item.slug)}/media`,
      });
    }
    return result;
  }
  async listPublished(): Promise<readonly PublicGallerySummary[]> {
    const documents = await (
      await getMongoDatabase()
    )
      .collection<MongoGalleryItemDocument>(GALLERY_ITEM_COLLECTION_NAME)
      .find(publicGalleryFilter(), { projection })
      .sort({ activityDate: -1, publishedAt: -1, _id: -1 })
      .limit(60)
      .toArray();

    return documents.flatMap((document) => {
      const item = toPublicGalleryItem(document);
      return item ? [item] : [];
    });
  }

  async findPublishedBySlug(slug: string) {
    if (!isValidGallerySlug(slug)) {
      return null;
    }

    const document = await (
      await getMongoDatabase()
    )
      .collection<MongoGalleryItemDocument>(GALLERY_ITEM_COLLECTION_NAME)
      .findOne({ ...publicGalleryFilter(), slug }, { projection });

    return document ? toPublicGalleryItem(document) : null;
  }

  async findMediaBySlug(slug: string): Promise<PublicGalleryMedia | null> {
    if (!isValidGallerySlug(slug)) {
      return null;
    }

    const document = await (
      await getMongoDatabase()
    )
      .collection<MongoGalleryItemDocument>(GALLERY_ITEM_COLLECTION_NAME)
      .findOne({ ...publicGalleryFilter(), slug });

    if (!document || !toPublicGalleryItem(document)) {
      return null;
    }

    return {
      bucket: document.media.bucket,
      objectPath: document.media.objectPath,
      mimeType: document.media.mimeType,
      byteSize: document.media.byteSize,
    };
  }
}
