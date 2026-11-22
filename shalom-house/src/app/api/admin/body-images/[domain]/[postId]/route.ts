import { authorizeCurrentAdmin } from "@/features/admin-auth/admin-authorization";
import { getCurrentAdmin, isSameOriginRequest } from "@/features/admin-auth/admin-auth.service";
import { isBodyImageDomain, isBodyImageId } from "@/features/news/body-image-reference";
import { imageResponse, serveBodyImage, uploadBodyImage } from "@/features/news/body-image-storage";

export const runtime = "nodejs";
type Context = { params: Promise<{ domain: string; postId: string }> };

export async function POST(request: Request, { params }: Context) {
  if (!isSameOriginRequest(request)) return imageResponse(403);
  try {
    const { domain, postId } = await params;
    if (!isBodyImageDomain(domain) || !isBodyImageId(postId)) return imageResponse(404);
    const authorization = await authorizeCurrentAdmin("content.update");
    if (!authorization.ok) return imageResponse(authorization.reason === "unauthorized" ? 401 : 403);
    if (domain === "news" && authorization.admin.role !== "admin") return imageResponse(403);
    return await uploadBodyImage(request, domain, postId);
  } catch {
    console.error("본문 이미지 업로드 처리 실패");
    return imageResponse(503);
  }
}

export async function GET(request: Request, { params }: Context) {
  try {
    const { domain, postId } = await params;
    if (!isBodyImageDomain(domain) || !isBodyImageId(postId)) return imageResponse(404);
    if (!await getCurrentAdmin()) return imageResponse(401);
    const imageId = new URL(request.url).searchParams.get("image");
    return isBodyImageId(imageId) ? await serveBodyImage(domain, postId, imageId, true) : imageResponse(404);
  } catch {
    return imageResponse(503);
  }
}
