import { ObjectId } from "mongodb";
import type { MongoProgramAttachment } from "./program.mongo-schema";
import { getProgramPrivateBucketName, isValidPrivateProgramAttachmentPathForProgram } from "./program.storage";

export const ADMIN_PROGRAM_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
export const ADMIN_PROGRAM_ATTACHMENT_REQUEST_MAX_BYTES = 11 * 1024 * 1024;
export const ADMIN_PROGRAM_ATTACHMENT_LABEL_MAX_LENGTH = 100;
export const ADMIN_PROGRAM_ATTACHMENT_FILE_NAME_MAX_LENGTH = 120;

export function isCanonicalProgramMediaIso(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.toISOString() === value;
}
const exact = (value: object, keys: readonly string[]) =>
  Object.keys(value).length === keys.length && Object.keys(value).every((key) => keys.includes(key));
const canonicalId = (value: unknown): value is string =>
  typeof value === "string" && /^[a-f0-9]{24}$/.test(value) && ObjectId.isValid(value);

export function validateProgramCoverSetInput(value: unknown) {
  if (!value || typeof value !== "object" || !exact(value, ["expectedUpdatedAt", "galleryItemId", "mediaConfirmed"])) return null;
  const input = value as Record<string, unknown>;
  return isCanonicalProgramMediaIso(input.expectedUpdatedAt) && canonicalId(input.galleryItemId) && input.mediaConfirmed === true
    ? { expectedUpdatedAt: new Date(input.expectedUpdatedAt), galleryItemId: input.galleryItemId }
    : null;
}

export function validateProgramMediaRemoveInput(value: unknown) {
  if (!value || typeof value !== "object" || !exact(value, ["expectedUpdatedAt", "removeConfirmed"])) return null;
  const input = value as Record<string, unknown>;
  return isCanonicalProgramMediaIso(input.expectedUpdatedAt) && input.removeConfirmed === true
    ? { expectedUpdatedAt: new Date(input.expectedUpdatedAt) } : null;
}

export function validateProgramAttachmentMetadata(value: unknown) {
  if (!value || typeof value !== "object" || !exact(value, ["expectedUpdatedAt", "label", "contentSafetyConfirmed"])) return null;
  const input = value as Record<string, unknown>;
  const label = typeof input.label === "string" ? input.label : "";
  if (!isCanonicalProgramMediaIso(input.expectedUpdatedAt) || input.contentSafetyConfirmed !== true || !isValidProgramAttachmentLabel(label)) return null;
  return { expectedUpdatedAt: new Date(input.expectedUpdatedAt), label };
}

export function isValidProgramAttachmentLabel(value: unknown): value is string {
  return typeof value === "string" && value === value.trim() && value.length >= 1 &&
    value.length <= ADMIN_PROGRAM_ATTACHMENT_LABEL_MAX_LENGTH && !/[<>\t\r\n\u0000-\u001f\u007f]/.test(value);
}

export function normalizeProgramAttachmentFileName(value: string): string {
  let name = value.split(/[\\/]/).pop()?.replace(/[\u0000-\u001f\u007f]/g, "").trim() ?? "";
  if (!/\.pdf$/i.test(name)) return "attachment.pdf";
  if (name.length > ADMIN_PROGRAM_ATTACHMENT_FILE_NAME_MAX_LENGTH) {
    name = `${name.slice(0, ADMIN_PROGRAM_ATTACHMENT_FILE_NAME_MAX_LENGTH - 4)}.pdf`;
  }
  return name && name !== ".pdf" ? name : "attachment.pdf";
}

export function encodeProgramAttachmentFileName(value: string): string {
  return encodeURIComponent(value).replace(
    /['()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

export function createProgramAttachmentContentDisposition(originalFileName: string): string {
  const normalized = normalizeProgramAttachmentFileName(originalFileName);
  return [
    'attachment; filename="program-attachment.pdf"',
    `filename*=UTF-8''${encodeProgramAttachmentFileName(normalized)}`,
  ].join("; ");
}

export function isValidStoredProgramAttachment(value: unknown, updatedAt: unknown, programId: string): value is MongoProgramAttachment {
  if (!canonicalId(programId)) return false;
  if (!value || typeof value !== "object") return false;
  const attachment = value as Record<string, unknown>;
  const storedAt = attachment.storedAt;
  return attachment.bucket === getProgramPrivateBucketName() &&
    isValidPrivateProgramAttachmentPathForProgram(programId, attachment.objectPath) &&
    typeof attachment.originalFileName === "string" &&
    normalizeProgramAttachmentFileName(attachment.originalFileName) === attachment.originalFileName &&
    /\.pdf$/i.test(attachment.originalFileName) &&
    isValidProgramAttachmentLabel(attachment.label) &&
    attachment.contentType === "application/pdf" &&
    Number.isSafeInteger(attachment.byteSize) && Number(attachment.byteSize) >= 1 &&
    Number(attachment.byteSize) <= ADMIN_PROGRAM_ATTACHMENT_MAX_BYTES &&
    storedAt instanceof Date && !Number.isNaN(storedAt.getTime()) &&
    updatedAt instanceof Date && !Number.isNaN(updatedAt.getTime()) && storedAt <= updatedAt;
}

export function isValidStoredProgramMedia(document: {
  _id?: unknown; coverGalleryItemId?: unknown; attachment?: unknown; updatedAt?: unknown;
}): boolean {
  const coverValid = document.coverGalleryItemId === undefined || document.coverGalleryItemId === null ||
    document.coverGalleryItemId instanceof ObjectId;
  const attachmentValid = document.attachment === undefined || document.attachment === null ||
    document._id instanceof ObjectId &&
    isValidStoredProgramAttachment(document.attachment, document.updatedAt, document._id.toHexString());
  return coverValid && attachmentValid;
}

export async function validateProgramAttachmentFile(file: unknown) {
  if (!(file instanceof File) || file.size < 1 || file.size > ADMIN_PROGRAM_ATTACHMENT_MAX_BYTES ||
      file.type !== "application/pdf" || !/\.pdf$/i.test(file.name)) return null;
  const magic = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  if (String.fromCharCode(...magic) !== "%PDF-") return null;
  return { buffer: Buffer.from(await file.arrayBuffer()), byteSize: file.size,
    originalFileName: normalizeProgramAttachmentFileName(file.name) };
}
