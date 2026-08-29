export const newsCategories = ["notice", "activity"] as const;

export type NewsCategory = (typeof newsCategories)[number];

export const PUBLIC_NEWS_RESERVED_SLUGS = [
  "notices",
  "activities",
] as const;

export type PublicNewsReservedSlug =
  (typeof PUBLIC_NEWS_RESERVED_SLUGS)[number];

export const newsPublicationStatuses = [
  "draft",
  "review",
  "published",
  "archived",
] as const;

export type NewsPublicationStatus =
  (typeof newsPublicationStatuses)[number];

export const newsApprovalStatuses = [
  "pending",
  "approved",
  "rejected",
] as const;

export type NewsApprovalStatus = (typeof newsApprovalStatuses)[number];

export type PublicNewsPost = {
  id: string;
  slug: string;
  category: NewsCategory;
  title: string;
  summary: string;
  body: readonly string[];
  publishedAt: string;
  updatedAt: string;
  isDemo: boolean;
};

export type PublicNewsPostSummary = Omit<PublicNewsPost, "body">;

export type PublicNewsSearchOptions = {
  q?: string;
  category?: NewsCategory;
  page?: number;
  pageSize?: number;
};

export type PublicNewsSearchResult = {
  items: readonly PublicNewsPostSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const categoryLabels: Record<NewsCategory, string> = {
  notice: "공지사항",
  activity: "활동 소식",
};

const publicationStatusLabels: Record<NewsPublicationStatus, string> = {
  draft: "작성 중",
  review: "검토 중",
  published: "게시",
  archived: "보관",
};

const approvalStatusLabels: Record<NewsApprovalStatus, string> = {
  pending: "승인 대기",
  approved: "승인 완료",
  rejected: "반려",
};

export function getNewsCategoryLabel(category: NewsCategory): string {
  return categoryLabels[category];
}

export function isNewsCategory(value: unknown): value is NewsCategory {
  return (
    typeof value === "string" && newsCategories.includes(value as NewsCategory)
  );
}

export function isNewsPublicationStatus(
  value: unknown,
): value is NewsPublicationStatus {
  return (
    typeof value === "string" &&
    newsPublicationStatuses.includes(value as NewsPublicationStatus)
  );
}

export function isNewsApprovalStatus(
  value: unknown,
): value is NewsApprovalStatus {
  return (
    typeof value === "string" &&
    newsApprovalStatuses.includes(value as NewsApprovalStatus)
  );
}

export function getNewsPublicationStatusLabel(
  status: NewsPublicationStatus,
): string {
  return publicationStatusLabels[status];
}

export function getNewsApprovalStatusLabel(
  status: NewsApprovalStatus,
): string {
  return approvalStatusLabels[status];
}

export function isValidNewsSlug(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
  );
}

export function isPublicNewsReservedSlug(
  value: string,
): value is PublicNewsReservedSlug {
  return PUBLIC_NEWS_RESERVED_SLUGS.includes(value as PublicNewsReservedSlug);
}
