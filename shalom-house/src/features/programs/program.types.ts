export const programPublicationStatuses = ["draft", "review", "published", "archived"] as const;
export type ProgramPublicationStatus = (typeof programPublicationStatuses)[number];
export const programApprovalStatuses = ["pending", "approved", "rejected"] as const;
export type ProgramApprovalStatus = (typeof programApprovalStatuses)[number];

export type PublicProgram = {
  id: string; slug: string; category: string; title: string; summary: string;
  purpose: string; body: readonly string[]; operationStatusLabel: string | null;
  sortOrder: number; publishedAt: string; updatedAt: string;
};
export type PublicProgramSummary = Omit<PublicProgram, "body">;

const publicationStatusLabels: Record<ProgramPublicationStatus, string> = { draft: "작성 중", review: "검토 중", published: "게시", archived: "보관" };
const approvalStatusLabels: Record<ProgramApprovalStatus, string> = { pending: "승인 대기", approved: "승인 완료", rejected: "반려" };
export function isProgramPublicationStatus(value: unknown): value is ProgramPublicationStatus { return typeof value === "string" && programPublicationStatuses.includes(value as ProgramPublicationStatus); }
export function isProgramApprovalStatus(value: unknown): value is ProgramApprovalStatus { return typeof value === "string" && programApprovalStatuses.includes(value as ProgramApprovalStatus); }
export function getProgramPublicationStatusLabel(status: ProgramPublicationStatus): string { return publicationStatusLabels[status]; }
export function getProgramApprovalStatusLabel(status: ProgramApprovalStatus): string { return approvalStatusLabels[status]; }
export function isValidProgramSlug(value: unknown): value is string { return typeof value === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value); }
export function isProgramCategory(value: unknown): value is string { return typeof value === "string" && value.trim().length > 0; }
export function getProgramCategoryLabel(category: string): string { return category; }
