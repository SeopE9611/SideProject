import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
const objectPathPattern = /^shalom-house\/transparency\/[a-f0-9]{24}\/document\.pdf$/;
export function getTransparencyPrivateBucketName(): string {
  const bucket = process.env.SHALOM_SUPABASE_DOCUMENTS_PRIVATE_BUCKET;
  if (!bucket) throw new Error("자료공개 비공개 Storage bucket 환경 변수가 설정되지 않았습니다.");
  return bucket;
}
export function assertPrivateTransparencyStorageLocation(bucket: string, objectPath: string): void {
  if (bucket !== getTransparencyPrivateBucketName() || !objectPathPattern.test(objectPath)) {
    throw new Error("자료공개 Storage 위치가 허용된 범위가 아닙니다.");
  }
}
export async function uploadPrivateTransparencyDocument(objectPath: string, buffer: Buffer) {
  const bucket = getTransparencyPrivateBucketName();
  assertPrivateTransparencyStorageLocation(bucket, objectPath);
  const { data, error } = await getSupabaseAdminClient().storage.from(bucket).upload(objectPath, buffer, {
    contentType: "application/pdf",
    upsert: false,
  });
  if (error || data?.path !== objectPath) throw new Error("비공개 자료공개 PDF 업로드에 실패했습니다.");
  return { bucket, objectPath };
}
export async function downloadPrivateTransparencyDocument(bucket: string, objectPath: string): Promise<Blob> {
  assertPrivateTransparencyStorageLocation(bucket, objectPath);
  const { data, error } = await getSupabaseAdminClient().storage.from(bucket).download(objectPath);
  if (error || !data) throw new Error("비공개 자료공개 PDF를 불러오지 못했습니다.");
  return data;
}
export async function removePrivateTransparencyDocument(bucket: string, objectPath: string): Promise<void> {
  assertPrivateTransparencyStorageLocation(bucket, objectPath);
  const { error } = await getSupabaseAdminClient().storage.from(bucket).remove([objectPath]);
  if (error) throw new Error("비공개 자료공개 PDF 보상 삭제에 실패했습니다.");
}
