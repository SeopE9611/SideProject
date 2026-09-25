export type ConvertedWebpImage = {
  blob: Blob;
  width: number;
  height: number;
  originalName: string;
  originalSize: number;
};

const acceptedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maximumLongSide = 1920;
const maximumResultBytes = 3 * 1024 * 1024;

export async function convertImageToWebp(file: File): Promise<ConvertedWebpImage> {
  if (!acceptedImageTypes.has(file.type)) throw new Error("unsupported_media_type");

  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, maximumLongSide / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("canvas_context_unavailable");
    context.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (value) => (value ? resolve(value) : reject(new Error("webp_conversion_failed"))),
        "image/webp",
        0.82,
      ),
    );
    if (blob.size > maximumResultBytes) throw new Error("result_too_large");
    return { blob, width, height, originalName: file.name, originalSize: file.size };
  } finally {
    bitmap.close();
  }
}
