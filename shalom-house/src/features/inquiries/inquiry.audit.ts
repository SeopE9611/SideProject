import type { ObjectId } from "mongodb";
import type { AdminRole } from "@/features/admin-auth/admin-auth.types";
import type { InquiryStatus } from "./inquiry.types";
export type InquiryAuditChangedField = "status" | "internalNote";
export type InquiryAuditDocument = { _id: ObjectId; inquiryId: ObjectId; action: "updated"; actor: { adminId: ObjectId; displayName: string; role: AdminRole }; occurredAt: Date; fromVersionAt: Date; toVersionAt: Date; fromStatus: InquiryStatus; toStatus: InquiryStatus; changedFields: InquiryAuditChangedField[]; deleteAfter: Date | null };
export const inquiryAuditActionLabels = { updated: "문의 처리 정보 수정" } as const;
export const inquiryAuditFieldLabels = { status: "처리 상태", internalNote: "내부 메모" } as const;
