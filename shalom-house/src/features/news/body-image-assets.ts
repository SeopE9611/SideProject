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

function isWebpIccProfile(buffer: Buffer, start: number, size: number) {
  if (size < 132 || buffer.readUInt32BE(start) !== size ||
      buffer.toString("latin1", start + 36, start + 40) !== "acsp") return false;
  const tagCount = buffer.readUInt32BE(start + 128);
  const tableEnd = 132 + tagCount * 12;
  if (tagCount === 0 || tableEnd > size) return false;
  for (let tag = start + 132; tag < start + tableEnd; tag += 12) {
    const offset = buffer.readUInt32BE(tag + 4);
    const length = buffer.readUInt32BE(tag + 8);
    if (offset < tableEnd || offset % 4 !== 0 || length < 8 || offset + length > size) return false;
  }
  return true;
}

// 브라우저 변환 결과에 필요한 정적 이미지 청크만 허용합니다.
export function isBodyImageWebpContainer(buffer: Buffer, width: number, height: number) {
  if (buffer.length < 30 || buffer.readUInt32LE(4) !== buffer.length - 8) return false;
  const iccFlag = 0x20;
  const alphaFlag = 0x10;
  let extended = false;
  let flags = 0;
  let profile = false;
  let alpha = false;
  let image = false;
  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const chunk = buffer.toString("latin1", offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const start = offset + 8;
    const next = start + size + (size % 2);
    if (next > buffer.length || image) return false;
    if (chunk === "VP8X") {
      if (offset !== 12 || size !== 10 || (buffer[start] & ~(iccFlag | alphaFlag)) !== 0) return false;
      flags = buffer[start];
      extended = true;
    } else if (chunk === "ICCP") {
      if (!(flags & iccFlag) || profile || alpha || !isWebpIccProfile(buffer, start, size) ||
          (size % 2 !== 0 && buffer[next - 1] !== 0)) return false;
      profile = true;
    } else if (chunk === "ALPH") {
      if (!(flags & alphaFlag) || alpha || size < 2 || profile !== Boolean(flags & iccFlag)) return false;
      alpha = true;
    } else if (chunk === "VP8 " || chunk === "VP8L") {
      if (profile !== Boolean(flags & iccFlag)) return false;
      if (chunk === "VP8 ") {
        if (size <= 10 || (buffer[start] & 1) !== 0 ||
            buffer[start + 3] !== 0x9d || buffer[start + 4] !== 1 || buffer[start + 5] !== 0x2a ||
            (buffer.readUInt16LE(start + 6) & 0x3fff) !== width ||
            (buffer.readUInt16LE(start + 8) & 0x3fff) !== height ||
            (extended && alpha !== Boolean(flags & alphaFlag))) return false;
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
