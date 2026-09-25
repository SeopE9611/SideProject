import type { ObjectId } from "mongodb";

export const facilitySpacePublicationStatuses = ["draft", "published", "archived"] as const;
export type FacilitySpacePublicationStatus = (typeof facilitySpacePublicationStatuses)[number];
export type FacilitySpaceInput = {
  title: string;
  description: string;
  publicationStatus: FacilitySpacePublicationStatus;
  displayOrder: number;
};
export type FacilitySpaceMedia = {
  bucket: string;
  objectPath: string;
  mimeType: "image/webp";
  byteSize: number;
  width: number;
  height: number;
  altText: string;
  originalFileName: string;
  sha256: string;
};
export type FacilitySpaceDocument = FacilitySpaceInput & {
  _id: ObjectId;
  publishedAt: Date | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  media?: FacilitySpaceMedia | null;
};
export function isValidFacilitySpaceDate(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}
export const isFacilitySpacePublicationStatus = (value: unknown): value is FacilitySpacePublicationStatus =>
  typeof value === "string" && facilitySpacePublicationStatuses.includes(value as FacilitySpacePublicationStatus);
export const getFacilitySpacePublicationStatusLabel = (value: FacilitySpacePublicationStatus) =>
  ({ draft: "초안", published: "공개", archived: "보관" })[value];
