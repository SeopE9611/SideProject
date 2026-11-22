import "server-only";
import { randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

let client: ReturnType<typeof createClient> | undefined;

export function getSupabaseAdminClient(): ReturnType<typeof createClient> {
  const url = process.env.SHALOM_SUPABASE_URL;
  const secretKey = process.env.SHALOM_SUPABASE_SECRET_KEY ?? process.env.SHALOM_SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !secretKey) {
    throw new Error("샬롬의 집 Supabase 서버 환경 변수가 설정되지 않았습니다.");
  }
  client ??= createClient(url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  return client;
}

export function getGalleryPrivateBucketName(): string {
  const bucket = process.env.SHALOM_SUPABASE_GALLERY_PRIVATE_BUCKET;
  if (!bucket) {
    throw new Error("활동사진 비공개 Storage bucket 환경 변수가 설정되지 않았습니다.");
  }
  return bucket;
}

export async function signedPdfRedirect(bucket: string, path: string, fileName: string) {
  const { data, error } = await getSupabaseAdminClient().storage.from(bucket)
    .createSignedUrl(path, 30);
  if (error || !data) throw new Error("PDF 다운로드를 준비하지 못했습니다.");
  const location = new URL(data.signedUrl);
  location.searchParams.set("download", fileName);
  location.searchParams.set("cacheNonce", randomUUID());
  return new Response(null, { status: 307, headers: {
    Location: location.toString(),
    "Cache-Control": "private, no-store",
    "Referrer-Policy": "no-referrer",
  } });
}
