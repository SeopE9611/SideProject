export type MenuLink = { name: string; href: string };
export type MenuSection = {
  id: 'strings' | 'service' | 'packages' | 'boards';
  title: string;
  icon: 'grid' | 'wrench' | 'gift' | 'board';
  links: MenuLink[];
};

export const menuSections: MenuSection[] = [
  {
    id: 'strings',
    title: '스트링',
    icon: 'grid',
    links: [
      { name: '전체 보기', href: '/products' },
      { name: '폴리에스터', href: '/products?material=polyester' },
      { name: '하이브리드', href: '/products?material=hybrid' },
      { name: '멀티필라멘트', href: '/products?material=multifilament' },
      { name: '내추럴 거트', href: '/products?material=natural-gut' },
    ],
  },
  {
    id: 'service',
    title: '장착 서비스',
    icon: 'wrench',
    links: [
      { name: '장착 서비스 홈', href: '/services' },
      { name: '텐션 가이드', href: '/services/tension-guide' },
      { name: '장착 비용 안내', href: '/services/pricing' },
      { name: '매장/예약 안내', href: '/services/locations' },
    ],
  },
  {
    id: 'packages',
    title: '패키지',
    icon: 'gift',
    links: [{ name: '패키지 안내', href: '/services/packages' }],
  },
  {
    id: 'boards',
    title: '고객센터 · 게시판',
    icon: 'board',
    links: [
      // 고객센터 영역
      {
        name: '고객센터 홈',
        href: '/support',
      },
      {
        name: '공지사항',
        href: '/board/notice',
      },
      {
        name: 'Q&A',
        href: '/board/qna',
      },

      // 커뮤니티 게시판 영역
      {
        name: '게시판 홈',
        href: '/board',
      },
      {
        name: '자유 게시판',
        href: '/board/free',
      },
      {
        name: '중고 거래',
        href: '/board/market',
      },
      {
        name: '장비 사용기',
        href: '/board/gear',
      },
      {
        name: '리뷰 게시판',
        href: '/reviews',
      },
    ],
  },
] as const;
