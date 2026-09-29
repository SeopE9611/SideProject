import { ObjectId } from "mongodb";
import type { MongoNewsAttachment } from "./news.mongo-schema";
import { getNewsPrivateBucketName, isValidPrivateNewsAttachmentPathForNews } from "./news.storage";

export const ADMIN_NEWS_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
export const ADMIN_NEWS_ATTACHMENT_REQUEST_MAX_BYTES = 11 * 1024 * 1024;
export const ADMIN_NEWS_ATTACHMENT_LABEL_MAX_LENGTH = 100;
export const ADMIN_NEWS_ATTACHMENT_FILE_NAME_MAX_LENGTH = 120;

export function isCanonicalNewsMediaIso(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.toISOString() === value;
}
const exact = (value: object, keys: readonly string[]) =>
  Object.keys(value).length === keys.length && Object.keys(value).every((key) => keys.includes(key));
const canonicalId = (value: unknown): value is string =>
  typeof value === "string" && /^[a-f0-9]{24}$/.test(value) && ObjectId.isValid(value);

export function validateNewsCoverSetInput(value: unknown) {
  if (!value || typeof value !== "object" || !exact(value, ["expectedUpdatedAt", "galleryItemId", "mediaConfirmed"])) return null;
  const input = value as Record<string, unknown>;
  return isCanonicalNewsMediaIso(input.expectedUpdatedAt) && canonicalId(input.galleryItemId) && input.mediaConfirmed === true
    ? { expectedUpdatedAt: new Date(input.expectedUpdatedAt), galleryItemId: input.galleryItemId }
    : null;
}

export function validateNewsMediaRemoveInput(value: unknown) {
  if (!value || typeof value !== "object" || !exact(value, ["expectedUpdatedAt", "removeConfirmed"])) return null;
  const input = value as Record<string, unknown>;
  return isCanonicalNewsMediaIso(input.expectedUpdatedAt) && input.removeConfirmed === true
    ? { expectedUpdatedAt: new Date(input.expectedUpdatedAt) } : null;
}

export function validateNewsAttachmentMetadata(value: unknown) {
  if (!value || typeof value !== "object" || !exact(value, ["expectedUpdatedAt", "label", "contentSafetyConfirmed"])) return null;
  const input = value as Record<string, unknown>;
  const label = typeof input.label === "string" ? input.label.trim() : "";
  if (!isCanonicalNewsMediaIso(input.expectedUpdatedAt) || input.contentSafetyConfirmed !== true || !isValidNewsAttachmentLabel(label)) return null;
  return { expectedUpdatedAt: new Date(input.expectedUpdatedAt), label };
}

export function isValidNewsAttachmentLabel(value: unknown): value is string {
  return typeof value === "string" && value === value.trim() && value.length >= 1 &&
    value.length <= ADMIN_NEWS_ATTACHMENT_LABEL_MAX_LENGTH && !/[<>\t\r\n\u0000-\u001f\u007f]/.test(value);
}

export function normalizeNewsAttachmentFileName(value: string): string {
  let name = value.split(/[\\/]/).pop()?.replace(/[\u0000-\u001f\u007f]/g, "").trim() ?? "";
  if (!/\.pdf$/i.test(name)) return "attachment.pdf";
  if (name.length > ADMIN_NEWS_ATTACHMENT_FILE_NAME_MAX_LENGTH) {
    name = `${name.slice(0, ADMIN_NEWS_ATTACHMENT_FILE_NAME_MAX_LENGTH - 4)}.pdf`;
  }
  return name && name !== ".pdf" ? name : "attachment.pdf";
}

export function isValidStoredNewsAttachment(value: unknown, updatedAt: unknown, newsPostId: string): value is MongoNewsAttachment {
  if (!canonicalId(newsPostId)) return false;
  if (!value || typeof value !== "object") return false;
  const attachment = value as Record<string, unknown>;
  const storedAt = attachment.storedAt;
  return attachment.bucket === getNewsPrivateBucketName() &&
    isValidPrivateNewsAttachmentPathForNews(newsPostId, attachment.objectPath) &&
    typeof attachment.originalFileName === "string" &&
    normalizeNewsAttachmentFileName(attachment.originalFileName) === attachment.originalFileName &&
    /\.pdf$/i.test(attachment.originalFileName) &&
    isValidNewsAttachmentLabel(attachment.label) &&
    attachment.contentType === "application/pdf" &&
    Number.isSafeInteger(attachment.byteSize) && Number(attachment.byteSize) >= 1 &&
    Number(attachment.byteSize) <= ADMIN_NEWS_ATTACHMENT_MAX_BYTES &&
    storedAt instanceof Date && !Number.isNaN(storedAt.getTime()) &&
    updatedAt instanceof Date && !Number.isNaN(updatedAt.getTime()) && storedAt <= updatedAt;
}

export function isValidStoredNewsMedia(document: {
  _id?: unknown; coverGalleryItemId?: unknown; attachment?: unknown; updatedAt?: unknown;
}): boolean {
  const coverValid = document.coverGalleryItemId === undefined || document.coverGalleryItemId === null ||
    document.coverGalleryItemId instanceof ObjectId;
  const attachmentValid = document.attachment === undefined || document.attachment === null ||
    document._id instanceof ObjectId &&
    isValidStoredNewsAttachment(document.attachment, document.updatedAt, document._id.toHexString());
  return coverValid && attachmentValid;
}

export async function validateNewsAttachmentFile(file: unknown) {
  if (!(file instanceof File) || file.size < 1 || file.size > ADMIN_NEWS_ATTACHMENT_MAX_BYTES ||
      file.type !== "application/pdf" || !/\.pdf$/i.test(file.name)) return null;
  const magic = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  if (String.fromCharCode(...magic) !== "%PDF-") return null;
  return { buffer: Buffer.from(await file.arrayBuffer()), byteSize: file.size,
    originalFileName: normalizeNewsAttachmentFileName(file.name) };
}
