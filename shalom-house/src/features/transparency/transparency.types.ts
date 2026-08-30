export const transparencyCategories = [
  "operations",
  "budget_settlement",
  "donations",
  "other",
] as const;
export type TransparencyCategory = (typeof transparencyCategories)[number];
export type TransparencyPublicationStatus = "draft" | "review" | "published" | "archived";
export type TransparencyApprovalStatus = "pending" | "approved" | "rejected";
export type TransparencyPrivacyReviewStatus = "pending" | "confirmed";
export type TransparencyFinalDocumentStatus = "draft" | "final";
export const transparencyCategoryLabels: Record<TransparencyCategory, string> = {
  operations: "운영 보고",
  budget_settlement: "예산·결산",
  donations: "후원금",
  other: "기타 공시",
};
export const isTransparencyCategory = (value: unknown): value is TransparencyCategory =>
  transparencyCategories.includes(value as TransparencyCategory);
export const isTransparencyPublicationStatus = (value: unknown): value is TransparencyPublicationStatus =>
  ["draft", "review", "published", "archived"].includes(String(value));
export const isTransparencyPrivacyReviewStatus = (value: unknown): value is TransparencyPrivacyReviewStatus =>
  value === "pending" || value === "confirmed";
export const isTransparencyFinalDocumentStatus = (value: unknown): value is TransparencyFinalDocumentStatus =>
  value === "draft" || value === "final";
