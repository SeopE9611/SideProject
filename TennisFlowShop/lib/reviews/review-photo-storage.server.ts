import "server-only";

import { supabaseAdmin } from "@/lib/supabase-admin";

const REVIEW_PHOTO_BUCKET = "tennis-images";
const REVIEW_PHOTO_PREFIX = "reviews/";
export const REVIEW_PHOTO_SESSION_PREFIX = "reviews/sessions/";
const ALLOWED_HOSTS = new Set(["cwzpxxahtayoyqqskmnt.supabase.co"]);
const ALLOWED_PATH_PREFIX = `/storage/v1/object/public/${REVIEW_PHOTO_BUCKET}/`;

export function isAllowedReviewPhotoUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const { protocol, hostname, pathname } = new URL(value);
    return (
      protocol === "https:" &&
      ALLOWED_HOSTS.has(hostname) &&
      pathname.startsWith(ALLOWED_PATH_PREFIX) &&
      decodeURIComponent(pathname.slice(ALLOWED_PATH_PREFIX.length)).startsWith(REVIEW_PHOTO_PREFIX)
    );
  } catch {
    return false;
  }
}

export function extractReviewPhotoStorageObject(value: unknown) {
  if (!isAllowedReviewPhotoUrl(value)) return null;
  const { pathname } = new URL(value);
  const objectPath = decodeURIComponent(pathname.slice(ALLOWED_PATH_PREFIX.length));
  if (!objectPath.startsWith(REVIEW_PHOTO_PREFIX)) return null;
  return { bucket: REVIEW_PHOTO_BUCKET, path: objectPath };
}

export function extractReviewPhotoSessionObject(value: unknown, uploadSessionId: string) {
  const object = extractReviewPhotoStorageObject(value);
  const prefix = `${REVIEW_PHOTO_SESSION_PREFIX}${uploadSessionId}/`;
  if (!object || !object.path.startsWith(prefix)) return null;
  return object;
}

export async function removeReviewPhotoStoragePathsBestEffort(paths: string[], logContext: string) {
  const uniquePaths = Array.from(new Set(paths));
  if (!uniquePaths.length) return;
  try {
    const { error } = await supabaseAdmin.storage.from(REVIEW_PHOTO_BUCKET).remove(uniquePaths);
    if (error) console.error(`[reviews] storage cleanup failed (${logContext})`, error);
  } catch (error) {
    console.error(`[reviews] storage cleanup failed (${logContext})`, error);
  }
}

export async function removeReviewPhotosBestEffort(urls: unknown[], logContext: string) {
  const paths = Array.from(
    new Set(
      urls
        .map(extractReviewPhotoStorageObject)
        .filter((item): item is { bucket: string; path: string } => Boolean(item))
        .map((item) => item.path),
    ),
  );
  if (!paths.length) return;
  try {
    await removeReviewPhotoStoragePathsBestEffort(paths, logContext);
  } catch (error) {
    console.error(`[reviews] storage cleanup failed (${logContext})`, error);
  }
}

export function diffRemovedReviewPhotos(before: unknown, after: unknown) {
  const next = new Set((Array.isArray(after) ? after : []).map((url) => String(url)));
  return (Array.isArray(before) ? before : []).filter((url) => !next.has(String(url)));
}
