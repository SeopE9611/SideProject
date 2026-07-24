import { COMMUNITY_BOARDS_ENABLED } from "@/lib/community/community-board-flags";

const communityBoardLinks = COMMUNITY_BOARDS_ENABLED
  ? [
      { name: "자유게시판", href: "/board/free" },
      { name: "중고거래", href: "/board/market" },
      { name: "장비 사용기", href: "/board/gear" },
    ]
  : [];

/** 헤더와 모바일 메뉴가 공유하는 전역 사용자 내비게이션 기준값 */
export const DESKTOP_NAV_ITEMS = [
  { name: "교체서비스", kind: "services" },
  { name: "스트링", kind: "strings" },
  { name: "중고 라켓", kind: "rackets" },
  { name: "패키지", kind: "link", href: "/services/packages" },
  { name: "아카데미", kind: "link", href: "/academy" },
  { name: "라켓 케어", kind: "link", href: "/racket-care" },
  { name: "커뮤니티", kind: "boards" },
  { name: "고객센터", kind: "support" },
] as const;

export const NAV_LINKS = {
  strings: {
    root: "/products",
    /** 브랜드별 링크(슬러그는 실제 필터 키에 맞춰 수정 가능) */
    brands: [
      { name: "럭실론", href: "/products?brand=luxilon" },
      { name: "테크니화이버", href: "/products?brand=tecnifibre" },
      { name: "윌슨", href: "/products?brand=wilson" },
      { name: "바볼랏", href: "/products?brand=babolat" },
      { name: "헤드", href: "/products?brand=head" },
      { name: "요넥스", href: "/products?brand=yonex" },
      { name: "솔린코", href: "/products?brand=solinco" },
      // { name: "프린스", href: "/products?brand=prince" },
      { name: "던롭", href: "/products?brand=dunlop" },
      { name: "MSV", href: "/products?brand=msv" },
      { name: "볼키", href: "/products?brand=volkl" },
      { name: "탑스핀", href: "/products?brand=topspin" },
      { name: "기타", href: "/products?brand=other" },
      { name: "하이브리드", href: "/products?material=hybrid" },
    ],
  },

  rackets: {
    root: "/rackets",
    /** 브랜드별 링크(초기에는 문자열과 동일한 브랜드 집합 사용, 추후 /api/rackets 필터 키에 맞춰 조정) */
    brands: [
      { name: "헤드", href: "/rackets?brand=head" },
      { name: "윌슨", href: "/rackets?brand=wilson" },
      { name: "바볼랏", href: "/rackets?brand=babolat" },
      { name: "테크니화이버", href: "/rackets?brand=tecnifibre" },
    ],
  },
  services: [
    { name: "교체서비스 시작하기", href: "/services" },
    { name: "텐션 가이드", href: "/services/tension-guide" },
    { name: "가격 안내", href: "/services/pricing" },
    { name: "매장·방문 안내", href: "/services/locations" },
  ],
  packages: [{ name: "패키지 안내", href: "/services/packages" }],
  academy: { name: "도깨비테니스 아카데미", href: "/academy" },
  support: [
    { name: "고객센터 홈", href: "/support" },
    { name: "공지사항", href: "/board/notice" },
    { name: "이벤트", href: "/board/event" },
    { name: "문의", href: "/board/qna" },
  ],

  /** 커뮤니티형 게시판: 닫힘 상태에서는 리뷰만, 열림 상태에서는 주요 게시판 링크 복구 */
  boards: [...communityBoardLinks, { name: "리뷰", href: "/reviews" }],
} as const;
