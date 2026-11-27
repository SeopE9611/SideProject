import assert from "node:assert/strict";
import test from "node:test";
import { ObjectId } from "mongodb";
import { parseBodyImageCleanupArgs, scanBodyImageCleanup } from "../admin/body-image-cleanup.mts";
import { loadBodyImageRichText } from "../admin/load-body-image-rich-text.mjs";

const richText = await loadBodyImageRichText();
const past = new Date("2026-01-01");
const cutoff = new Date("2026-01-02");
const future = new Date("2026-01-03");
const bucket = "test-private";
const id = "a".repeat(24);
const other = "b".repeat(24);
const asset = (overrides = {}) => ({
  id, bucket, state: "ready", expiresAt: past,
  width: 10, height: 10, subjectPresence: "non_identifiable", ...overrides,
});
const post = (overrides = {}) => ({
  _id: new ObjectId(), updatedAt: past, deletedAt: null, body: ["본문"],
  bodyImages: [asset()], ...overrides,
});
const pathFor = (owner, imageId = id) => `shalom-house/news/${owner._id.toHexString()}/body-images/${imageId}.webp`;
const referencing = { version: 1, document: { type: "doc", content: [
  { type: "paragraph", content: [{ type: "text", text: "본문" }] },
  { type: "bodyImage", attrs: { imageId: id, alt: "사진" } },
] } };

function clone(value) {
  if (value instanceof ObjectId || value instanceof Date || value == null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(clone);
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)]));
}

const productionMissing = { name: "StorageApiError", status: 400, statusCode: "404", code: "NoSuchKey" };

function mock({ posts, objects, failedRemove = false, listError = false, infoError,
  missingError = { status: 404, code: "NoSuchKey" }, beforeClaim }) {
  const paths = new Set(objects);
  const updates = [];
  const deletes = [];
  const orphans = [];
  const candidates = [];
  const inspected = [];
  let removeFails = failedRemove;
  const collection = {
    find(filter, options) {
      const rows = filter._id?.$in
        ? posts.filter(({ _id }) => filter._id.$in.some((id) => id.equals(_id)))
        : posts.filter(({ _id, bodyImages }) => bodyImages?.length &&
            (!filter._id?.$gt || _id.toHexString() > filter._id.$gt.toHexString()))
          .sort((a, b) => a._id.toHexString().localeCompare(b._id.toHexString()))
          .slice(0, options.limit);
      return { toArray: async () => rows.map(clone) };
    },
    async findOne(query) {
      return clone(posts.find(({ _id, bodyImages }) => query._id.equals(_id) &&
        (!query["bodyImages.id"] || bodyImages.some(({ id }) => id === query["bodyImages.id"]))));
    },
    async updateOne(filter, operation, options) {
      updates.push({ filter, operation, options });
      const document = posts.find(({ _id }) => filter._id.equals(_id));
      if (operation.$set) {
        beforeClaim?.(document);
        const bodyDocumentMatches = filter.bodyDocument.$exists === false
          ? document.bodyDocument === undefined
          : JSON.stringify(document.bodyDocument) === JSON.stringify(filter.bodyDocument.$eq);
        if (document.deletedAt != null || document.updatedAt.getTime() !== filter.updatedAt.getTime() ||
            !bodyDocumentMatches)
          return { acknowledged: true, matchedCount: 0 };
      }
      const match = filter.bodyImages.$elemMatch;
      const index = document.bodyImages.findIndex((item) => item.id === match.id &&
        item.state === match.state && item.bucket === match.bucket && item.expiresAt.getTime() === match.expiresAt.getTime());
      if (index >= 0) {
        if (operation.$set) document.bodyImages[index].state = "discarded";
        else document.bodyImages.splice(index, 1);
      }
      return { acknowledged: true, matchedCount: index >= 0 ? 1 : 0 };
    },
  };
  const storage = {
    async listV2({ cursor }) {
      if (cursor && listError) return { error: new Error("list failed") };
      const names = [...paths].sort();
      const rows = cursor ? names.filter((name) => name > cursor) : names;
      return { data: {
        objects: rows.slice(0, 2).map((name) => ({ name })),
        hasNext: rows.length > 2, nextCursor: rows[1],
      } };
    },
    async info(name) {
      inspected.push(name);
      if (infoError) return { error: infoError };
      return paths.has(name) ? { data: { name, bucketId: bucket, size: 125, id: name } }
        : { error: missingError };
    },
    async remove([name]) {
      deletes.push(name);
      const removed = paths.delete(name);
      if (removeFails) {
        removeFails = false;
        return { error: new Error("response lost") };
      }
      return { data: removed ? [{ name, id: name }] : [] };
    },
  };
  return {
    paths, updates, deletes, orphans, candidates, inspected,
    run: (apply = false, target) => scanBodyImageCleanup(collection, storage, richText, {
      domain: "news", bucket, cutoff, apply, target, onOrphan: (path) => orphans.push(path),
      onCandidate: (candidate) => candidates.push(candidate),
    }),
  };
}

test("dry-run은 후보별 상태와 존재 여부를 출력하고 쓰지 않음", async () => {
  const owner = post({ bodyImages: [asset(), asset({ id: other, state: "discarded" })] });
  const fixture = mock({ posts: [owner], objects: [pathFor(owner)] });
  const result = await fixture.run();
  assert.equal(result.candidates, 1);
  assert.equal(result.candidateBytes, 125);
  assert.equal(result.deleted, 0);
  assert.equal(result.missing, 1);
  assert.deepEqual(fixture.candidates, [
    { domain: "news", postId: owner._id.toHexString(), imageId: id, state: "ready",
      expiresAt: past.toISOString(), path: pathFor(owner), bytes: 125, exists: true },
    { domain: "news", postId: owner._id.toHexString(), imageId: other, state: "discarded",
      expiresAt: past.toISOString(), path: pathFor(owner, other), bytes: null, exists: false },
  ]);
  assert.deepEqual(fixture.updates, []);
  assert.deepEqual(fixture.deletes, []);
});

test("지정한 게시물과 이미지 한 건에만 dry-run 및 삭제를 적용", async () => {
  const owner = post({ bodyImages: [asset(), asset({ id: other })] });
  const secondOwner = post();
  const path = pathFor(owner);
  const target = { domain: "news", postId: owner._id.toHexString(), imageId: id };
  const fixture = mock({
    posts: [owner, secondOwner], objects: [path, pathFor(owner, other), pathFor(secondOwner)],
  });
  assert.equal((await fixture.run(false, target)).candidates, 1);
  assert.deepEqual(fixture.inspected, [path]);
  assert.deepEqual(fixture.updates, []);
  assert.equal((await fixture.run(true, target)).deleted, 1);
  assert.deepEqual(fixture.deletes, [path]);
  assert.deepEqual(owner.bodyImages, [asset({ id: other })]);
  assert.deepEqual(secondOwner.bodyImages, [asset()]);
  assert.ok(fixture.updates.every(({ filter }) =>
    filter._id.equals(owner._id) && filter.bodyImages.$elemMatch.id === id));
});

test("지정 범위에 소유 레코드가 없는 객체는 보고만 함", async () => {
  const owner = post();
  const path = pathFor(owner, other);
  const fixture = mock({ posts: [owner], objects: [path, pathFor(owner)] });
  const target = { domain: "news", postId: owner._id.toHexString(), imageId: other };
  assert.equal((await fixture.run(true, target)).orphaned, 1);
  assert.deepEqual(fixture.orphans, [path]);
  assert.deepEqual(fixture.inspected, [path]);
  assert.deepEqual(fixture.updates, []);
  assert.deepEqual(fixture.deletes, []);
});

test("명시적인 전체 삭제나 완전한 단일 이미지 범위만 허용", () => {
  const target = { domain: "programs", postId: id, imageId: other };
  const flags = ["--domain", "programs", "--post-id", id, "--image-id", other];
  assert.deepEqual(parseBodyImageCleanupArgs([]), { apply: false });
  assert.deepEqual(parseBodyImageCleanupArgs(["--dry-run"]), { apply: false });
  assert.deepEqual(parseBodyImageCleanupArgs(["--all", "--apply"]), { apply: true });
  assert.deepEqual(parseBodyImageCleanupArgs(flags), { apply: false, target });
  assert.deepEqual(parseBodyImageCleanupArgs([...flags, "--apply"]), { apply: true, target });
  for (const args of [
    ["--apply"], ["--all"], ["--dry-run", "--apply", "--all"], ["--apply", "--all", ...flags],
    ["--apply", ...flags.slice(0, 4)], [...flags, "--apply", "--apply"],
    ["--domain", "gallery", ...flags.slice(2)],
    [...flags.slice(0, 3), "../invalid", ...flags.slice(4)],
    [...flags.slice(0, -1), "bad"],
  ]) assert.equal(parseBodyImageCleanupArgs(args), null, args.join(" "));
});

test("미참조·만료 객체만 삭제하고 연결·미만료·휴지통 이미지 보존", async () => {
  const owners = [
    post(), post({ bodyDocument: referencing }), post({ bodyImages: [asset({ state: "attached" })] }),
    post({ bodyImages: [asset({ expiresAt: future })] }), post({ deletedAt: past }),
  ];
  const fixture = mock({ posts: owners, objects: owners.map((owner) => pathFor(owner)) });
  const report = await fixture.run(true);
  assert.equal(report.deleted, 1);
  assert.equal(report.preserved, 4);
  assert.deepEqual(fixture.deletes, [pathFor(owners[0])]);
  assert.equal(owners[0].bodyImages.length, 0);
  assert.equal(fixture.updates[0].options.writeConcern.w, "majority");
});

test("손상된 문서·잘못된 소유·경로와 활동사진·PDF 보존, 고아 객체만 보고", async () => {
  const corrupted = post({ bodyDocument: { version: 2 } });
  const mismatched = post({ bodyDocument: referencing, body: ["다른 본문"] });
  const wrongBucket = post({ bodyImages: [asset({ bucket: "other" })] });
  const wrongId = post({ bodyImages: [asset({ id: "../broken" })] });
  const orphan = pathFor(post(), other);
  const orphanWithOwner = pathFor(corrupted, other);
  const gallery = `shalom-house/gallery/${wrongId._id}/image.webp`;
  const pdf = `shalom-house/news/${wrongId._id}/attachments/${id}.pdf`;
  const extra = pathFor(wrongId).replace(".webp", ".webp/extra");
  const fixture = mock({
    posts: [corrupted, mismatched, wrongBucket, wrongId],
    objects: [pathFor(corrupted), pathFor(mismatched), pathFor(wrongBucket), orphan, orphanWithOwner, gallery, pdf, extra],
  });
  assert.equal((await fixture.run(true)).skipped, 4);
  assert.deepEqual(fixture.orphans.sort(), [orphan, orphanWithOwner].sort());
  assert.deepEqual(fixture.deletes, []);
});

test("최신 참조를 읽은 뒤 동시 저장과 충돌하면 객체를 삭제하지 않음", async () => {
  const owner = post();
  const fixture = mock({ posts: [owner], objects: [pathFor(owner)], beforeClaim(document) {
    document.updatedAt = future;
    document.bodyDocument = referencing;
    document.bodyImages[0].state = "attached";
  } });
  assert.equal((await fixture.run(true)).skipped, 1);
  assert.deepEqual(fixture.deletes, []);
  assert.equal(owner.bodyImages[0].state, "attached");
});

test("삭제 응답 유실 시 메타데이터를 남기고, 객체 부재 확인 후 재실행으로 정리", async () => {
  const owner = post();
  const fixture = mock({ posts: [owner], objects: [pathFor(owner)], failedRemove: true });
  assert.equal((await fixture.run(true)).failed, 1);
  assert.equal(owner.bodyImages[0].state, "discarded");
  const retry = await fixture.run(true);
  assert.equal(retry.missing, 1);
  assert.equal(retry.metadataOnly, 1);
  assert.equal(owner.bodyImages.length, 0);
  assert.equal(fixture.deletes.length, 1);
});

test("Storage 목록이 불완전하면 삭제를 시작하지 않음", async () => {
  const owners = [post(), post(), post()];
  const fixture = mock({ posts: owners, objects: owners.map((owner) => pathFor(owner)), listError: true });
  assert.equal((await fixture.run(true)).incomplete, true);
  assert.deepEqual(fixture.updates, []);
  assert.deepEqual(fixture.deletes, []);
});

test("운영 NoSuchKey 응답에서 메타데이터와 객체가 없는 지정 범위는 건너뜀", async () => {
  const owner = post({ bodyImages: [] });
  const fixture = mock({ posts: [owner], objects: [], missingError: productionMissing });
  const target = { domain: "news", postId: owner._id.toHexString(), imageId: id };
  const report = await fixture.run(false, target);
  assert.deepEqual(report, {
    candidates: 0, candidateBytes: 0, preserved: 0, skipped: 1, failed: 0,
    orphaned: 0, deleted: 0, missing: 0, metadataOnly: 0, incomplete: false,
  });
  assert.deepEqual(fixture.inspected, [pathFor(owner)]);
  assert.deepEqual(fixture.updates, []);
  assert.deepEqual(fixture.deletes, []);
});

test("운영 NoSuchKey 응답에서 남은 메타데이터만 정리", async () => {
  const owner = post({ bodyImages: [asset({ state: "discarded" })] });
  const fixture = mock({ posts: [owner], objects: [], missingError: productionMissing });
  const target = { domain: "news", postId: owner._id.toHexString(), imageId: id };
  const report = await fixture.run(true, target);
  assert.equal(report.missing, 1);
  assert.equal(report.metadataOnly, 1);
  assert.equal(report.failed, 0);
  assert.equal(report.incomplete, false);
  assert.deepEqual(owner.bodyImages, []);
  assert.deepEqual(fixture.deletes, []);
});

test("정상 삭제 뒤 같은 대상의 재조회는 운영 NoSuchKey 응답에서 건너뜀", async () => {
  const owner = post();
  const path = pathFor(owner);
  const fixture = mock({ posts: [owner], objects: [path], missingError: productionMissing });
  const target = { domain: "news", postId: owner._id.toHexString(), imageId: id };
  assert.equal((await fixture.run(true, target)).deleted, 1);
  assert.deepEqual(owner.bodyImages, []);
  const writes = fixture.updates.length;
  const report = await fixture.run(false, target);
  assert.equal(report.skipped, 1);
  assert.equal(report.failed, 0);
  assert.equal(report.candidates, 0);
  assert.equal(report.incomplete, false);
  assert.equal(fixture.updates.length, writes);
  assert.deepEqual(fixture.deletes, [path]);
});

test("기존 HTTP 404의 statusCode NoSuchKey 응답도 계속 건너뜀", async () => {
  const owner = post({ bodyImages: [] });
  const fixture = mock({ posts: [owner], objects: [], missingError: { status: 404, statusCode: "NoSuchKey" } });
  const target = { domain: "news", postId: owner._id.toHexString(), imageId: id };
  const report = await fixture.run(false, target);
  assert.equal(report.skipped, 1);
  assert.equal(report.failed, 0);
  assert.deepEqual(fixture.updates, []);
  assert.deepEqual(fixture.deletes, []);
});

for (const [name, infoError] of [
  ["일반 400", { status: 400, statusCode: "400", code: "BadRequest" }],
  ["일반 404", { status: 404, code: "not_found" }],
  ["코드 불일치", { status: 400, statusCode: "404", code: "not_found" }],
  ["서비스 코드 누락", { status: 400, statusCode: "404" }],
  ["상태 코드 불일치", { status: 400, statusCode: "400", code: "NoSuchKey" }],
  ["인증 오류", { status: 401, statusCode: "401", code: "InvalidJWT" }],
  ["권한 오류", { status: 403, statusCode: "404", code: "NoSuchKey" }],
  ["잘못된 버킷", { status: 400, statusCode: "404", code: "BucketNotFound" }],
  ["서버 오류", { status: 500, statusCode: "404", code: "NoSuchKey" }],
  ["네트워크 오류", new TypeError("fetch failed")],
  ["시간 초과", new DOMException("timed out", "TimeoutError")],
]) test(`${name} 응답에서 파일과 메타데이터를 보존`, async () => {
  const owner = post();
  const fixture = mock({ posts: [owner], objects: [pathFor(owner)], infoError });
  assert.equal((await fixture.run(true)).failed, 1);
  assert.equal(owner.bodyImages.length, 1);
  assert.equal(fixture.paths.size, 1);
  assert.deepEqual(fixture.updates, []);
  assert.deepEqual(fixture.deletes, []);
});

test("MongoDB 50건 경계를 넘어도 정리 대상을 모두 집계", async () => {
  const owners = Array.from({ length: 51 }, () => post());
  const fixture = mock({ posts: owners, objects: owners.map((owner) => pathFor(owner)) });
  const report = await fixture.run();
  assert.equal(report.candidates, 51);
  assert.equal(report.candidateBytes, 51 * 125);
  assert.equal(report.incomplete, false);
});

test("유튜브와 이미지가 함께 저장된 본문에서 이미지 참조를 보존", async () => {
  const doc = clone(referencing);
  doc.document.content.splice(1, 0, { type: "youtubeVideo", attrs: { videoId: "Abcd_123-xy", title: "영상" } });
  const owner = post({ bodyDocument: doc, bodyImages: [asset(), asset({ id: other })] });
  const fixture = mock({ posts: [owner], objects: [pathFor(owner), pathFor(owner, other)] });
  const report = await fixture.run();
  assert.equal(report.preserved, 1);
  assert.equal(report.candidates, 1);
  assert.equal(fixture.candidates[0].imageId, other);
});
