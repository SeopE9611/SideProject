import { ObjectId, type Collection, type Filter } from "mongodb";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { BodyImageAsset, BodyImageDomain } from "../../src/features/news/body-image-reference";
import type { NewsBodyDocument } from "../../src/features/news/news.rich-text";

type RichText = typeof import("../../src/features/news/news.rich-text");
type Storage = ReturnType<SupabaseClient["storage"]["from"]>;
export type CleanupPost = {
  _id: ObjectId;
  updatedAt: Date;
  deletedAt?: Date | null;
  body: string[];
  bodyDocument?: NewsBodyDocument;
  bodyImages?: BodyImageAsset[];
};

const bodyImagePath = /^shalom-house\/(news|programs)\/([a-f0-9]{24})\/body-images\/([a-f0-9]{24})\.webp$/;
const idPattern = /^[a-f0-9]{24}$/;
const readFields = { updatedAt: 1, deletedAt: 1, body: 1, bodyDocument: 1, bodyImages: 1 };
const majority = { writeConcern: { w: "majority" as const } };

type CleanupTarget = { domain: BodyImageDomain; postId: string; imageId: string };
type CleanupCandidate = CleanupTarget & {
  state: BodyImageAsset["state"];
  expiresAt: string;
  path: string;
  bytes: number | null;
  exists: boolean;
};

export function parseBodyImageCleanupArgs(args: string[]): { apply: boolean; target?: CleanupTarget } | null {
  const options = new Map<string, string | true>();
  for (let index = 0; index < args.length; index++) {
    const option = args[index];
    if (options.has(option)) return null;
    if (["--apply", "--dry-run", "--all"].includes(option)) {
      options.set(option, true);
    } else if (["--domain", "--post-id", "--image-id"].includes(option)) {
      const value = args[++index];
      if (!value || value.startsWith("--")) return null;
      options.set(option, value);
    } else {
      return null;
    }
  }

  const apply = options.has("--apply");
  const all = options.has("--all");
  if ((apply && options.has("--dry-run")) || (all && !apply)) return null;
  const domain = options.get("--domain");
  const postId = options.get("--post-id");
  const imageId = options.get("--image-id");
  if (domain === undefined && postId === undefined && imageId === undefined) {
    return apply && !all ? null : { apply };
  }
  if (all || (domain !== "news" && domain !== "programs") ||
      typeof postId !== "string" || !idPattern.test(postId) ||
      typeof imageId !== "string" || !idPattern.test(imageId)) return null;
  return { apply, target: { domain, postId, imageId } };
}

function classify(
  post: CleanupPost,
  asset: BodyImageAsset | undefined,
  bucket: string,
  cutoff: Date,
  richText: RichText,
) {
  if (post.deletedAt != null || asset?.state === "attached") return "preserved";
  if (!asset || !(post._id instanceof ObjectId) || !(post.updatedAt instanceof Date) ||
      !Number.isFinite(post.updatedAt.getTime()) || typeof asset.id !== "string" || !idPattern.test(asset.id) ||
      asset.bucket !== bucket || asset.subjectPresence !== "non_identifiable" ||
      post.bodyImages?.filter((item) => item?.id === asset.id).length !== 1 ||
      !["uploading", "ready", "discarded"].includes(asset.state) ||
      !(asset.expiresAt instanceof Date) || !Number.isFinite(asset.expiresAt.getTime())) return "skipped";
  if (asset.expiresAt > cutoff) return "preserved";
  if (!Array.isArray(post.body) || !post.body.length ||
      !post.body.every((line) => typeof line === "string" && line.trim().length > 0)) return "skipped";
  if (post.bodyDocument !== undefined) {
    const document = richText.parseNewsBodyDocument(post.bodyDocument);
    if (!document || !richText.sameNewsBodyText(post.body, richText.newsDocumentToBody(document))) return "skipped";
    if (richText.bodyImageReferences(document).some(({ imageId }) => imageId === asset.id)) return "preserved";
  }
  return "eligible";
}

async function* postsWithImages(collection: Collection<CleanupPost>) {
  let lastId: ObjectId | undefined;
  for (;;) {
    const posts = await collection.find({
      "bodyImages.0": { $exists: true }, ...(lastId ? { _id: { $gt: lastId } } : {}),
    }, { projection: readFields, sort: { _id: 1 }, limit: 50 }).toArray();
    if (!posts.length) return;
    const nextId = posts.at(-1)?._id;
    if (!(nextId instanceof ObjectId) || (lastId && nextId.toHexString() <= lastId.toHexString()))
      throw new Error("mongo_scan_incomplete");
    yield* posts;
    lastId = nextId;
    if (posts.length < 50) return;
  }
}

async function storageObject(storage: Storage, path: string, bucket: string) {
  const { data, error } = await storage.info(path);
  if (error) {
    const code = "code" in error ? error.code : undefined;
    if (error.status === 404 && (code === "NoSuchKey" || error.statusCode === "NoSuchKey")) return null;
    // Storage가 HTTP 400으로 감싼 객체 부재 응답도 서비스 코드까지 일치할 때만 허용합니다.
    if (error.status === 400 && error.statusCode === "404" && code === "NoSuchKey") return null;
    throw new Error("storage_info_failed");
  }
  if (!data || data.name !== path || data.bucketId !== bucket || !data.id ||
      typeof data.size !== "number" || !Number.isSafeInteger(data.size) || data.size < 0) {
    throw new Error("storage_object_unconfirmed");
  }
  return { bytes: data.size, id: data.id };
}

async function reportOrphans(
  collection: Collection<CleanupPost>,
  storage: Storage,
  domain: BodyImageDomain,
  onOrphan: (path: string) => void,
) {
  const cursors = new Set<string>();
  let cursor: string | undefined;
  let count = 0;
  for (;;) {
    const { data, error } = await storage.listV2({
      prefix: `shalom-house/${domain}/`, limit: 100, cursor, sortBy: { column: "name", order: "asc" },
    });
    if (error || !data || !Array.isArray(data.objects) || typeof data.hasNext !== "boolean" ||
        (data.hasNext && (!data.nextCursor || cursors.has(data.nextCursor)))) throw new Error("storage_list_incomplete");
    const paths = data.objects.flatMap(({ name }) => {
      const match = bodyImagePath.exec(name);
      return match?.[0] === name && match[1] === domain ? [{ name, postId: match[2], imageId: match[3] }] : [];
    });
    if (paths.length) {
      const ids = [...new Set(paths.map(({ postId }) => postId))].map((id) => new ObjectId(id));
      const posts = await collection.find({ _id: { $in: ids } }, { projection: { bodyImages: 1 } }).toArray();
      const byId = new Map(posts.map((post) => [post._id.toHexString(), post]));
      for (const { name, postId, imageId } of paths) {
        const owner = byId.get(postId);
        if (!owner || owner.bodyImages == null ||
            (Array.isArray(owner.bodyImages) && !owner.bodyImages.some((asset) => asset?.id === imageId))) {
          onOrphan(name);
          count++;
        }
      }
    }
    if (!data.hasNext) return count;
    cursor = data.nextCursor!;
    cursors.add(cursor);
  }
}

export async function scanBodyImageCleanup(
  collection: Collection<CleanupPost>, storage: Storage, richText: RichText,
  { domain, bucket, apply = false, cutoff = new Date(), target,
    onCandidate = () => {}, onOrphan = () => {}, onFailure = () => {} }: {
    domain: BodyImageDomain;
    bucket: string;
    apply?: boolean;
    cutoff?: Date;
    target?: CleanupTarget;
    onCandidate?: (candidate: CleanupCandidate) => void;
    onOrphan?: (path: string) => void;
    onFailure?: (path: string) => void;
  },
) {
  if ((domain !== "news" && domain !== "programs") ||
      (target && (target.domain !== domain || !idPattern.test(target.postId) || !idPattern.test(target.imageId))))
    throw new Error("cleanup_scope_invalid");
  const result = {
    candidates: 0, candidateBytes: 0, preserved: 0, skipped: 0, failed: 0,
    orphaned: 0, deleted: 0, missing: 0, metadataOnly: 0, incomplete: false,
  };
  try {
    let posts: AsyncIterable<CleanupPost> | CleanupPost[];
    if (target) {
      const owner = await collection.findOne({ _id: new ObjectId(target.postId) }, { projection: readFields });
      if (!owner || owner.bodyImages == null ||
          (Array.isArray(owner.bodyImages) && !owner.bodyImages.some((asset) => asset?.id === target.imageId))) {
        const path = `shalom-house/${domain}/${target.postId}/body-images/${target.imageId}.webp`;
        try {
          if (await storageObject(storage, path, bucket)) {
            result.orphaned++;
            onOrphan(path);
          } else {
            result.skipped++;
          }
        } catch {
          result.failed++;
          onFailure(path);
        }
        return result;
      }
      posts = [owner];
    } else {
      result.orphaned = await reportOrphans(collection, storage, domain, onOrphan);
      posts = postsWithImages(collection);
    }
    for await (const post of posts) {
      if (!Array.isArray(post.bodyImages)) { result.skipped++; continue; }
      for (const asset of post.bodyImages) {
        if (target && (post._id.toHexString() !== target.postId || asset?.id !== target.imageId)) continue;
        const status = classify(post, asset, bucket, cutoff, richText);
        if (status !== "eligible") { result[status]++; continue; }
        const path = `shalom-house/${domain}/${post._id.toHexString()}/body-images/${asset.id}.webp`;
        try {
          const object = await storageObject(storage, path, bucket);
          if (object) {
            result.candidates++;
            result.candidateBytes += object.bytes;
          } else {
            result.missing++;
          }
          if (!apply) {
            onCandidate({
              domain, postId: post._id.toHexString(), imageId: asset.id, state: asset.state,
              expiresAt: asset.expiresAt!.toISOString(), path, bytes: object?.bytes ?? null, exists: object !== null,
            });
            continue;
          }

          const latest = await collection.findOne({ _id: post._id }, { projection: readFields });
          const currentAsset = latest?.bodyImages?.find((item) => item?.id === asset.id);
          if (!latest || !currentAsset || classify(latest, currentAsset, bucket, cutoff, richText) !== "eligible" ||
              latest.updatedAt.getTime() !== post.updatedAt.getTime() ||
              currentAsset.state !== asset.state || currentAsset.expiresAt?.getTime() !== asset.expiresAt?.getTime()) {
            result.skipped++;
            continue;
          }
          const match = { id: currentAsset.id, bucket, state: currentAsset.state, expiresAt: currentAsset.expiresAt };
          const filter: Filter<CleanupPost> = {
            _id: latest._id, updatedAt: latest.updatedAt, deletedAt: null, body: { $eq: latest.body },
            bodyDocument: latest.bodyDocument === undefined ? { $exists: false } : { $eq: latest.bodyDocument },
            bodyImages: { $elemMatch: match },
          };
          // discarded는 기존 본문 저장과 업로드 완료 흐름에서 다시 연결할 수 없는 상태입니다.
          const claimed = await collection.updateOne(filter, { $set: { "bodyImages.$.state": "discarded" } }, majority);
          if (!claimed.acknowledged) throw new Error("cleanup_claim_unconfirmed");
          if (claimed.matchedCount !== 1) { result.skipped++; continue; }

          if (object) {
            const { data, error } = await storage.remove([path]);
            if (error || !Array.isArray(data)) throw new Error("storage_delete_unconfirmed");
            if (!data.some((item) => item.name === path && item.id === object.id) && await storageObject(storage, path, bucket))
              throw new Error("storage_delete_unconfirmed");
          }

          const discarded = { ...match, state: "discarded" as const };
          const removed = await collection.updateOne(
            { _id: latest._id, bodyImages: { $elemMatch: discarded } },
            { $pull: { bodyImages: discarded } }, majority,
          );
          if (!removed.acknowledged || (removed.matchedCount !== 1 && await collection.findOne({
            _id: latest._id, "bodyImages.id": asset.id,
          }, { projection: { _id: 1 } }))) throw new Error("metadata_delete_unconfirmed");
          if (object) result.deleted++;
          else result.metadataOnly++;
        } catch {
          result.failed++;
          onFailure(path);
        }
      }
    }
  } catch {
    result.incomplete = true;
  }
  return result;
}
