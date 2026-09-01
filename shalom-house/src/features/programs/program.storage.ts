import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

const canonicalObjectIdPattern = /^[a-f0-9]{24}$/;
export const getProgramPrivateBucketName = () => {
  const bucket = process.env.SHALOM_SUPABASE_DOCUMENTS_PRIVATE_BUCKET;
  if (!bucket?.trim()) throw new Error("비공개 문서 bucket 설정이 필요합니다.");
  return bucket;
};
function assertLocation(programId: string, bucket: string, objectPath: string) {
  if (bucket !== getProgramPrivateBucketName() || !isValidPrivateProgramAttachmentPathForProgram(programId, objectPath)) throw new Error("프로그램 첨부 Storage 위치가 유효하지 않습니다.");
}
export function isValidPrivateProgramAttachmentPathForProgram(programId: string, objectPath: unknown): objectPath is string {
  if (!canonicalObjectIdPattern.test(programId) || typeof objectPath !== "string") return false;
  return new RegExp(`^shalom-house/programs/${programId}/attachments/[a-f0-9]{24}\\.pdf$`).test(objectPath);
}
export async function uploadPrivateProgramAttachment(programId: string, objectPath: string, buffer: Buffer) {
  const bucket = getProgramPrivateBucketName(); assertLocation(programId, bucket, objectPath);
  const { data, error } = await getSupabaseAdminClient().storage.from(bucket).upload(objectPath, buffer,
    { contentType: "application/pdf", upsert: false });
  if (error || data?.path !== objectPath) throw new Error("PDF 업로드에 실패했습니다.");
  return { bucket, objectPath };
}
export async function downloadPrivateProgramAttachment(programId: string, bucket: string, objectPath: string) {
  assertLocation(programId, bucket, objectPath);
  const { data, error } = await getSupabaseAdminClient().storage.from(bucket).download(objectPath);
  if (error || !data) throw new Error("PDF 다운로드에 실패했습니다.");
  return data;
}
export async function removePrivateProgramAttachment(programId: string, bucket: string, objectPath: string) {
  assertLocation(programId, bucket, objectPath);
  const { error } = await getSupabaseAdminClient().storage.from(bucket).remove([objectPath]);
  if (error) throw new Error("PDF 삭제에 실패했습니다.");
}
