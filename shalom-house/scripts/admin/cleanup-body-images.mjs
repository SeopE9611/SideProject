import { createClient } from "@supabase/supabase-js";
import { MongoClient } from "mongodb";
import { parseBodyImageCleanupArgs, scanBodyImageCleanup } from "./body-image-cleanup.mts";
import { loadBodyImageRichText } from "./load-body-image-rich-text.mjs";
import { NEWS_COLLECTION_NAME } from "../../src/features/news/news.mongo-schema.ts";
import { PROGRAM_COLLECTION_NAME } from "../../src/features/programs/program.mongo-schema.ts";

const args = process.argv.slice(2);
const command = "node scripts/admin/cleanup-body-images.mjs";
const scope = "--domain <news|programs> --post-id <ObjectId> --image-id <ObjectId>";
const usage = [
  "사용법(Node.js 22.18 이상)",
  `  ${command} [--dry-run]`,
  `  ${command} [--dry-run | --apply] ${scope}`,
  `  ${command} --apply --all`,
].join("\n");

async function run({ apply, target }) {
  const uri = process.env.SHALOM_MONGODB_URI;
  const url = process.env.SHALOM_SUPABASE_URL;
  const key = process.env.SHALOM_SUPABASE_SECRET_KEY ?? process.env.SHALOM_SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SHALOM_SUPABASE_GALLERY_PRIVATE_BUCKET;
  if (!uri?.trim() || !url?.trim() || !key?.trim() || !bucket?.trim()) {
    throw new Error("missing_configuration");
  }

  const richText = await loadBodyImageRichText();
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: (input, init) => fetch(input, {
        ...init, cache: "no-store",
        signal: init?.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(15_000)]) : AbortSignal.timeout(15_000),
      }),
    },
  });
  const { data: configuredBucket, error } = await supabase.storage.getBucket(bucket);
  if (error || configuredBucket?.id !== bucket || configuredBucket.public !== false) throw new Error("bucket_unconfirmed");

  // 한 프로세스에서 두 컬렉션을 순차 처리하며, 확인할 수 없는 작업은 실패로 남깁니다.
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 10_000, timeoutMS: 30_000,
    readPreference: "primary", readConcern: { level: "majority" },
  });
  try {
    const db = (await client.connect()).db(process.env.SHALOM_MONGODB_DB || "shalom_house");
    const storage = supabase.storage.from(bucket);
    console.log(apply ? "삭제 실행" : "삭제 대상 미리보기");
    for (const [domain, name] of [["news", NEWS_COLLECTION_NAME], ["programs", PROGRAM_COLLECTION_NAME]]) {
      if (target && target.domain !== domain) continue;
      const result = await scanBodyImageCleanup(db.collection(name), storage, richText, {
        domain, bucket, apply, target,
        onCandidate: (candidate) => console.log("정리 후보", JSON.stringify(candidate)),
        onOrphan: (path) => console.log("소유 레코드 확인 필요", path),
        onFailure: (path) => console.error("정리 결과 확인 필요", path),
      });
      console.log(domain, {
        삭제가능: result.candidates, 삭제가능바이트: result.candidateBytes, 객체없음: result.missing, 삭제: result.deleted,
        메타데이터만정리: result.metadataOnly, 보존: result.preserved, 건너뜀: result.skipped,
        실패: result.failed, 소유레코드확인필요: result.orphaned, 조회미완료: result.incomplete,
      });
      if (result.failed || result.incomplete) process.exitCode = 1;
    }
  } finally {
    await client.close();
  }
}

if (args.length === 1 && args[0] === "--help") {
  console.log(usage);
} else {
  const options = parseBodyImageCleanupArgs(args);
  if (!options) {
    console.error(usage);
    process.exitCode = 1;
  } else {
    try {
      await run(options);
    } catch {
      console.error("본문 이미지 정리를 시작하거나 완료하지 못했습니다. 기존 DB·비공개 버킷 설정과 연결을 확인해 주세요.");
      process.exitCode = 1;
    }
  }
}
