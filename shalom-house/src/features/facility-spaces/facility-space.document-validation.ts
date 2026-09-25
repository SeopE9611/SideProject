import "server-only";
import { ObjectId } from "mongodb";
import { SERVER_WEBP_MAX_BYTES, SERVER_WEBP_MAX_DIMENSION } from "@/lib/server-webp-validation";
import { getFacilitySpacePrivateBucketName, isValidFacilitySpaceMediaPath } from "./facility-space.storage";
import {
  FACILITY_SPACE_ALT_TEXT_MAX_LENGTH,
  FACILITY_SPACE_ORIGINAL_FILE_NAME_MAX_LENGTH,
  normalizeFacilitySpaceOriginalFileName,
} from "./facility-space.media-validation";
import { isValidFacilitySpaceDate, type FacilitySpaceDocument, type FacilitySpaceMedia } from "./facility-space.types";
import { validateFacilitySpaceInput } from "./facility-space.validation";

export function isValidFacilitySpaceMedia(facilitySpaceId: string, media: unknown): media is FacilitySpaceMedia {
  if (typeof media !== "object" || media === null) return false;
  const value = media as Record<string, unknown>;
  return (
    Object.keys(value).length === 9 &&
    value.bucket === getFacilitySpacePrivateBucketName() &&
    isValidFacilitySpaceMediaPath(facilitySpaceId, value.objectPath) &&
    value.mimeType === "image/webp" &&
    Number.isSafeInteger(value.byteSize) &&
    (value.byteSize as number) >= 1 &&
    (value.byteSize as number) <= SERVER_WEBP_MAX_BYTES &&
    Number.isSafeInteger(value.width) &&
    (value.width as number) >= 1 &&
    (value.width as number) <= SERVER_WEBP_MAX_DIMENSION &&
    Number.isSafeInteger(value.height) &&
    (value.height as number) >= 1 &&
    (value.height as number) <= SERVER_WEBP_MAX_DIMENSION &&
    typeof value.altText === "string" &&
    value.altText === value.altText.trim() &&
    value.altText.length >= 1 &&
    value.altText.length <= FACILITY_SPACE_ALT_TEXT_MAX_LENGTH &&
    !/[<>]|(?:^|\n)\s*(?:#{1,6}\s|(?:[-*+]|\d+[.)])\s)|\[[^\]]*\]\([^)]*\)/.test(value.altText) &&
    !/[\u0000-\u001F\u007F]/.test(value.altText) &&
    typeof value.originalFileName === "string" &&
    value.originalFileName.length <= FACILITY_SPACE_ORIGINAL_FILE_NAME_MAX_LENGTH &&
    normalizeFacilitySpaceOriginalFileName(value.originalFileName) === value.originalFileName &&
    typeof value.sha256 === "string" &&
    /^[a-f0-9]{64}$/.test(value.sha256)
  );
}

export function isValidStoredFacilitySpace(document: FacilitySpaceDocument): boolean {
  const validInput = validateFacilitySpaceInput({
    title: document.title,
    description: document.description,
    publicationStatus: document.publicationStatus,
    displayOrder: document.displayOrder,
  }).ok;
  const validDates =
    document.publicationStatus === "draft"
      ? document.publishedAt === null && document.archivedAt === null
      : document.publicationStatus === "published"
        ? isValidFacilitySpaceDate(document.publishedAt) && document.archivedAt === null
        : document.publicationStatus === "archived"
          ? document.publishedAt === null && isValidFacilitySpaceDate(document.archivedAt)
          : false;
  const validMedia =
    document.media === undefined ||
    document.media === null ||
    (document._id instanceof ObjectId && isValidFacilitySpaceMedia(document._id.toHexString(), document.media));
  return validInput && document._id instanceof ObjectId && isValidFacilitySpaceDate(document.createdAt) &&
    isValidFacilitySpaceDate(document.updatedAt) && validDates && validMedia;
}
