import { findPublishedProgramAttachmentBySlug } from "@/features/programs/program.mongo-repository";
import { createProgramAttachmentContentDisposition } from "@/features/programs/program.media-validation";
import { downloadPrivateProgramAttachment } from "@/features/programs/program.storage";
export const runtime = "nodejs";
const missing = () => new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const attachment = await findPublishedProgramAttachmentBySlug((await params).slug);
    if (!attachment) return missing();
    const blob = await downloadPrivateProgramAttachment(attachment.programId, attachment.bucket, attachment.objectPath);
    return new Response(await blob.arrayBuffer(), { headers: { "Content-Type": "application/pdf",
      "Content-Disposition": createProgramAttachmentContentDisposition(attachment.originalFileName), "X-Content-Type-Options": "nosniff", "Cache-Control": "no-store" } });
  } catch { return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } }); }
}
