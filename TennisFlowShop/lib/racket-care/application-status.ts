export const COMPLETED_STRINGING_APPLICATION_STATUSES = ["completed", "교체완료", "done", "work_done"] as const;

export function isCompletedStringingApplicationStatus(status: unknown) {
  const value = String(status ?? "").trim().toLowerCase();
  return COMPLETED_STRINGING_APPLICATION_STATUSES.some((item) => item.toLowerCase() === value);
}
