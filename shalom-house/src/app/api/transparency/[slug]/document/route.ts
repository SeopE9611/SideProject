import { findPublicTransparencyDocumentMediaBySlug } from "@/features/transparency/transparency.repository";
import { downloadPrivateTransparencyDocument } from "@/features/transparency/transparency.storage";
export const runtime = "nodejs";
type Context = { params: Promise<{ slug: string }> };
const missing = () => new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
export async function GET(_request: Request, { params }: Context) {
  const { slug } = await params;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80) return missing();
  let media;
  try { media = await findPublicTransparencyDocumentMediaBySlug(slug); }
  catch { return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } }); }
  if (!media) return missing();
  try {
    const blob = await downloadPrivateTransparencyDocument(media.bucket, media.objectPath);
    const headers: Record<string, string> = { "Content-Type": "application/pdf", "Content-Disposition": 'inline; filename="shalom-public-document.pdf"', "X-Content-Type-Options": "nosniff", "Cache-Control": "no-store", "Cross-Origin-Resource-Policy": "same-origin" };
    if (Number.isFinite(blob.size)) headers["Content-Length"] = String(blob.size);
    return new Response(blob, { status: 200, headers });
  } catch { return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } }); }
}
