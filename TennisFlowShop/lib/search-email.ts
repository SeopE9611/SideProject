export function normalizeEmailForSearch(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  return normalized;
}

export function isLikelyEmailQuery(value: string): boolean {
  const q = String(value ?? "").trim().toLowerCase();
  if (!q) return false;
  if (q.includes(" ") || q.includes("\t") || q.includes("\n")) return false;

  // prefix 검색("abc@")도 email 모드로 분기하기 위해 dot은 강제하지 않는다.
  if (q.includes("@")) return /^[^\s@]+@[^\s@]*$/.test(q);

  // '@'이 없는 경우는 일반 검색으로 유지(과도한 오탐 방지).
  return false;
}
