import type { ObjectId } from "mongodb";

export const inquiryKinds = ["general", "visit", "volunteer", "donation", "donation_receipt"] as const;
export type InquiryKind = (typeof inquiryKinds)[number];
export const inquiryKindLabels = { general: "일반 문의", visit: "방문 문의", volunteer: "자원봉사 문의", donation: "후원 문의", donation_receipt: "후원금 영수증·내역 문의" } satisfies Record<InquiryKind, string>;
export const inquiryStatuses = ["received", "in_review", "contacted", "completed", "archived"] as const;
export type InquiryStatus = (typeof inquiryStatuses)[number];
export const inquiryStatusLabels = { received: "접수됨", in_review: "확인 중", contacted: "연락 완료", completed: "처리 완료", archived: "보관" } satisfies Record<InquiryStatus, string>;
export const inquiryRetentionDays = 365;
export const inquiryPrivacyConsentVersion = "inquiry-2026-09-01-v1" as const;
export type InquiryDocument = { _id: ObjectId; reference: string; kind: InquiryKind; status: InquiryStatus; name: string; phone: string; email: string; message: string; privacyConsentVersion: typeof inquiryPrivacyConsentVersion; privacyConsentedAt: Date; internalNote: string; createdAt: Date; updatedAt: Date; completedAt: Date | null; archivedAt: Date | null; deleteAfter: Date | null };
