import "server-only";
import { createHash } from "node:crypto";

export const SERVER_WEBP_MAX_BYTES = 3 * 1024 * 1024;
export const SERVER_WEBP_MAX_DIMENSION = 4096;

export type ServerWebpValidationError = "file" | "signature" | "dimensions";

function webpDimensions(buffer: Buffer): { width: number; height: number } | null {
  if (buffer.length < 30) return null;
  const kind = buffer.toString("ascii", 12, 16);
  if (kind === "VP8X")
    return { width: 1 + buffer.readUIntLE(24, 3), height: 1 + buffer.readUIntLE(27, 3) };
  if (kind === "VP8 " && buffer[23] === 0x9d && buffer[24] === 0x01 && buffer[25] === 0x2a)
    return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff };
  if (kind === "VP8L" && buffer[20] === 0x2f) {
    const bits = buffer.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  return null;
}

export async function validateServerWebp(file: File) {
  if (file.type !== "image/webp" || file.size < 1 || file.size > SERVER_WEBP_MAX_BYTES)
    return { ok: false as const, reason: "file" as const };
  const buffer = Buffer.from(await file.arrayBuffer());
  if (
    buffer.length !== file.size ||
    buffer.length > SERVER_WEBP_MAX_BYTES ||
    buffer.toString("ascii", 0, 4) !== "RIFF" ||
    buffer.toString("ascii", 8, 12) !== "WEBP"
  )
    return { ok: false as const, reason: "signature" as const };
  const dimensions = webpDimensions(buffer);
  if (
    !dimensions ||
    !Number.isInteger(dimensions.width) ||
    !Number.isInteger(dimensions.height) ||
    dimensions.width < 1 ||
    dimensions.height < 1 ||
    dimensions.width > SERVER_WEBP_MAX_DIMENSION ||
    dimensions.height > SERVER_WEBP_MAX_DIMENSION
  )
    return { ok: false as const, reason: "dimensions" as const };
  return {
    ok: true as const,
    value: {
      buffer,
      width: dimensions.width,
      height: dimensions.height,
      byteSize: buffer.length,
      sha256: createHash("sha256").update(buffer).digest("hex"),
    },
  };
}
