import "server-only";
import { getGalleryPrivateBucketName, getSupabaseAdminClient } from "@/lib/supabase-admin";

const objectIdPattern = /^[a-f0-9]{24}$/;
export const getFacilitySpacePrivateBucketName = () => getGalleryPrivateBucketName();

export function isValidFacilitySpaceMediaPath(facilitySpaceId: string, objectPath: unknown): objectPath is string {
  if (!objectIdPattern.test(facilitySpaceId) || typeof objectPath !== "string") return false;
  return new RegExp(`^shalom-house/facility-spaces/${facilitySpaceId}/images/[a-f0-9]{24}\\.webp$`).test(objectPath);
}

function assertLocation(facilitySpaceId: string, bucket: string, objectPath: string) {
  if (bucket !== getFacilitySpacePrivateBucketName() || !isValidFacilitySpaceMediaPath(facilitySpaceId, objectPath))
    throw new Error("생활공간 사진 Storage 위치가 유효하지 않습니다.");
}

export async function uploadPrivateFacilitySpaceImage(facilitySpaceId: string, objectPath: string, buffer: Buffer) {
  const bucket = getFacilitySpacePrivateBucketName();
  assertLocation(facilitySpaceId, bucket, objectPath);
  const { data, error } = await getSupabaseAdminClient().storage.from(bucket).upload(objectPath, buffer, {
    contentType: "image/webp",
    upsert: false,
  });
  if (error || data?.path !== objectPath) throw new Error("생활공간 사진 업로드에 실패했습니다.");
  return { bucket, objectPath };
}

export async function downloadPrivateFacilitySpaceImage(facilitySpaceId: string, bucket: string, objectPath: string) {
  assertLocation(facilitySpaceId, bucket, objectPath);
  const { data, error } = await getSupabaseAdminClient().storage.from(bucket).download(objectPath);
  if (error || !data) throw new Error("생활공간 사진 다운로드에 실패했습니다.");
  return data;
}

export async function removePrivateFacilitySpaceImage(facilitySpaceId: string, bucket: string, objectPath: string) {
  assertLocation(facilitySpaceId, bucket, objectPath);
  const { error } = await getSupabaseAdminClient().storage.from(bucket).remove([objectPath]);
  if (error) throw new Error("생활공간 사진 삭제에 실패했습니다.");
}
