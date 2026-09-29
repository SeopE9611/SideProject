export const COMMUNITY_BOARDS_ENABLED = process.env.NEXT_PUBLIC_COMMUNITY_BOARDS_ENABLED === "true";

export const CLOSED_COMMUNITY_TYPES = ["free", "brand", "market", "gear"] as const;

export type ClosedCommunityType = (typeof CLOSED_COMMUNITY_TYPES)[number];

export function isClosedCommunityType(value: unknown): boolean {
  return (
    !COMMUNITY_BOARDS_ENABLED &&
    typeof value === "string" &&
    (CLOSED_COMMUNITY_TYPES as readonly string[]).includes(value)
  );
}
