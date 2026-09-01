import { findPublishedProgramAttachmentBySlug } from "@/features/programs/program.mongo-repository";
import { downloadPrivateProgramAttachment } from "@/features/programs/program.storage";
export const runtime = "nodejs";
const missing = () => new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
const disposition = (name: string) => `attachment; filename="program-attachment.pdf"; filename*=UTF-8''${encodeURIComponent(name)}`;
export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const attachment = await findPublishedProgramAttachmentBySlug((await params).slug);
    if (!attachment) return missing();
    const blob = await downloadPrivateProgramAttachment(attachment.programId, attachment.bucket, attachment.objectPath);
    return new Response(await blob.arrayBuffer(), { headers: { "Content-Type": "application/pdf",
      "Content-Disposition": disposition(attachment.originalFileName), "X-Content-Type-Options": "nosniff", "Cache-Control": "no-store" } });
  } catch { return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } }); }
}
