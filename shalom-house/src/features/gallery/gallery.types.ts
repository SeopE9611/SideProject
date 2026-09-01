export const galleryPublicationStatuses = ["draft", "review", "published", "archived"] as const;
export const galleryApprovalStatuses = ["pending", "approved", "rejected"] as const;
export const gallerySubjectPresenceValues = ["none", "non_identifiable", "identifiable"] as const;
export const galleryConsentStatuses = ["not_required", "pending", "confirmed", "withdrawn"] as const;
export type GalleryPublicationStatus = (typeof galleryPublicationStatuses)[number];
export type GalleryApprovalStatus = (typeof galleryApprovalStatuses)[number];
export type GallerySubjectPresence = (typeof gallerySubjectPresenceValues)[number];
export type GalleryConsentStatus = (typeof galleryConsentStatuses)[number];
const publicationLabels: Record<GalleryPublicationStatus, string> = {
  draft: "작성 중",
  review: "검토 중",
  published: "게시",
  archived: "보관",
};
const approvalLabels: Record<GalleryApprovalStatus, string> = {
  pending: "승인 대기",
  approved: "승인 완료",
  rejected: "반려",
};
const subjectLabels: Record<GallerySubjectPresence, string> = {
  none: "인물 없음",
  non_identifiable: "개인 식별 불가",
  identifiable: "개인 식별 가능",
};
const consentLabels: Record<GalleryConsentStatus, string> = {
  not_required: "별도 동의 불필요",
  pending: "동의 확인 중",
  confirmed: "공개 동의 확인",
  withdrawn: "공개 동의 철회",
};
export const isGalleryPublicationStatus = (v: unknown): v is GalleryPublicationStatus =>
  typeof v === "string" && galleryPublicationStatuses.includes(v as GalleryPublicationStatus);
export const isGalleryApprovalStatus = (v: unknown): v is GalleryApprovalStatus =>
  typeof v === "string" && galleryApprovalStatuses.includes(v as GalleryApprovalStatus);
export const isGallerySubjectPresence = (v: unknown): v is GallerySubjectPresence =>
  typeof v === "string" && gallerySubjectPresenceValues.includes(v as GallerySubjectPresence);
export const isGalleryConsentStatus = (v: unknown): v is GalleryConsentStatus =>
  typeof v === "string" && galleryConsentStatuses.includes(v as GalleryConsentStatus);
export const getGalleryPublicationStatusLabel = (v: GalleryPublicationStatus) => publicationLabels[v];
export const getGalleryApprovalStatusLabel = (v: GalleryApprovalStatus) => approvalLabels[v];
export const getGallerySubjectPresenceLabel = (v: GallerySubjectPresence) => subjectLabels[v];
export const getGalleryConsentStatusLabel = (v: GalleryConsentStatus) => consentLabels[v];
export const isValidGallerySlug = (v: unknown): v is string =>
  typeof v === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v);

type ConsentFields = {
  subjectPresence: GallerySubjectPresence;
  consentStatus: GalleryConsentStatus;
  consentCheckedOn: string | null;
  consentReferenceCode: string | null;
  consentWithdrawnAt: Date | null;
};

export function isCanonicalGalleryDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function isGalleryConsentReadyForPublication(item: ConsentFields): boolean {
  if (item.consentWithdrawnAt !== null) {
    return false;
  }
  if (item.subjectPresence === "identifiable") {
    return (
      item.consentStatus === "confirmed" &&
      isCanonicalGalleryDate(item.consentCheckedOn) &&
      Boolean(item.consentReferenceCode?.trim())
    );
  }
  return (
    (item.subjectPresence === "none" || item.subjectPresence === "non_identifiable") &&
    item.consentStatus === "not_required" &&
    item.consentCheckedOn === null &&
    item.consentReferenceCode === null
  );
}

export function isGalleryConsentWithdrawable(item: ConsentFields & { archivedAt: Date | null }): boolean {
  return (
    item.subjectPresence === "identifiable" &&
    item.consentStatus === "confirmed" &&
    isCanonicalGalleryDate(item.consentCheckedOn) &&
    Boolean(item.consentReferenceCode?.trim()) &&
    item.consentWithdrawnAt === null &&
    item.archivedAt === null
  );
}
export function getSeoulCalendarDate(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function isGalleryPubliclyVisible(
  item: ConsentFields & {
    publicationStatus: GalleryPublicationStatus;
    approvalStatus: GalleryApprovalStatus;
    publishedAt: Date | null;
    archivedAt: Date | null;
    deletedAt?: Date | null;
    displayStartOn: string | null;
    displayEndOn: string | null;
  },
  now = new Date(),
): boolean {
  const today = getSeoulCalendarDate(now);
  return (
    item.publicationStatus === "published" &&
    item.approvalStatus === "approved" &&
    item.publishedAt !== null &&
    item.publishedAt <= now &&
    item.archivedAt === null &&
    item.deletedAt == null &&
    isGalleryConsentReadyForPublication(item) &&
    (item.displayStartOn === null || item.displayStartOn <= today) &&
    (item.displayEndOn === null || item.displayEndOn >= today)
  );
}
