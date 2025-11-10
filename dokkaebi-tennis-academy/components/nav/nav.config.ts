export const NAV_FLAGS = {
  /** 재질 카테고리(스트링 타입) 노출 온/오프 */
  SHOW_MATERIAL_MENU: false,
  SHOW_BRAND_MENU: true,
};

export const NAV_LINKS = {
  strings: {
    root: '/products',
    /** 브랜드별 링크(슬러그는 실제 필터 키에 맞춰 수정 가능) */
    brands: [
      { name: '윌슨', href: '/products?brand=wilson' },
      { name: '바볼랏', href: '/products?brand=babolat' },
      { name: '럭실론', href: '/products?brand=luxilon' },
      { name: '요넥스', href: '/products?brand=yonex' },
      { name: '헤드', href: '/products?brand=head' },
      { name: '테크니화이버', href: '/products?brand=tecnifibre' },
      { name: '솔린코', href: '/products?brand=solinco' },
      { name: '프린스', href: '/products?brand=prince' },
    ],
  },

  rackets: {
    root: '/rackets',
    /** 브랜드별 링크(초기에는 문자열과 동일한 브랜드 집합 사용, 추후 /api/rackets 필터 키에 맞춰 조정) */
    brands: [
      { name: '헤드', href: '/rackets?brand=head' },
      { name: '윌슨', href: '/rackets?brand=wilson' },
      { name: '바볼랏', href: '/rackets?brand=babolat' },
      { name: '테크니화이버', href: '/rackets?brand=tecnifibre' },
    ],
  },
  services: [
    { name: '장착 서비스 예약', href: '/services' },
    { name: '텐션 가이드', href: '/services/tension-guide' },
    { name: '장착 비용 안내', href: '/services/pricing' },
    { name: '매장/예약 안내', href: '/services/locations' },
  ],
  packages: [
    { name: '패키지 안내', href: '/services/packages' },
    { name: '10회 패키지', href: '/services/packages?package=10-sessions&target=packages' },
    { name: '30회 패키지', href: '/services/packages?package=30-sessions&target=packages' },
    { name: '50회 패키지', href: '/services/packages?package=50-sessions&target=packages' },
    { name: '100회 패키지', href: '/services/packages?package=100-sessions&target=packages' },
  ],
  boards: [
    { name: '공지사항', href: '/board/notice' },
    { name: 'QnA', href: '/board/qna' },
    { name: '리뷰 게시판', href: '/reviews' },
  ],
} as const;
