import assert from "node:assert/strict";
import test from "node:test";
import { ObjectId } from "mongodb";
import { scanBodyImageCleanup } from "../admin/body-image-cleanup.mts";
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

function mock({ posts, objects, failedRemove = false, listError = false, infoError, beforeClaim }) {
  const paths = new Set(objects);
  const updates = [];
  const deletes = [];
  const orphans = [];
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
      if (infoError) return { error: infoError };
      return paths.has(name) ? { data: { name, bucketId: bucket, size: 125, id: name } }
        : { error: { status: 404, code: "NoSuchKey" } };
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
    paths, updates, deletes, orphans,
    run: (apply = false) => scanBodyImageCleanup(collection, storage, richText, {
      domain: "news", bucket, cutoff, apply, onOrphan: (path) => orphans.push(path),
    }),
  };
}

test("dry-run은 삭제 가능 건수와 바이트만 집계", async () => {
  const owner = post();
  const fixture = mock({ posts: [owner], objects: [pathFor(owner)] });
  const result = await fixture.run();
  assert.equal(result.candidates, 1);
  assert.equal(result.candidateBytes, 125);
  assert.equal(result.deleted, 0);
  assert.deepEqual(fixture.updates, []);
  assert.deepEqual(fixture.deletes, []);
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

test("일반 404는 객체 부재로 간주하지 않고 파일과 메타데이터를 보존", async () => {
  const owner = post();
  const fixture = mock({
    posts: [owner], objects: [pathFor(owner)], infoError: { status: 404, code: "not_found" },
  });
  assert.equal((await fixture.run(true)).failed, 1);
  assert.equal(owner.bodyImages.length, 1);
  assert.equal(fixture.paths.size, 1);
  assert.deepEqual(fixture.updates, []);
});

test("MongoDB 50건 경계를 넘어도 정리 대상을 모두 집계", async () => {
  const owners = Array.from({ length: 51 }, () => post());
  const fixture = mock({ posts: owners, objects: owners.map((owner) => pathFor(owner)) });
  const report = await fixture.run();
  assert.equal(report.candidates, 51);
  assert.equal(report.candidateBytes, 51 * 125);
  assert.equal(report.incomplete, false);
});
