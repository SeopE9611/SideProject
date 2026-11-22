import assert from "node:assert/strict";
import test from "node:test";
import { scanPdfStaging } from "../../src/lib/pdf-staging-cleanup.mjs";

const now = Date.UTC(2026, 0, 1);
const hour = 60 * 60_000;
const postId = "a".repeat(24);
const prefix = `shalom-house/news/${postId}/attachment-staging/`;
const pathFor = (index, age = 4 * hour) =>
  `${prefix}${((now - age) / 1000).toString(16)}${index.toString(16).padStart(16, "0")}.pdf`;
const file = (name, date = now - 4 * hour) => ({
  id: "storage-object", name, created_at: new Date(date).toISOString(), updated_at: new Date(date).toISOString(),
});

function mockStorage(files, { listErrorAt, removeErrorAt, onRemove, repeatCursor = false } = {}) {
  const objects = new Map(files.map((object) => [object.name, object]));
  const calls = { list: 0, remove: [] };
  return {
    calls, objects,
    async listV2({ prefix, cursor, limit }) {
      if (++calls.list === listErrorAt) return { error: new Error("storage unavailable") };
      const names = [...objects.keys()].filter((name) => name.startsWith(prefix) && (!cursor || name > cursor)).sort();
      const page = names.slice(0, limit);
      return { data: {
        objects: page.map((name) => objects.get(name)),
        hasNext: names.length > limit,
        nextCursor: repeatCursor && cursor ? cursor : page.at(-1),
      } };
    },
    async remove(paths) {
      calls.remove.push(paths);
      if (calls.remove.length === removeErrorAt) throw new Error("delete unavailable");
      const removed = paths.filter((name) => objects.has(name)).map((name) => objects.get(name));
      for (const object of removed) objects.delete(object.name);
      onRemove?.(objects);
      return { data: removed };
    },
  };
}

for (const size of [0, 1, 20, 21, 121]) {
  test(`임시 객체 ${size}개를 삭제로 이동한 페이지에서도 빠짐없이 조회`, async () => {
    const storage = mockStorage(Array.from({ length: size }, (_, index) => file(pathFor(index))));
    const result = await scanPdfStaging(storage, { domain: "news", postId, now, apply: true });
    assert.equal(storage.calls.list, Math.max(1, Math.ceil(size / 20)));
    assert.equal(result.deleted, size);
    assert.equal(result.incomplete, false);
    assert.equal(storage.objects.size, 0);
    assert.equal((await scanPdfStaging(storage, { domain: "news", postId, now, apply: true })).deleted, 0);
  });
}

test("기본 미리보기와 5페이지 한도는 삭제와 조회 범위를 제어", async () => {
  const storage = mockStorage(Array.from({ length: 121 }, (_, index) => file(pathFor(index))));
  const found = [];
  const preview = await scanPdfStaging(storage, { domain: "news", now, onCandidate: (path) => found.push(path) });
  assert.equal(preview.candidates, 121);
  assert.equal(found.length, 121);
  assert.equal(storage.calls.remove.length, 0);
  const limited = await scanPdfStaging(storage, { domain: "news", postId, now, apply: true, maxPages: 5 });
  assert.equal(limited.deleted, 100);
  assert.equal(limited.incomplete, true);
  assert.equal((await scanPdfStaging(storage, { domain: "news", now, apply: true })).deleted, 21);
});

test("경계, 갱신 직후, 미래, 불명확한 시각, 다른 게시물 및 최종 첨부 보호", async () => {
  const final = pathFor(7).replace("attachment-staging", "attachments");
  const other = pathFor(8).replace(postId, "b".repeat(24));
  const program = pathFor(9).replace("news", "programs");
  const invalidTime = { ...file(pathFor(10)), updated_at: "unknown" };
  const storage = mockStorage([
    file(pathFor(1)), file(pathFor(2, 3 * hour)), file(pathFor(3, 0)), file(pathFor(4, -hour)),
    file(pathFor(5), now - hour), file(prefix + "invalid.pdf"), file(prefix + "folder/" + "a".repeat(24) + ".pdf"),
    file(final), file(other), file(program), invalidTime,
  ]);
  const result = await scanPdfStaging(storage, { domain: "news", postId, now, apply: true });
  assert.deepEqual(storage.calls.remove, [[pathFor(1)]]);
  assert.equal(result.skipped, 7);
  assert.equal(storage.objects.size, 10);
  assert.equal((await scanPdfStaging(storage, { domain: "programs", now, apply: true })).deleted, 1);
  assert.equal(storage.objects.has(final), true);
  assert.equal(storage.objects.has(other), true);
});

test("목록 오류와 반복 커서를 보고하고 다음 실행에서 나머지 객체 처리", async () => {
  for (const config of [{ listErrorAt: 2 }, { repeatCursor: true }]) {
    const storage = mockStorage(Array.from({ length: 61 }, (_, index) => file(pathFor(index))), config);
    const failed = await scanPdfStaging(storage, { domain: "news", now, apply: true });
    assert.equal(failed.listFailed, true);
    assert.equal(failed.incomplete, true);
    assert.equal(storage.objects.size, 41);
    const retry = mockStorage([...storage.objects.values()]);
    assert.equal((await scanPdfStaging(retry, { domain: "news", now, apply: true })).deleted, 41);
  }
});

test("삭제 오류 후 다른 페이지를 정리하고 실패분은 재실행에서 처리", async () => {
  const storage = mockStorage(Array.from({ length: 21 }, (_, index) => file(pathFor(index))), { removeErrorAt: 1 });
  const result = await scanPdfStaging(storage, { domain: "news", now, apply: true });
  assert.equal(result.failed, 20);
  assert.equal(result.deleted, 1);
  assert.equal((await scanPdfStaging(storage, { domain: "news", now, apply: true })).deleted, 20);
});

test("정리 중 새로 만들어진 객체는 보존", async () => {
  const active = file(pathFor(100, 0), now);
  const storage = mockStorage(Array.from({ length: 41 }, (_, index) => file(pathFor(index))), {
    onRemove: (objects) => objects.set(active.name, active),
  });
  assert.equal((await scanPdfStaging(storage, { domain: "news", now, apply: true })).deleted, 41);
  assert.deepEqual([...storage.objects.keys()], [active.name]);
});
