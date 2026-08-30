import { getCurrentAdmin } from "@/features/admin-auth/admin-auth.service";
import { findAdminTransparencyDocumentById } from "@/features/transparency/transparency.admin-repository";
import { downloadPrivateTransparencyDocument } from "@/features/transparency/transparency.storage";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, { params }: Context) {
  if (!(await getCurrentAdmin())) return new Response(null, { status: 401, headers: { "Cache-Control": "no-store" } });
  const document = await findAdminTransparencyDocumentById((await params).id);
  if (!document) return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  try {
    const blob = await downloadPrivateTransparencyDocument(document.file.bucket, document.file.objectPath);
    return new Response(blob, { status: 200, headers: { "Content-Type": "application/pdf", "Content-Disposition": "inline; filename=\"shalom-document.pdf\"", "X-Content-Type-Options": "nosniff", "Cache-Control": "no-store" } });
  } catch { return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } }); }
}
