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

export type AcademyLessonApplicationHistoryItem = {
  status: AcademyLessonApplicationStatus;
  date: string;
  description: string;
  actorId?: string;
  actorName?: string;
};

export type AcademyLessonApplication = {
  _id?: string;
  userId?: string | null;

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

export const ACADEMY_CURRENT_LEVEL_LABELS: Record<AcademyCurrentLevel, string> = {
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
