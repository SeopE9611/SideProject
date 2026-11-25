import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import test from "node:test";
import ts from "typescript";

const root = resolve(import.meta.dirname, "../../src");
const require = createRequire(import.meta.url);
const loaded = new Map();
// MongoDB, Storage 및 관리자 세션은 모두 메모리 대역으로 대체합니다.
let post;
let downloads;
let authorization;
let uploadSucceeds = false;
const storedPaths = new Map();
const mocks = {
  "server-only": {},
  "@/lib/mongodb": { getMongoDatabase: async () => ({
    collection: () => ({
      findOne: async (query) => {
        if (!post || post.deletedAt != null || (query._id && !post._id.equals(query._id)) ||
            (query.updatedAt && post.updatedAt.getTime() !== query.updatedAt.getTime()) ||
            (query.slug && post.slug !== query.slug) ||
            (query.publicationStatus && post.publicationStatus !== query.publicationStatus) ||
            (query.approvalStatus === "approved" && post.approvalStatus !== "approved") ||
            (query.publishedAt?.$lte && (!post.publishedAt || post.publishedAt > query.publishedAt.$lte))) return null;
        return post;
      },
      updateOne: async (_query, update) => {
        if (update.$push) post.bodyImages.push(update.$push.bodyImages);
        if (update.$set) {
          const image = post.bodyImages.find(({ id }) => id === _query.bodyImages.$elemMatch.id);
          image.state = update.$set["bodyImages.$.state"];
        }
        return { matchedCount: 1 };
      },
    }),
  }) },
  "@/lib/supabase-admin": {
    getGalleryPrivateBucketName: () => "test-private",
    getSupabaseAdminClient: () => ({
      storage: { from: () => ({
        download: async (path) => {
          downloads.push(path);
          return { data: storedPaths.get(path) };
        },
        upload: async (path, buffer) => {
          if (!uploadSucceeds) return { error: new Error("simulated") };
          storedPaths.set(path, new Blob([buffer]));
          return { data: { path } };
        },
      }) },
    }),
  },
  "@/features/admin-auth/admin-auth.service": {
    getCurrentAdmin: async () => authorization,
    isSameOriginRequest: () => true,
  },
  "@/features/admin-auth/admin-authorization": {
    authorizeCurrentAdmin: async () => authorization ? { ok: true, admin: authorization } : { ok: false, reason: "unauthorized" },
  },
};

function load(path) {
  const file = [path + ".ts", path + ".tsx"].find(existsSync);
  if (loaded.has(file)) return loaded.get(file).exports;
  const entry = { exports: {} };
  loaded.set(file, entry);
  const localRequire = (name) => Object.hasOwn(mocks, name) ? mocks[name]
    : name.startsWith("@/") ? load(resolve(root, name.slice(2)))
    : name.startsWith(".") ? load(resolve(dirname(file), name)) : require(name);
  const code = ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  new Function("require", "module", "exports", code)(localRequire, entry, entry.exports);
  return entry.exports;
}

const rich = load(resolve(root, "features/news/news.rich-text"));
const assets = load(resolve(root, "features/news/body-image-assets"));
const webpValidation = load(resolve(root, "lib/server-webp-validation"));
const storage = load(resolve(root, "features/news/body-image-storage"));
const adminRoute = load(resolve(root, "app/api/admin/body-images/[domain]/[postId]/route"));
const editor = load(resolve(root, "components/admin/admin-body-image"));
const { ObjectId } = require("mongodb");
const { EditorState } = require("@tiptap/pm/state");
const { getSchema } = require("@tiptap/react");
const starter = require("@tiptap/starter-kit").default;
const one = "a".repeat(24);
const two = "b".repeat(24);
const postId = "1".repeat(24);
const now = new Date("2026-11-22T01:00:00.000Z");
const text = (text) => ({ type: "paragraph", content: [{ type: "text", text }] });
const image = (imageId, extra = {}) => ({ type: "bodyImage", attrs: { imageId, alt: " 산책길 ", ...extra } });
const doc = (...content) => ({ version: 1, document: { type: "doc", content } });
const record = (id, state = "ready", expiresAt = assets.bodyImageExpiry(now)) => ({
  id, state, expiresAt, bucket: "test-private", width: 10, height: 10, subjectPresence: "non_identifiable",
});

test("텍스트 문서 호환, 이미지 순서·대체 텍스트 보존, 이미지 이동 감지", () => {
  const prior = rich.parseNewsBodyDocument(doc(text("활동 안내"), image(one), image(two), text("마무리")));
  const next = rich.parseNewsBodyDocument(doc(text("활동 안내"), image(two), image(one), text("마무리")));
  assert.ok(rich.parseNewsBodyDocument(doc(text("기존 본문"))));
  assert.deepEqual(rich.bodyImageReferences(prior), [{ imageId: one, alt: "산책길" }, { imageId: two, alt: "산책길" }]);
  const body = rich.newsDocumentToBody(prior);
  assert.deepEqual(body, ["활동 안내", "마무리"]);
  assert.ok(rich.sameNewsBodyText(body, rich.newsDocumentToBody(next)));
  assert.deepEqual(rich.resolveNewsBodyUpdate(body, prior, body, next).bodyDocument, next);
});

test("외부 주소, 임의 속성, 잘못된 ID 및 위치, 중복 이미지를 거절", () => {
  for (const node of [image(one, { src: "https://example.com/pic" }), image(one, { width: 22 }),
    image("bad"), image(one, { alt: "" }), image(one, { alt: "가".repeat(181) })]) {
    assert.equal(rich.parseNewsBodyDocument(doc(text("본문"), node)), null);
  }
  assert.equal(rich.parseNewsBodyDocument(doc(text("본문"), image(one), image(one))), null);
  assert.equal(rich.parseNewsBodyDocument(doc({ type: "paragraph", content: [image(one)] })), null);
});

test("저장 시 소유·준비·만료 검증, 제거 확정 뒤 권한 철회 및 참조 제거", () => {
  const next = rich.parseNewsBodyDocument(doc(text("초안"), image(one)));
  assert.equal(assets.resolveBodyImageAssets([record(two)], undefined, next, now), null);
  assert.equal(assets.resolveBodyImageAssets([record(one, "uploading")], undefined, next, now), null);
  assert.equal(assets.resolveBodyImageAssets([record(one, "ready", now)], undefined, next, now), null);
  const pending = record(one);
  const attached = assets.resolveBodyImageAssets([pending], undefined, next, now);
  assert.equal(pending.state, "ready");
  assert.equal(attached[0].state, "attached");
  assert.ok(assets.canReadBodyImage(attached[0], true, false, now));
  assert.equal(assets.canReadBodyImage(attached[0], false, false, now), false);
  const removed = assets.resolveBodyImageAssets(attached, next, doc(text("초안")), now);
  assert.equal(removed[0].state, "discarded");
  assert.equal(assets.canReadBodyImage(removed[0], true, false, now), false);
  assert.equal(assets.resolveBodyImageAssets(removed, undefined, next, now), null);
});

test("Tiptap 스키마에서 커서 위치 삽입, 뒤 문단 유지, 삭제 후 재파싱", () => {
  const schema = getSchema([editor.BodyImageDocument, editor.BodyImageNode, starter.configure({ document: false })]);
  let state = EditorState.create({ schema, doc: schema.nodeFromJSON(doc(text("앞뒤")).document) });
  const view = { get state() { return state; }, schema, view: { dispatch: (tr) => { state = state.apply(tr); } } };
  assert.equal(editor.insertBodyImage(view, 2, { imageId: one, alt: "정원" }), true);
  const parsed = rich.parseNewsBodyDocument({ version: 1, document: state.doc.toJSON() });
  assert.deepEqual(rich.newsDocumentToBody(parsed), ["앞", "뒤"]);
  assert.deepEqual(rich.bodyImageReferences(parsed), [{ imageId: one, alt: "정원" }]);
  const index = state.doc.child(0).nodeSize;
  state = state.apply(state.tr.delete(index, index + 1));
  assert.deepEqual(rich.bodyImageReferences(rich.parseNewsBodyDocument({ version: 1, document: state.doc.toJSON() })), []);
});

test("실제 이미지 제공 함수에서 초안·게시 중단·삭제·권한 철회 시 다운로드 호출 차단", async () => {
  downloads = [];
  post = { _id: new ObjectId(postId), slug: "activity", body: ["본문"],
    bodyDocument: doc(text("본문"), image(one)), bodyImages: [record(one, "attached", null)],
    publicationStatus: "draft", approvalStatus: "approved", publishedAt: now };
  const path = `shalom-house/news/${postId}/body-images/${one}.webp`;
  storedPaths.set(path, new Blob(["stub"]));
  const get = () => storage.serveBodyImage("news", "activity", one, false);
  assert.equal((await get()).status, 404);
  post.publicationStatus = "published";
  const ok = await get();
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get("cache-control"), "private, no-store");
  assert.equal(ok.headers.get("location"), null);
  assert.deepEqual(downloads, [path]);
  post.bodyImages[0].state = "discarded";
  assert.equal((await get()).status, 404);
  post.bodyImages[0].state = "attached";
  post.deletedAt = now;
  assert.equal((await get()).status, 404);
  post.deletedAt = null;
  post.publicationStatus = "draft";
  assert.equal((await get()).status, 404);
  assert.equal(downloads.length, 1);
});

test("업로드 실패와 수정 충돌은 본문과 연결된 이미지를 보존", async () => {
  const original = doc(text("본문"), image(one));
  post = { _id: new ObjectId(postId), body: ["본문"], bodyDocument: original, updatedAt: now,
    bodyImages: [record(one, "attached", null)], publicationStatus: "draft", approvalStatus: "pending", publishedAt: null };
  authorization = { role: "admin" };
  const fixture = readFileSync(resolve(root, "content/fixtures/assets/square.webp"));
  const request = (version, declaration = "true") => new Request("https://example.com/api/admin/body-images/news/" + postId, {
    method: "POST", headers: { "content-type": "image/webp", "x-expected-updated-at": version, "x-non-identifiable-image": declaration },
    body: fixture,
  });
  const ctx = { params: Promise.resolve({ domain: "news", postId }) };
  assert.equal((await adminRoute.POST(request(now.toISOString(), "false"), ctx)).status, 400);
  assert.equal((await adminRoute.POST(request(new Date(0).toISOString()), ctx)).status, 409);
  assert.equal(post.bodyImages.length, 1);
  assert.equal((await adminRoute.POST(request(now.toISOString()), ctx)).status, 503);
  assert.strictEqual(post.bodyDocument, original);
  assert.equal(post.bodyImages[0].state, "attached");
  assert.equal(post.bodyImages[1].state, "uploading");
  authorization = null;
  assert.equal((await adminRoute.GET(new Request("https://example.com?image=" + one), ctx)).status, 401);
});

test("프로그램 본문 이미지 업로드 직후에는 소유 게시물의 관리자만 미리보기 가능", async () => {
  downloads = [];
  uploadSucceeds = true;
  authorization = { role: "editor" };
  post = { _id: new ObjectId(postId), slug: "activity", body: ["프로그램 본문"], updatedAt: now,
    bodyImages: [], publicationStatus: "draft", approvalStatus: "pending", publishedAt: null };
  const ctx = { params: Promise.resolve({ domain: "programs", postId }) };
  const response = await adminRoute.POST(new Request("https://example.com", {
    method: "POST", headers: { "content-type": "image/webp", "x-expected-updated-at": now.toISOString(),
      "x-non-identifiable-image": "true" },
    body: readFileSync(resolve(root, "content/fixtures/assets/square.webp")),
  }), ctx);
  assert.equal(response.status, 201);
  const { id } = await response.json();
  assert.equal(post.bodyImages[0].state, "ready");
  assert.equal(post.bodyDocument, undefined);
  assert.equal((await storage.serveBodyImage("programs", "activity", id, false)).status, 404);
  assert.equal((await storage.serveBodyImage("programs", "2".repeat(24), id, true)).status, 404);
  assert.equal(downloads.length, 0);
  const preview = await adminRoute.GET(new Request("https://example.com?image=" + id), ctx);
  assert.equal(preview.status, 200);
  assert.deepEqual(downloads, [`shalom-house/programs/${postId}/body-images/${id}.webp`]);
});

// Chromium 151에서 480×300 합성 JPEG를 convertImageToWebp로 변환한 Canvas 출력입니다.
const chromiumWebp = readFileSync(new URL("./fixtures/chromium-canvas-jpeg.webp", import.meta.url));
const validateWebp = (buffer, type = "image/webp") =>
  webpValidation.validateServerWebp(new File([buffer], "test.webp", { type }));

test("Chromium Canvas의 ICC 색상 프로필이 있는 정적 WebP를 허용", async () => {
  const result = await validateWebp(chromiumWebp);
  assert.equal(result.ok, true);
  assert.deepEqual([result.value.width, result.value.height], [480, 300]);
  assert.equal(assets.isBodyImageWebpContainer(result.value.buffer, 480, 300), true);
  const legacy = await validateWebp(readFileSync(resolve(root, "content/fixtures/assets/square.webp")));
  assert.equal(legacy.ok, true);
  assert.equal(assets.isBodyImageWebpContainer(legacy.value.buffer, legacy.value.width, legacy.value.height), true);
});

test("WebP MIME·서명·크기 제한과 정적 청크 구조를 검증", async () => {
  const changed = (mutate) => {
    const bytes = Buffer.from(chromiumWebp);
    mutate(bytes);
    return bytes;
  };
  assert.equal((await validateWebp(chromiumWebp, "image/png")).ok, false);
  assert.equal((await validateWebp(changed((b) => b.write("RIFX", 0)))).ok, false);
  assert.equal((await validateWebp(changed((b) => b.writeUIntLE(4096, 24, 3)))).ok, false);
  assert.equal((await validateWebp(Buffer.alloc(3 * 1024 * 1024 + 1))).ok, false);
  const invalidContainers = [
    changed((b) => b.writeUInt32LE(b.length - 9, 4)),
    changed((b) => b.writeUInt32LE(b.length, 498)),
    changed((b) => b.writeUIntLE(480, 24, 3)),
    changed((b) => { b[20] = 0; }),
    changed((b) => { b[20] |= 0x02; }),
    changed((b) => b.write("ANIM", 30)),
    changed((b) => b.write("EXIF", 30)),
    changed((b) => b.write("JUNK", 30)),
    changed((b) => b.write("bad!", 38 + 36)),
    changed((b) => b.writeUInt32BE(457, 38)),
    changed((b) => b.writeUInt32BE(456, 38 + 132 + 4)),
  ];
  const truncated = Buffer.from(chromiumWebp.subarray(0, -1));
  truncated.writeUInt32LE(truncated.length - 8, 4);
  invalidContainers.push(truncated);
  const duplicateProfile = Buffer.concat([chromiumWebp.subarray(0, 494), chromiumWebp.subarray(30)]);
  duplicateProfile.writeUInt32LE(duplicateProfile.length - 8, 4);
  invalidContainers.push(duplicateProfile);
  const missingProfile = Buffer.concat([chromiumWebp.subarray(0, 30), chromiumWebp.subarray(494)]);
  missingProfile.writeUInt32LE(missingProfile.length - 8, 4);
  invalidContainers.push(missingProfile);
  const misplacedProfile = Buffer.concat([missingProfile, chromiumWebp.subarray(30, 494)]);
  misplacedProfile.writeUInt32LE(misplacedProfile.length - 8, 4);
  invalidContainers.push(misplacedProfile);
  for (const bytes of invalidContainers) {
    const result = await validateWebp(bytes);
    assert.equal(result.ok, true);
    assert.equal(assets.isBodyImageWebpContainer(bytes, result.value.width, result.value.height), false);
  }
});
