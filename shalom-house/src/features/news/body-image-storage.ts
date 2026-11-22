import "server-only";

import { ObjectId } from "mongodb";
import { getMongoDatabase } from "@/lib/mongodb";
import { validateServerWebp, SERVER_WEBP_MAX_BYTES } from "@/lib/server-webp-validation";
import { getGalleryPrivateBucketName, getSupabaseAdminClient } from "@/lib/supabase-admin";
import { NEWS_COLLECTION_NAME } from "./news.mongo-schema";
import { PROGRAM_COLLECTION_NAME } from "@/features/programs/program.mongo-schema";
import { bodyImageReferences, newsDocumentToBody, parseNewsBodyDocument, sameNewsBodyText, type NewsBodyDocument } from "./news.rich-text";
import { bodyImageExpiry, canReadBodyImage, isBodyImageWebpContainer } from "./body-image-assets";
import { isBodyImageId, type BodyImageAsset, type BodyImageDomain } from "./body-image-reference";

type ImagePost = {
  _id: ObjectId;
  slug: string;
  updatedAt: Date;
  publicationStatus: string;
  approvalStatus: string;
  publishedAt: Date | null;
  deletedAt?: Date | null;
  body: string[];
  bodyDocument?: NewsBodyDocument;
  bodyImages?: BodyImageAsset[];
};

const maxStagedRecords = 40;
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
export const imageResponse = (status: number) => new Response(null, { status, headers });
const json = (status: number, data: object) => Response.json(data, { status, headers });
const failure = (status: number, error: string) => json(status, { ok: false, error });

const posts = async (domain: BodyImageDomain) =>
  (await getMongoDatabase()).collection<ImagePost>(domain === "news" ? NEWS_COLLECTION_NAME : PROGRAM_COLLECTION_NAME);
const storage = (bucket: string) => getSupabaseAdminClient().storage.from(bucket);
const pathFor = (domain: BodyImageDomain, postId: string, imageId: string) =>
  `shalom-house/${domain}/${postId}/body-images/${imageId}.webp`;
const active = { deletedAt: null } as const;
const editable = { publicationStatus: "draft", approvalStatus: { $in: ["pending", "rejected"] }, publishedAt: null };

function references(post: ImagePost) {
  const rich = parseNewsBodyDocument(post.bodyDocument);
  return rich && Array.isArray(post.body) && post.body.every((block) => typeof block === "string") &&
    sameNewsBodyText(post.body, newsDocumentToBody(rich)) ? bodyImageReferences(rich) : [];
}

async function readWebp(request: Request) {
  if (!request.body || Number(request.headers.get("content-length")) > SERVER_WEBP_MAX_BYTES) return null;
  const reader = request.body.getReader();
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > SERVER_WEBP_MAX_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(new Uint8Array(value));
    }
  } finally {
    reader.releaseLock();
  }
  return validateServerWebp(new File(chunks, "body-image.webp", { type: "image/webp" }));
}

async function cleanExpiredImages(domain: BodyImageDomain, post: ImagePost, bucket: string, now: Date) {
  // 손상된 문서를 빈 참조 목록으로 해석해서 파일을 삭제하지 않습니다.
  const document = parseNewsBodyDocument(post.bodyDocument);
  if (post.bodyDocument !== undefined && !document) return;
  const referenced = new Set(bodyImageReferences(document ?? undefined).map(({ imageId }) => imageId));
  const candidates = (post.bodyImages ?? []).filter((asset) =>
    asset.state !== "attached" && asset.expiresAt instanceof Date && asset.expiresAt <= now &&
    asset.bucket === bucket && isBodyImageId(asset.id) && !referenced.has(asset.id)).slice(0, 8);
  if (!candidates.length) return;
  const collection = await posts(domain);
  for (const asset of candidates) {
    try {
      // 상태 전환을 먼저 확정합니다. 이후 저장에서 이 객체를 새로 참조할 수 없습니다.
      const claimed = await collection.updateOne({
        _id: post._id,
        updatedAt: post.updatedAt,
        bodyImages: { $elemMatch: { id: asset.id, bucket, state: asset.state, expiresAt: { $lte: now } } },
      }, { $set: { "bodyImages.$.state": "discarded" } });
      if (claimed.matchedCount !== 1) continue;
      const { error } = await storage(bucket).remove([pathFor(domain, post._id.toHexString(), asset.id)]);
      if (error) throw new Error("remove_failed");
      await collection.updateOne({ _id: post._id }, { $pull: { bodyImages: { id: asset.id, state: "discarded" } } });
    } catch {
      console.error("본문 이미지 임시 객체 정리 실패", { domain, postId: post._id.toHexString(), imageId: asset.id });
    }
  }
}

export async function uploadBodyImage(request: Request, domain: BodyImageDomain, postId: string) {
  const version = request.headers.get("x-expected-updated-at") ?? "";
  const expectedUpdatedAt = new Date(version);
  if (request.headers.get("content-type") !== "image/webp" ||
      request.headers.get("x-non-identifiable-image") !== "true" ||
      !Number.isFinite(expectedUpdatedAt.getTime()) || expectedUpdatedAt.toISOString() !== version)
    return failure(400, "invalid_image_request");

  const collection = await posts(domain);
  const matchingDraft = { _id: new ObjectId(postId), ...active, ...editable, updatedAt: expectedUpdatedAt };
  const post = await collection.findOne(matchingDraft);
  if (!post) return failure(409, "edit_conflict");
  const image = await readWebp(request);
  if (!image?.ok) return failure(400, "invalid_webp");
  const { buffer, width, height } = image.value;
  if (!isBodyImageWebpContainer(buffer, width, height)) return failure(400, "invalid_webp");

  const bucket = getGalleryPrivateBucketName();
  const now = new Date();
  await cleanExpiredImages(domain, post, bucket, now);
  const id = new ObjectId().toHexString();
  const asset: BodyImageAsset = {
    id, bucket, width, height, subjectPresence: "non_identifiable", state: "uploading", expiresAt: bodyImageExpiry(now),
  };
  // DB에 먼저 예약해 응답 유실이나 브라우저 종료 이후에도 정리 가능한 소유 기록을 남깁니다.
  const reserved = await collection.updateOne({
    ...matchingDraft, [`bodyImages.${maxStagedRecords - 1}`]: { $exists: false },
  }, { $push: { bodyImages: asset } });
  if (!reserved.matchedCount)
    return failure(409, (await collection.findOne(matchingDraft, { projection: { _id: 1 } })) ? "image_limit" : "edit_conflict");
  const path = pathFor(domain, postId, id);
  const { data, error } = await storage(bucket).upload(path, buffer, {
    contentType: "image/webp", cacheControl: "0", upsert: false,
  });
  if (error || data?.path !== path) return failure(503, "image_upload_failed");
  const completed = await collection.updateOne({
    ...matchingDraft, bodyImages: { $elemMatch: { id, state: "uploading", expiresAt: { $gt: new Date() } } },
  }, { $set: { "bodyImages.$.state": "ready" } });
  if (!completed.matchedCount) return failure(409, "edit_conflict");
  return json(201, { ok: true, id });
}

export async function serveBodyImage(domain: BodyImageDomain, owner: string, imageId: string, admin: boolean) {
  if (!isBodyImageId(imageId) || (admin && !isBodyImageId(owner))) return imageResponse(404);
  const now = new Date();
  const collection = await posts(domain);
  const post = await collection.findOne(admin
    ? { _id: new ObjectId(owner), ...active }
    : { slug: owner, ...active, publicationStatus: "published", approvalStatus: "approved", publishedAt: { $lte: now, $type: "date" } },
  { projection: { body: 1, bodyDocument: 1, bodyImages: 1 } });
  const asset = post?.bodyImages?.find(({ id }) => id === imageId);
  if (!post || !asset || !canReadBodyImage(asset, references(post).some((ref) => ref.imageId === imageId), admin, now))
    return imageResponse(404);
  const bucket = getGalleryPrivateBucketName();
  if (asset.bucket !== bucket) return imageResponse(404);
  const { data, error } = await storage(bucket).download(pathFor(domain, post._id.toHexString(), imageId));
  if (error || !data || data.size > SERVER_WEBP_MAX_BYTES) return imageResponse(503);
  return new Response(data, { headers: {
    ...headers, "Content-Type": "image/webp", "Content-Disposition": "inline",
  } });
}
