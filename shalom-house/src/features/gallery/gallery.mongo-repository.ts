import { type Filter } from "mongodb";
import { getMongoDatabase } from "@/lib/mongodb";
import {
  GALLERY_ITEM_COLLECTION_NAME,
  type MongoGalleryItemDocument,
} from "./gallery.mongo-schema";
import {
  getSeoulCalendarDate,
  isCanonicalGalleryDate,
  isGalleryConsentReadyForPublication,
  isValidGallerySlug,
} from "./gallery.types";
import type {
  GalleryRepository,
  PublicGalleryItem,
  PublicGalleryMedia,
  PublicGallerySummary,
} from "./gallery.repository";

function publicFilter(
  now = new Date(),
): Filter<MongoGalleryItemDocument> {
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
        $or: [
          { displayStartOn: null },
          { displayStartOn: { $lte: today } },
        ],
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

function toPublicGalleryItem(
  document: MongoGalleryItemDocument,
): PublicGalleryItem | null {
  const validTextFields =
    typeof document.title === "string" &&
    document.title.trim().length > 0 &&
    typeof document.category === "string" &&
    document.category.trim().length > 0 &&
    typeof document.description === "string" &&
    document.description.trim().length > 0 &&
    typeof document.altText === "string" &&
    document.altText.trim().length > 0;
  const validPublishedAt =
    document.publishedAt instanceof Date &&
    !Number.isNaN(document.publishedAt.getTime());
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
  async listPublished(): Promise<readonly PublicGallerySummary[]> {
    const documents = await (await getMongoDatabase())
      .collection<MongoGalleryItemDocument>(GALLERY_ITEM_COLLECTION_NAME)
      .find(publicFilter(), { projection })
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

    const document = await (await getMongoDatabase())
      .collection<MongoGalleryItemDocument>(GALLERY_ITEM_COLLECTION_NAME)
      .findOne({ ...publicFilter(), slug }, { projection });

    return document ? toPublicGalleryItem(document) : null;
  }

  async findMediaBySlug(slug: string): Promise<PublicGalleryMedia | null> {
    if (!isValidGallerySlug(slug)) {
      return null;
    }

    const document = await (await getMongoDatabase())
      .collection<MongoGalleryItemDocument>(GALLERY_ITEM_COLLECTION_NAME)
      .findOne({ ...publicFilter(), slug });

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
