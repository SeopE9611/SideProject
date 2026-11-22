import { createClient } from "@supabase/supabase-js";
import { PDF_STAGING_DOMAINS, scanPdfStaging } from "../../src/lib/pdf-staging-cleanup.mjs";

const args = process.argv.slice(2);
const usage = "사용법: node scripts/admin/cleanup-pdf-staging.mjs [--dry-run | --apply]";
if (args.length === 1 && args[0] === "--help") {
  console.log(usage);
} else if (args.length > 1 || (args.length === 1 && !["--dry-run", "--apply"].includes(args[0]))) {
  console.error(usage);
  process.exitCode = 1;
} else {
  const url = process.env.SHALOM_SUPABASE_URL;
  const key = process.env.SHALOM_SUPABASE_SECRET_KEY ?? process.env.SHALOM_SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SHALOM_SUPABASE_DOCUMENTS_PRIVATE_BUCKET;
  const apply = args[0] === "--apply";
  if (!url?.trim() || !key?.trim() || !bucket?.trim()) {
    console.error("Supabase 서버 URL, 서버 키, 비공개 문서 bucket 환경 변수가 필요합니다.");
    process.exitCode = 1;
  } else {
    try {
      const client = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        global: {
          fetch: (input, init) => {
            const timeout = AbortSignal.timeout(15_000);
            return fetch(input, { ...init, signal: init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout });
          },
        },
      });
      const storage = client.storage.from(bucket);
      console.log(apply ? "삭제 실행" : "삭제 대상 미리보기");
      for (const domain of PDF_STAGING_DOMAINS) {
        const result = await scanPdfStaging(storage, {
          domain, apply, onCandidate: (path) => console.log(path),
        });
        console.log(domain, {
          대상: result.candidates, 삭제: result.deleted, 건너뜀: result.skipped,
          삭제결과미확인: result.failed, 목록조회실패: result.listFailed, 조회미완료: result.incomplete,
        });
        if (result.failed || result.incomplete) process.exitCode = 1;
      }
    } catch {
      console.error("PDF 임시 파일 정리를 실행하지 못했습니다. 서버 설정과 연결을 확인해 주세요.");
      process.exitCode = 1;
    }
  }
}
