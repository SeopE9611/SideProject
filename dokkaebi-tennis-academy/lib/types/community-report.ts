import type { ObjectId } from 'mongodb';

export type CommunityReportTargetType = 'post' | 'comment';
export type CommunityReportStatus = 'pending' | 'resolved' | 'rejected';
export type CommunityReportModerationTargetOutcome = 'updated' | 'no_target_change';

/**
 * 관리자 신고 목록 검색에서 사용하는 필드.
 *
 * - 생성 라우트에서 동일 필드를 항상 저장하도록 맞춰
 *   검색 조건($or)과 저장 스키마가 1:1로 대응되도록 유지한다.
 */
export const COMMUNITY_REPORT_SEARCHABLE_FIELDS = ['reason', 'reporterNickname', 'reporterEmail'] as const;

export type CommunityReportSearchableField = (typeof COMMUNITY_REPORT_SEARCHABLE_FIELDS)[number];

/** community_reports 컬렉션 저장 문서 타입 */
export interface CommunityReportDocument {
  _id?: ObjectId;
  targetType: CommunityReportTargetType;
  boardType: string;
  postId: ObjectId;
  commentId?: ObjectId;
  reason: string;
  status: CommunityReportStatus;
  reporterUserId: string;
  reporterEmail: string | null;
  reporterNickname: string;
  createdAt: Date;
  resolvedAt: Date | null;
  updatedAt?: Date;
  resolvedByAdminId?: string;
  resolutionAction?: 'resolve' | 'reject' | 'resolve_hide_target';
  moderationAudit?: {
    actor: {
      adminId: string;
      email: string | null;
      name: string | null;
      role: string;
    };
    reportId: string;
    action: 'resolve' | 'reject' | 'resolve_hide_target';
    nextStatus: CommunityReportStatus;
    target: {
      type: CommunityReportTargetType;
      postId: string;
      commentId?: string;
      beforeStatus?: string;
      afterStatus?: string;
      outcome: CommunityReportModerationTargetOutcome;
      commentsCountAdjusted?: boolean;
    };
    transaction: {
      attempted: boolean;
      used: boolean;
    };
    request: {
      at: Date;
      userAgent: string | null;
      ip: string | null;
    };
  };
}
