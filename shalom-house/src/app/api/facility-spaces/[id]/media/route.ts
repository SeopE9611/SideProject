import { findPublicFacilitySpaceMediaById } from "@/features/facility-spaces/facility-space.repository";
import { downloadPrivateFacilitySpaceImage } from "@/features/facility-spaces/facility-space.storage";

export const runtime = "nodejs";
const missing = () => new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let media;
  try {
    media = await findPublicFacilitySpaceMediaById(id);
  } catch {
    return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  if (!media) return missing();
  try {
    const blob = await downloadPrivateFacilitySpaceImage(id, media.bucket, media.objectPath);
    return new Response(await blob.arrayBuffer(), {
      headers: { "Content-Type": "image/webp", "X-Content-Type-Options": "nosniff", "Cache-Control": "no-store" },
    });
  } catch {
    return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
