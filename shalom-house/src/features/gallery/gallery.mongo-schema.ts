import type { ObjectId } from "mongodb";
import type {
  GalleryApprovalStatus,
  GalleryConsentStatus,
  GalleryPublicationStatus,
  GallerySubjectPresence,
} from "./gallery.types";
export const GALLERY_ITEM_COLLECTION_NAME = "gallery_items";
export type MongoGalleryItemDocument = {
  _id: ObjectId;
  slug: string;
  title: string;
  category: string;
  description: string;
  altText: string;
  activityDate: string;
  subjectPresence: GallerySubjectPresence;
  consentStatus: GalleryConsentStatus;
  consentCheckedOn: string | null;
  consentReferenceCode: string | null;
  displayStartOn: string | null;
  displayEndOn: string | null;
  media: {
    bucket: string;
    objectPath: string;
    mimeType: "image/webp";
    byteSize: number;
    width: number;
    height: number;
    sha256: string;
    originalFileName: string;
  };
  publicationStatus: GalleryPublicationStatus;
  approvalStatus: GalleryApprovalStatus;
  publishedAt: Date | null;
  consentWithdrawnAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
  deletedAt?: Date | null;
};
