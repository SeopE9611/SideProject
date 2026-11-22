import { isBodyImageDomain } from "@/features/news/body-image-reference";
import { imageResponse, serveBodyImage } from "@/features/news/body-image-storage";
import { isValidNewsSlug } from "@/features/news/news.types";
import { isValidProgramSlug } from "@/features/programs/program.types";

export const runtime = "nodejs";
type Context = { params: Promise<{ domain: string; slug: string; imageId: string }> };

export async function GET(_: Request, { params }: Context) {
  const { domain, slug, imageId } = await params;
  if (!isBodyImageDomain(domain) || !(domain === "news" ? isValidNewsSlug(slug) : isValidProgramSlug(slug)))
    return imageResponse(404);
  try {
    return await serveBodyImage(domain, slug, imageId, false);
  } catch {
    return imageResponse(503);
  }
}
