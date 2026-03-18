export function normalizeStringingApplicationId(value) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized ? normalized : null;
}

export function hasCompletedStringingApplication(input) {
  return (
    input?.isStringServiceApplied === true ||
    Boolean(normalizeStringingApplicationId(input?.stringingApplicationId))
  );
}
