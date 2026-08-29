import "server-only";
import { getGalleryPrivateBucketName, getSupabaseAdminClient } from "@/lib/supabase-admin";

export async function uploadPrivateGalleryImage(objectPath:string,imageBuffer:Buffer):Promise<{bucket:string;objectPath:string}>{
  const bucket=getGalleryPrivateBucketName();
  const {data,error}=await getSupabaseAdminClient().storage.from(bucket).upload(objectPath,imageBuffer,{contentType:"image/webp",upsert:false});
  if(error||data?.path!==objectPath) throw new Error("비공개 활동사진 업로드에 실패했습니다.");
  return {bucket,objectPath};
}
export async function downloadPrivateGalleryImage(bucket:string,objectPath:string):Promise<Blob>{
  const {data,error}=await getSupabaseAdminClient().storage.from(bucket).download(objectPath);
  if(error||!data) throw new Error("비공개 활동사진을 불러오지 못했습니다.");
  return data;
}
export async function removePrivateGalleryImage(bucket:string,objectPath:string):Promise<void>{
  const {error}=await getSupabaseAdminClient().storage.from(bucket).remove([objectPath]);
  if(error) throw new Error("비공개 활동사진 보상 삭제에 실패했습니다.");
}
