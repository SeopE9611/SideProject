export const newsCategories = ["notice", "activity"] as const;

export type NewsCategory = (typeof newsCategories)[number];

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

const categoryLabels: Record<NewsCategory, string> = {
  notice: "공지사항",
  activity: "활동 소식",
};

export function getNewsCategoryLabel(category: NewsCategory): string {
  return categoryLabels[category];
}

export function isNewsCategory(value: unknown): value is NewsCategory {
  return (
    typeof value === "string" && newsCategories.includes(value as NewsCategory)
  );
}

export function isValidNewsSlug(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
  );
}
