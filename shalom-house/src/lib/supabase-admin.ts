import "server-only";

import { createClient } from "@supabase/supabase-js";

let client: ReturnType<typeof createClient> | undefined;

export function getSupabaseAdminClient(): ReturnType<typeof createClient> {
  const url = process.env.SHALOM_SUPABASE_URL;
  const serviceRoleKey = process.env.SHALOM_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("샬롬의 집 Supabase 서버 환경 변수가 설정되지 않았습니다.");
  }
  client ??= createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client;
}

export function getGalleryPrivateBucketName(): string {
  const bucket = process.env.SHALOM_SUPABASE_GALLERY_PRIVATE_BUCKET;
  if (!bucket) throw new Error("활동사진 비공개 Storage bucket 환경 변수가 설정되지 않았습니다.");
  return bucket;
}
