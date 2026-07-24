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
  { name: "아카데미", kind: "link", href: "/academy" },
  { name: "커뮤니티", kind: "boards" },
  { name: "고객센터", kind: "support" },
] as const;

export const NAV_LINKS = {
  strings: {
    root: "/products",
    quickLinks: [
      { name: "전체 스트링", href: "/products", description: "전체 상품을 둘러보세요." },
      { name: "스트링 추천", href: "/products/recommend", description: "플레이 성향에 맞춰 추천받으세요." },
      { name: "텐션 가이드", href: "/services/tension-guide", description: "적정 텐션을 알아보세요." },
      { name: "교체서비스 시작하기", href: "/services", description: "접수 방식을 확인하고 신청하세요.", cta: true },
    ],
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
    quickLinks: [
      { name: "전체 보기", href: "/rackets", description: "인증 중고 라켓을 둘러보세요." },
      { name: "대여 가능한 라켓", href: "/rackets?rentOnly=1", description: "대여 가능 상품만 확인하세요." },
      { name: "라켓 찾기", href: "/rackets/finder", description: "내게 맞는 라켓을 찾아보세요." },
      { name: "라켓 비교", href: "/rackets/compare", description: "사양을 한눈에 비교하세요." },
      { name: "라켓 케어", href: "/racket-care", description: "보유 라켓을 등록하고 관리하세요." },
    ],
    /** 브랜드별 링크(초기에는 문자열과 동일한 브랜드 집합 사용, 추후 /api/rackets 필터 키에 맞춰 조정) */
    brands: [
      { name: "헤드", href: "/rackets?brand=head" },
      { name: "윌슨", href: "/rackets?brand=wilson" },
      { name: "바볼랏", href: "/rackets?brand=babolat" },
      { name: "테크니화이버", href: "/rackets?brand=tecnifibre" },
    ],
  },
  services: [
    { name: "교체서비스 시작하기", href: "/services", description: "접수 방식을 확인하고 신청하세요." },
    { name: "텐션 가이드", href: "/services/tension-guide", description: "플레이에 맞는 텐션을 확인하세요." },
    { name: "가격 안내", href: "/services/pricing", description: "장착비와 이용 요금을 확인하세요." },
    { name: "매장·방문 안내", href: "/services/locations", description: "방문 전 위치와 운영 정보를 확인하세요." },
    { name: "스트링 교체 패키지", href: "/services/packages", description: "패키지 구성과 혜택을 살펴보세요." },
  ],
  academy: { name: "도깨비테니스 아카데미", href: "/academy" },
  support: [
    { name: "고객센터 홈", href: "/support", description: "도움말과 문의 경로를 확인하세요." },
    { name: "공지사항", href: "/board/notice", description: "중요한 이용 소식을 확인하세요." },
    { name: "이벤트", href: "/board/event", description: "진행 중인 이벤트를 살펴보세요." },
    { name: "문의", href: "/board/qna", description: "궁금한 점을 남겨주세요." },
  ],

  /** 커뮤니티형 게시판: 닫힘 상태에서는 리뷰만, 열림 상태에서는 주요 게시판 링크 복구 */
  boards: {
    root: { name: "커뮤니티 홈", href: "/board", description: "게시판을 한곳에서 확인하세요." },
    links: [
      ...communityBoardLinks.map((link) => ({ ...link, description: "테니스 이야기를 나눠보세요." })),
      { name: "리뷰", href: "/reviews", description: "회원들의 사용 후기를 확인하세요." },
    ],
  },
} as const;
