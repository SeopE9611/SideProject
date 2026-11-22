import { findPublishedNewsAttachmentBySlug } from "@/features/news/news.mongo-repository";
import { redirectPrivateNewsAttachment } from "@/features/news/news.storage";
export const runtime = "nodejs";
const missing = () => new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const attachment = await findPublishedNewsAttachmentBySlug((await params).slug);
    if (!attachment) return missing();
    return await redirectPrivateNewsAttachment(attachment.newsPostId, attachment.bucket, attachment.objectPath, attachment.originalFileName);
  } catch { return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } }); }
}
