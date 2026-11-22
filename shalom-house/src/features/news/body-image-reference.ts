export const BODY_IMAGE_LIMIT = 12;
export const BODY_IMAGE_ALT_LIMIT = 180;
export const isBodyImageId = (value: unknown): value is string =>
  typeof value === "string" && /^[a-f0-9]{24}$/.test(value);

export type BodyImageDomain = "news" | "programs";
export const isBodyImageDomain = (value: string): value is BodyImageDomain => value === "news" || value === "programs";

export type BodyImageReference = { imageId: string; alt: string };
export type BodyImageAsset = {
  id: string;
  bucket: string;
  width: number;
  height: number;
  subjectPresence: "non_identifiable";
  state: "uploading" | "ready" | "attached" | "discarded";
  expiresAt: Date | null;
};

export function bodyImageUrl(domain: BodyImageDomain, owner: string, imageId: string, admin = false) {
  return admin
    ? `/api/admin/body-images/${domain}/${encodeURIComponent(owner)}?image=${encodeURIComponent(imageId)}`
    : `/api/body-images/${domain}/${encodeURIComponent(owner)}/${encodeURIComponent(imageId)}`;
}
