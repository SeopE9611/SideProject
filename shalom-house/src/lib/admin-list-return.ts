import { normalizeAdminTitleSearch } from "@/lib/admin-title-search";
import { isNewsApprovalStatus, isNewsCategory, isNewsPublicationStatus } from "@/features/news/news.types";
import { isProgramApprovalStatus, isProgramPublicationStatus } from "@/features/programs/program.types";
import { isGalleryConsentStatus, isGalleryPublicationStatus, isGallerySubjectPresence } from "@/features/gallery/gallery.types";
import {
  isTransparencyCategory,
  isTransparencyFinalDocumentStatus,
  isTransparencyPrivacyReviewStatus,
  isTransparencyPublicationStatus,
} from "@/features/transparency/transparency.types";

type AdminListPath = "/admin/news" | "/admin/programs" | "/admin/gallery" | "/admin/transparency";
const filtersByPath: Record<AdminListPath, Record<string, (value: unknown) => boolean>> = {
  "/admin/news": { category: isNewsCategory, publication: isNewsPublicationStatus, approval: isNewsApprovalStatus },
  "/admin/programs": { publicationStatus: isProgramPublicationStatus, approvalStatus: isProgramApprovalStatus },
  "/admin/gallery": {
    subjectPresence: isGallerySubjectPresence,
    consentStatus: isGalleryConsentStatus,
    publicationStatus: isGalleryPublicationStatus,
  },
  "/admin/transparency": {
    category: isTransparencyCategory,
    privacyReviewStatus: isTransparencyPrivacyReviewStatus,
    finalDocumentStatus: isTransparencyFinalDocumentStatus,
    publicationStatus: isTransparencyPublicationStatus,
  },
};

export function getAdminListReturnHref(
  path: AdminListPath,
  value: unknown,
  normalizePage: (value: unknown) => number,
): string {
  if (typeof value !== "string" || value.length > 2048 || /[#\u0000-\u001f\u007f]/.test(value)) return path;
  const queryStart = value.indexOf("?");
  if ((queryStart < 0 ? value : value.slice(0, queryStart)) !== path) return path;
  const source = new URLSearchParams(queryStart < 0 ? "" : value.slice(queryStart + 1));
  const single = (key: string) => source.getAll(key).length === 1 ? source.get(key) ?? undefined : undefined;
  const query = new URLSearchParams();
  if (path === "/admin/news" || path === "/admin/programs") {
    const q = normalizeAdminTitleSearch(single("q"));
    if (q) query.set("q", q);
  }
  for (const [key, valid] of Object.entries(filtersByPath[path])) {
    const filter = single(key);
    if (filter !== undefined && valid(filter)) query.set(key, filter);
  }
  const page = normalizePage(single("page"));
  if (page > 1) query.set("page", String(page));
  return query.size ? `${path}?${query}` : path;
}
