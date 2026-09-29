import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

if (url && publicUrl) {
  let serverOrigin: string;
  let publicOrigin: string;
  try {
    serverOrigin = new URL(url).origin;
    publicOrigin = new URL(publicUrl).origin;
  } catch {
    throw new Error("SUPABASE_URL 또는 NEXT_PUBLIC_SUPABASE_URL이 올바른 URL이 아닙니다.");
  }

  if (serverOrigin !== publicOrigin) {
    throw new Error(
      "Supabase 프로젝트 설정이 일치하지 않습니다: SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_URL을 동일한 origin으로 설정하세요.",
    );
  }
}

const createMockAdmin = () =>
  ({
    storage: {
      from: () => ({
        remove: async () => ({ data: null, error: null }),
        upload: async () => ({ data: null, error: null }),
      }),
    },
  }) as unknown as ReturnType<typeof createClient>;

if (!url || !serviceKey) {
  if (!isBuildPhase) {
    throw new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing.");
  }
}

export const supabaseAdmin =
  !url || !serviceKey
    ? createMockAdmin()
    : createClient(url, serviceKey, { auth: { persistSession: false } });
