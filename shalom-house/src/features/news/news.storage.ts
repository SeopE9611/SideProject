import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

const pathPattern = /^shalom-house\/news\/[a-f0-9]{24}\/attachments\/[a-f0-9]{24}\.pdf$/;
export const getNewsPrivateBucketName = () => {
  const bucket = process.env.SHALOM_SUPABASE_DOCUMENTS_PRIVATE_BUCKET;
  if (!bucket?.trim()) throw new Error("비공개 문서 bucket 설정이 필요합니다.");
  return bucket;
};
function assertLocation(bucket: string, objectPath: string) {
  if (bucket !== getNewsPrivateBucketName() || !pathPattern.test(objectPath)) throw new Error("소식 첨부 Storage 위치가 유효하지 않습니다.");
}
export function isValidPrivateNewsAttachmentPath(value: unknown): value is string {
  return typeof value === "string" && pathPattern.test(value);
}
export async function uploadPrivateNewsAttachment(objectPath: string, buffer: Buffer) {
  const bucket = getNewsPrivateBucketName(); assertLocation(bucket, objectPath);
  const { data, error } = await getSupabaseAdminClient().storage.from(bucket).upload(objectPath, buffer,
    { contentType: "application/pdf", upsert: false });
  if (error || data?.path !== objectPath) throw new Error("PDF 업로드에 실패했습니다.");
  return { bucket, objectPath };
}
export async function downloadPrivateNewsAttachment(bucket: string, objectPath: string) {
  assertLocation(bucket, objectPath);
  const { data, error } = await getSupabaseAdminClient().storage.from(bucket).download(objectPath);
  if (error || !data) throw new Error("PDF 다운로드에 실패했습니다.");
  return data;
}
export async function removePrivateNewsAttachment(bucket: string, objectPath: string) {
  assertLocation(bucket, objectPath);
  const { error } = await getSupabaseAdminClient().storage.from(bucket).remove([objectPath]);
  if (error) throw new Error("PDF 삭제에 실패했습니다.");
}
