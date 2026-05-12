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
