// components/nav/menuData.ts
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
      { name: '장착 서비스 예약', href: '/services' },
      { name: '텐션 가이드', href: '/services/tension-guide' },
      { name: '장착 비용 안내', href: '/services/pricing' },
      { name: '매장/예약 안내', href: '/academy' },
    ],
  },
  {
    id: 'packages',
    title: '패키지',
    icon: 'gift',
    links: [
      { name: '패키지 안내', href: '/services/packages' },
      { name: '10회 패키지', href: '/services/packages?package=10-sessions&target=packages' },
      { name: '30회 패키지', href: '/services/packages?package=30-sessions&target=packages' },
      { name: '50회 패키지', href: '/services/packages?package=50-sessions&target=packages' },
      { name: '100회 패키지', href: '/services/packages?package=100-sessions&target=packages' },
    ],
  },
  {
    id: 'boards',
    title: '게시판',
    icon: 'board',
    links: [
      { name: '공지사항', href: '/board/notice' },
      { name: 'QnA', href: '/board/qna' },
      { name: '리뷰 게시판', href: '/reviews' },
    ],
  },
];
