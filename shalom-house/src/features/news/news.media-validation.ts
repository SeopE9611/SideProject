import { ObjectId } from "mongodb";

export const ADMIN_NEWS_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
export const ADMIN_NEWS_ATTACHMENT_REQUEST_MAX_BYTES = 11 * 1024 * 1024;
export const ADMIN_NEWS_ATTACHMENT_LABEL_MAX_LENGTH = 100;
export const ADMIN_NEWS_ATTACHMENT_FILE_NAME_MAX_LENGTH = 120;

const canonicalIso = (value: unknown): value is string =>
  typeof value === "string" && new Date(value).toISOString() === value;
const exact = (value: object, keys: readonly string[]) =>
  Object.keys(value).length === keys.length && Object.keys(value).every((key) => keys.includes(key));
const canonicalId = (value: unknown): value is string =>
  typeof value === "string" && /^[a-f0-9]{24}$/.test(value) && ObjectId.isValid(value);

export function validateNewsCoverSetInput(value: unknown) {
  if (!value || typeof value !== "object" || !exact(value, ["expectedUpdatedAt", "galleryItemId", "mediaConfirmed"])) return null;
  const input = value as Record<string, unknown>;
  return canonicalIso(input.expectedUpdatedAt) && canonicalId(input.galleryItemId) && input.mediaConfirmed === true
    ? { expectedUpdatedAt: new Date(input.expectedUpdatedAt), galleryItemId: input.galleryItemId }
    : null;
}

export function validateNewsMediaRemoveInput(value: unknown) {
  if (!value || typeof value !== "object" || !exact(value, ["expectedUpdatedAt", "removeConfirmed"])) return null;
  const input = value as Record<string, unknown>;
  return canonicalIso(input.expectedUpdatedAt) && input.removeConfirmed === true
    ? { expectedUpdatedAt: new Date(input.expectedUpdatedAt) } : null;
}

export function validateNewsAttachmentMetadata(value: unknown) {
  if (!value || typeof value !== "object" || !exact(value, ["expectedUpdatedAt", "label", "contentSafetyConfirmed"])) return null;
  const input = value as Record<string, unknown>;
  const label = typeof input.label === "string" ? input.label.trim() : "";
  if (!canonicalIso(input.expectedUpdatedAt) || input.contentSafetyConfirmed !== true || !isValidNewsAttachmentLabel(label)) return null;
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

export async function validateNewsAttachmentFile(file: unknown) {
  if (!(file instanceof File) || file.size < 1 || file.size > ADMIN_NEWS_ATTACHMENT_MAX_BYTES ||
      file.type !== "application/pdf" || !/\.pdf$/i.test(file.name)) return null;
  const magic = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  if (String.fromCharCode(...magic) !== "%PDF-") return null;
  return { buffer: Buffer.from(await file.arrayBuffer()), byteSize: file.size,
    originalFileName: normalizeNewsAttachmentFileName(file.name) };
}
