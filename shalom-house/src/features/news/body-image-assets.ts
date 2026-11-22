import { bodyImageReferences, type NewsBodyDocument } from "./news.rich-text";
import type { BodyImageAsset } from "./body-image-reference";

const RETENTION_MS = 24 * 60 * 60 * 1000;
export const bodyImageExpiry = (now: Date) => new Date(now.getTime() + RETENTION_MS);

export function canReadBodyImage(asset: BodyImageAsset, referenced: boolean, admin: boolean, now: Date): boolean {
  if (asset.subjectPresence !== "non_identifiable") return false;
  if (asset.state === "attached") return referenced && asset.expiresAt === null;
  return admin && asset.state === "ready" && asset.expiresAt instanceof Date && asset.expiresAt > now;
}

// 본문과 같은 게시물 문서에 속한 준비 완료 객체만 참조합니다.
export function resolveBodyImageAssets(
  assets: readonly BodyImageAsset[],
  before: NewsBodyDocument | undefined,
  after: NewsBodyDocument | undefined,
  now: Date,
): BodyImageAsset[] | null {
  const previous = new Set(bodyImageReferences(before).map(({ imageId }) => imageId));
  const next = new Set(bodyImageReferences(after).map(({ imageId }) => imageId));
  for (const id of next) {
    const asset = assets.find((item) => item.id === id);
    if (!asset || !canReadBodyImage(asset, previous.has(id), true, now)) return null;
  }
  return assets.map((asset) => {
    if (next.has(asset.id)) return { ...asset, state: "attached", expiresAt: null };
    if (asset.state === "attached" && previous.has(asset.id))
      return { ...asset, state: "discarded", expiresAt: bodyImageExpiry(now) };
    return asset;
  });
}

export function bodyImageSizes(assets: readonly BodyImageAsset[] | undefined, document?: NewsBodyDocument) {
  const sizes: Record<string, { width: number; height: number }> = {};
  for (const { imageId } of bodyImageReferences(document)) {
    const asset = assets?.find(({ id }) => id === imageId);
    if (asset?.state === "attached" && asset.expiresAt === null && asset.subjectPresence === "non_identifiable" &&
        Number.isInteger(asset.width) && asset.width > 0 && asset.width <= 4096 &&
        Number.isInteger(asset.height) && asset.height > 0 && asset.height <= 4096)
      sizes[imageId] = { width: asset.width, height: asset.height };
  }
  return sizes;
}

// 브라우저 변환 결과에 필요한 정적 이미지 청크만 허용합니다.
export function isBodyImageWebpContainer(buffer: Buffer, width: number, height: number) {
  if (buffer.length < 30 || buffer.readUInt32LE(4) !== buffer.length - 8) return false;
  let extended = false;
  let alpha = false;
  let image = false;
  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const chunk = buffer.toString("ascii", offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const start = offset + 8;
    const next = start + size + (size % 2);
    if (next > buffer.length || image) return false;
    if (chunk === "VP8X") {
      if (offset !== 12 || size !== 10 || (buffer[start] & ~0x10) !== 0) return false;
      extended = true;
    } else if (chunk === "ALPH") {
      if (!extended || alpha || size < 2 || buffer[20] !== 0x10) return false;
      alpha = true;
    } else if (chunk === "VP8 " || chunk === "VP8L") {
      if (chunk === "VP8 ") {
        if (size <= 10 || (buffer[start] & 1) !== 0 ||
            buffer[start + 3] !== 0x9d || buffer[start + 4] !== 1 || buffer[start + 5] !== 0x2a ||
            (buffer.readUInt16LE(start + 6) & 0x3fff) !== width ||
            (buffer.readUInt16LE(start + 8) & 0x3fff) !== height ||
            (extended && alpha !== (buffer[20] === 0x10))) return false;
      } else {
        if (alpha || size <= 5 || buffer[start] !== 0x2f) return false;
        const bits = buffer.readUInt32LE(start + 1);
        if (1 + (bits & 0x3fff) !== width || 1 + ((bits >>> 14) & 0x3fff) !== height || (bits >>> 29) !== 0)
          return false;
      }
      image = true;
    } else {
      return false;
    }
    offset = next;
  }
  return image && offset === buffer.length;
}
