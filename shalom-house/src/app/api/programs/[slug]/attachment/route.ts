import { findPublishedProgramAttachmentBySlug } from "@/features/programs/program.mongo-repository";
import { redirectPrivateProgramAttachment } from "@/features/programs/program.storage";
export const runtime = "nodejs";
const missing = () => new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const attachment = await findPublishedProgramAttachmentBySlug((await params).slug);
    if (!attachment) return missing();
    return await redirectPrivateProgramAttachment(attachment.programId, attachment.bucket, attachment.objectPath, attachment.originalFileName);
  } catch { return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } }); }
}
