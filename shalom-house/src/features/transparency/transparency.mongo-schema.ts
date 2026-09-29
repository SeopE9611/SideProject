import type { ObjectId } from "mongodb";
import type {
  TransparencyApprovalStatus,
  TransparencyCategory,
  TransparencyFinalDocumentStatus,
  TransparencyPrivacyReviewStatus,
  TransparencyPublicationStatus,
} from "./transparency.types";
export const TRANSPARENCY_DOCUMENT_COLLECTION_NAME = "transparency_documents";
export type MongoTransparencyDocument = {
  _id: ObjectId;
  slug: string;
  title: string;
  category: TransparencyCategory;
  periodLabel: string;
  summary: string;
  documentDate: string;
  privacyReviewStatus: TransparencyPrivacyReviewStatus;
  finalDocumentStatus: TransparencyFinalDocumentStatus;
  file: {
    bucket: string;
    objectPath: string;
    mimeType: "application/pdf";
    byteSize: number;
    sha256: string;
    originalFileName: string;
  };
  publicationStatus: TransparencyPublicationStatus;
  approvalStatus: TransparencyApprovalStatus;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
  deletedAt: Date | null;
};
