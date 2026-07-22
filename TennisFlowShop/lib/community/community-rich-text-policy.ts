// brand 게시판은 기존 일반 본문 정책을 유지하므로 이번 리치 텍스트 허용 목록에서 제외한다.
// 현재 리치 텍스트 적용 대상은 free, market, gear 게시판으로 한정한다.
export const COMMUNITY_RICH_TEXT_TYPES = ["free", "market", "gear"] as const;

export type CommunityRichTextType = (typeof COMMUNITY_RICH_TEXT_TYPES)[number];

// 10~5,000자는 기존 커뮤니티 작성 UI의 본문 입력 정책이다.
export const COMMUNITY_RICH_TEXT_CONTENT_MIN = 10;
export const COMMUNITY_RICH_TEXT_CONTENT_MAX = 5000;

/**
 * HTML 문자열 길이가 아니라 정제 후 실제 텍스트 길이를 검사해야
 * 서식 태그가 글자 수 제한을 불필요하게 소모하지 않는다.
 */
export function isCommunityRichTextType(value: unknown): value is CommunityRichTextType {
  return (
    typeof value === "string" &&
    (COMMUNITY_RICH_TEXT_TYPES as readonly string[]).includes(value)
  );
}
