// @ts-check
import { ObjectId } from "mongodb";

/** @typedef {import("@supabase/supabase-js").SupabaseClient["storage"]} StorageClient */
/** @typedef {ReturnType<StorageClient["from"]>} StorageBucket */

export const PDF_STAGING_DOMAINS = /** @type {const} */ (["news", "programs"]);
export const PDF_OBJECT_ID = /^[a-f0-9]{24}$/;
const STAGING_PATH = /^shalom-house\/(news|programs)\/([a-f0-9]{24})\/attachment-staging\/([a-f0-9]{24})\.pdf$/;
// 서명 URL의 2시간 유효 기간과 지연된 업로드를 고려합니다.
const STAGING_RETENTION = 3 * 60 * 60_000;
const PAGE_SIZE = 20;

/**
 * @param {StorageBucket} storage
 * @param {{ domain: typeof PDF_STAGING_DOMAINS[number], postId?: string, apply?: boolean,
 *   maxPages?: number, now?: number, onCandidate?: (path: string) => void }} options
 */
export async function scanPdfStaging(storage, {
  domain, postId, apply = false, maxPages = Infinity, now = Date.now(), onCandidate,
}) {
  if (!PDF_STAGING_DOMAINS.includes(domain) || (postId !== undefined && !PDF_OBJECT_ID.test(postId))) {
    throw new Error("PDF 임시 파일 정리 범위가 유효하지 않습니다.");
  }
  const prefix = postId ? `shalom-house/${domain}/${postId}/attachment-staging/` : `shalom-house/${domain}/`;
  const cutoff = now - STAGING_RETENTION;
  const result = { candidates: 0, deleted: 0, skipped: 0, failed: 0, listFailed: false, incomplete: false };
  /** @type {string | undefined} */
  let cursor;
  const seen = new Set();

  for (let page = 0; page < maxPages; page++) {
    let data;
    try {
      const listed = await storage.listV2({
        prefix, cursor, limit: PAGE_SIZE, sortBy: { column: "name", order: "asc" },
      }, { signal: AbortSignal.timeout(3_000), cache: "no-store" });
      if (listed.error || !listed.data) throw new Error();
      data = listed.data;
      if (data.hasNext && (!data.nextCursor || seen.has(data.nextCursor))) throw new Error();
    } catch {
      console.error("PDF 임시 파일 목록 조회 실패", { prefix });
      result.listFailed = true;
      break;
    }

    const expired = new Set();
    for (const object of data.objects) {
      // Storage의 평면 목록에서 name은 전체 객체 경로입니다.
      const path = object.name;
      const match = STAGING_PATH.exec(path);
      if (match?.[0] !== path || match[1] !== domain || (postId && match[2] !== postId)) {
        result.skipped++;
        continue;
      }
      const issuedAt = new ObjectId(match[3]).getTimestamp().getTime();
      const createdAt = Date.parse(object.created_at);
      const updatedAt = Date.parse(object.updated_at);
      if (!object.id || issuedAt <= 0 || !(Math.max(issuedAt, createdAt, updatedAt) < cutoff)) {
        result.skipped++;
        continue;
      }
      expired.add(path);
    }

    result.candidates += expired.size;
    if (onCandidate) for (const path of expired) onCandidate(path);
    if (apply && expired.size > 0) {
      try {
        const removed = await storage.remove([...expired]);
        if (removed.error || !removed.data) throw new Error();
        const deleted = new Set(removed.data.map(({ name }) => name).filter((name) => expired.has(name))).size;
        result.deleted += deleted;
        // 다른 정리 요청이 먼저 삭제했으면 Storage가 해당 경로를 반환하지 않습니다.
        result.skipped += expired.size - deleted;
      } catch {
        result.failed += expired.size;
        console.error("PDF 임시 파일 삭제 결과 확인 필요", { prefix, count: expired.size });
      }
    }

    if (!data.hasNext) return result;
    // 이름 기반 커서는 이전 페이지의 객체가 삭제돼도 다음 이름부터 조회합니다.
    cursor = data.nextCursor;
    seen.add(cursor);
  }

  result.incomplete = true;
  return result;
}
