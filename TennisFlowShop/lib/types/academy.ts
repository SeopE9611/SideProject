export type AcademyLessonApplicationStatus =
  | "submitted"
  | "reviewing"
  | "contacted"
  | "confirmed"
  | "cancelled";

export type AcademyLessonType =
  | "group"
  | "private"
  | "junior"
  | "adult"
  | "onePoint"
  | "consultation";

export type AcademyCurrentLevel =
  | "new"
  | "beginner"
  | "intermediate"
  | "advanced"
  | "unknown";

export type AcademyApplicantProfile = {
  name: string;
  phone: string;
  email: string;
};

export type AcademyActiveApplicationSummary = {
  id: string;
  classId: string | null;
  className: string | null;
  preferredDays: string[];
  status: Extract<
    AcademyLessonApplicationStatus,
    "submitted" | "reviewing" | "contacted" | "confirmed"
  >;
};

export type AcademyApplicationConflictResponse = {
  success: false;
  code: "ACADEMY_DAY_CONFLICT";
  message: string;
  conflict: {
    applicationId: string;
    className: string | null;
    existingDays: string[];
    overlapDays: string[];
  };
};

export type AcademyLessonApplicationHistoryItem = {
  status: AcademyLessonApplicationStatus;
  date: string;
  description: string;
  actorId?: string;
  actorName?: string;
};

export type AcademyLessonApplication = {
  _id?: string;
  userId: string;
  classId?: string | null;
  classSnapshot?: AcademyClassSnapshot | null;

  applicantName: string;
  phone: string;
  email?: string | null;

  desiredLessonType: AcademyLessonType;
  currentLevel: AcademyCurrentLevel;
  preferredDays: string[];
  preferredTimeText?: string | null;
  lessonGoal?: string | null;
  requestMemo?: string | null;

  status: AcademyLessonApplicationStatus;

  adminMemo?: string | null;
  customerMessage?: string | null;

  history?: AcademyLessonApplicationHistoryItem[];

  cancelledAt?: string | Date;
  cancelledBy?: "customer" | "admin";
  cancelReason?: string | null;
  cancelReasonLabel?: string | null;
  cancelReasonDetail?: string | null;

  createdAt?: string;
  updatedAt?: string;
};

export const ACADEMY_APPLICATION_STATUSES = [
  "submitted",
  "reviewing",
  "contacted",
  "confirmed",
  "cancelled",
] as const satisfies readonly AcademyLessonApplicationStatus[];

export const ACADEMY_APPLICATION_STATUS_LABELS: Record<
  AcademyLessonApplicationStatus,
  string
> = {
  submitted: "접수완료",
  reviewing: "검토 중",
  contacted: "상담 완료",
  confirmed: "등록 확정",
  cancelled: "취소",
};

export const ACADEMY_LESSON_TYPE_LABELS: Record<AcademyLessonType, string> = {
  group: "그룹 레슨",
  private: "개인 레슨",
  junior: "주니어 레슨",
  adult: "성인 레슨",
  onePoint: "원포인트 레슨",
  consultation: "상담 후 결정",
};

export const ACADEMY_CURRENT_LEVEL_LABELS: Record<AcademyCurrentLevel, string> =
  {
    new: "처음 배워요",
    beginner: "초급",
    intermediate: "중급",
    advanced: "상급",
    unknown: "잘 모르겠어요",
  };

export function isAcademyApplicationStatus(
  value: unknown,
): value is AcademyLessonApplicationStatus {
  return (
    typeof value === "string" &&
    ACADEMY_APPLICATION_STATUSES.includes(
      value as AcademyLessonApplicationStatus,
    )
  );
}

export function getAcademyApplicationStatusLabel(
  status: AcademyLessonApplicationStatus | string | null | undefined,
) {
  if (!isAcademyApplicationStatus(status)) return "알 수 없음";
  return ACADEMY_APPLICATION_STATUS_LABELS[status];
}

export function getAcademyLessonTypeLabel(
  type: AcademyLessonType | string | null | undefined,
) {
  if (typeof type !== "string" || !(type in ACADEMY_LESSON_TYPE_LABELS)) {
    return "미선택";
  }
  return ACADEMY_LESSON_TYPE_LABELS[type as AcademyLessonType];
}

export function getAcademyCurrentLevelLabel(
  level: AcademyCurrentLevel | string | null | undefined,
) {
  if (typeof level !== "string" || !(level in ACADEMY_CURRENT_LEVEL_LABELS)) {
    return "미선택";
  }
  return ACADEMY_CURRENT_LEVEL_LABELS[level as AcademyCurrentLevel];
}

export type AcademyClassStatus = "draft" | "visible" | "hidden" | "closed";

export type AcademyClassLevel =
  | "beginner"
  | "intermediate"
  | "advanced"
  | "all";

export type AcademyClassLessonType =
  | "group"
  | "private"
  | "junior"
  | "adult"
  | "onePoint";

export type PublicAcademyClass = {
  _id: string;
  name: string;
  description: string | null;
  level: AcademyClassLevel;
  levelLabel: string;
  lessonType: AcademyClassLessonType;
  lessonTypeLabel: string;
  instructorName: string | null;
  location: string | null;
  scheduleText: string | null;
  capacity: number | null;
  enrolledCount: number;
  price: number | null;
  status: Extract<AcademyClassStatus, "visible" | "closed">;
  statusLabel: string;
  createdAt: string | null;
  updatedAt: string | null;
};

export type AcademyClassSnapshot = {
  classId: string;
  name: string;
  description?: string | null;
  level?: AcademyClassLevel | null;
  levelLabel?: string | null;
  lessonType?: AcademyClassLessonType | null;
  lessonTypeLabel?: string | null;
  instructorName?: string | null;
  location?: string | null;
  scheduleText?: string | null;
  capacity?: number | null;
  price?: number | null;
  status?: AcademyClassStatus | null;
  statusLabel?: string | null;
};

export type AcademyCustomerApplicationDetail = {
  _id: string;
  kind: "academy_lesson";
  type: "아카데미 클래스 신청";
  status: AcademyLessonApplicationStatus;
  statusLabel: string;
  applicantName: string;
  phone: string;
  email: string | null;
  desiredLessonType: string | null;
  desiredLessonTypeLabel: string;
  currentLevel: string | null;
  currentLevelLabel: string;
  preferredDays: string[];
  preferredTimeText: string | null;
  lessonGoal: string | null;
  requestMemo: string | null;
  customerMessage: string | null;
  classId: string | null;
  classSnapshot: AcademyClassSnapshot | null;
  cancelledAt?: string | null;
  cancelledBy?: "customer" | "admin" | null;
  cancelReason?: string | null;
  cancelReasonLabel?: string | null;
  cancelReasonDetail?: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type AcademyCustomerApplicationDetailResponse = {
  success: true;
  item: AcademyCustomerApplicationDetail;
};

export type AcademyClassApplicationStats = {
  total: number;
  submitted: number;
  reviewing: number;
  contacted: number;
  confirmed: number;
  cancelled: number;
};

export type AcademyClass = {
  _id?: string;
  name: string;
  description?: string | null;
  level: AcademyClassLevel;
  levelLabel?: string;
  lessonType: AcademyClassLessonType;
  lessonTypeLabel?: string;
  instructorName?: string | null;
  location?: string | null;
  scheduleText?: string | null;
  capacity?: number | null;
  enrolledCount?: number;
  applicationCount?: number;
  confirmedCount?: number;
  submittedCount?: number;
  reviewingCount?: number;
  contactedCount?: number;
  cancelledCount?: number;
  applicationStats?: AcademyClassApplicationStats;
  price?: number | null;
  status: AcademyClassStatus;
  statusLabel?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type AcademyClassApplicationSummary = {
  _id: string;
  applicantName: string;
  phone: string;
  email: string | null;
  desiredLessonType: string;
  desiredLessonTypeLabel: string;
  currentLevel: string;
  currentLevelLabel: string;
  preferredDays: string[];
  preferredTimeText: string | null;
  status: AcademyLessonApplicationStatus;
  statusLabel: string;
  hasCustomerMessage: boolean;
  customerMessagePreview: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type AcademyClassDetailResponse = {
  success: true;
  item: AcademyClass;
  applicationStats: AcademyClassApplicationStats;
  applications: AcademyClassApplicationSummary[];
};

export const ACADEMY_CLASS_STATUSES = [
  "draft",
  "visible",
  "hidden",
  "closed",
] as const satisfies readonly AcademyClassStatus[];

export const ACADEMY_CLASS_LEVELS = [
  "beginner",
  "intermediate",
  "advanced",
  "all",
] as const satisfies readonly AcademyClassLevel[];

export const ACADEMY_CLASS_LESSON_TYPES = [
  "group",
  "private",
  "junior",
  "adult",
  "onePoint",
] as const satisfies readonly AcademyClassLessonType[];

export const ACADEMY_CLASS_STATUS_LABELS: Record<AcademyClassStatus, string> = {
  draft: "임시 저장",
  visible: "모집 중",
  hidden: "숨김",
  closed: "모집 마감",
};

export const ACADEMY_CLASS_LEVEL_LABELS: Record<AcademyClassLevel, string> = {
  beginner: "입문/초급",
  intermediate: "중급",
  advanced: "상급",
  all: "전체 레벨",
};

export const ACADEMY_CLASS_LESSON_TYPE_LABELS: Record<
  AcademyClassLessonType,
  string
> = {
  group: "그룹 레슨",
  private: "개인 레슨",
  junior: "주니어 레슨",
  adult: "성인 레슨",
  onePoint: "원포인트 레슨",
};

export function isAcademyClassStatus(
  value: unknown,
): value is AcademyClassStatus {
  return (
    typeof value === "string" &&
    ACADEMY_CLASS_STATUSES.includes(value as AcademyClassStatus)
  );
}

export function isAcademyClassLevel(
  value: unknown,
): value is AcademyClassLevel {
  return (
    typeof value === "string" &&
    ACADEMY_CLASS_LEVELS.includes(value as AcademyClassLevel)
  );
}

export function isAcademyClassLessonType(
  value: unknown,
): value is AcademyClassLessonType {
  return (
    typeof value === "string" &&
    ACADEMY_CLASS_LESSON_TYPES.includes(value as AcademyClassLessonType)
  );
}

export function getAcademyClassStatusLabel(
  status: AcademyClassStatus | string | null | undefined,
) {
  if (!isAcademyClassStatus(status)) return "알 수 없음";
  return ACADEMY_CLASS_STATUS_LABELS[status];
}

export function getAcademyClassLevelLabel(
  level: AcademyClassLevel | string | null | undefined,
) {
  if (!isAcademyClassLevel(level)) return "미선택";
  return ACADEMY_CLASS_LEVEL_LABELS[level];
}

export function getAcademyClassLessonTypeLabel(
  type: AcademyClassLessonType | string | null | undefined,
) {
  if (!isAcademyClassLessonType(type)) return "미선택";
  return ACADEMY_CLASS_LESSON_TYPE_LABELS[type];
}
