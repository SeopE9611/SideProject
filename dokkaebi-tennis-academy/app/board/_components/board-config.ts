import { MARKET_BRANDS_BY_CATEGORY, MARKET_BRAND_LABEL_MAP } from '@/app/board/market/_components/market.constants';

export type BoardType = 'free' | 'market' | 'gear';

type CategoryConfig = { value: string; label: string; badgeClass: string };

export type BoardTypeConfig = {
  boardType: BoardType;
  routePrefix: string;
  boardTitle: string;
  boardDescription: string;
  cardDescription: string;
  errorMessage: string;
  emptyDescription: string;
  categories: Array<{ value: string; label: string }>;
  categoryMap: Record<string, CategoryConfig>;
  defaultCategoryBadgeClass: string;
  brandOptionsByCategory?: Record<string, ReadonlyArray<{ value: string; label: string }>>;
  brandLabelMap?: Record<string, string>;
};

const defaultCategoryBadgeClass = 'px-2.5 py-0.5 text-xs leading-[1.05] rounded-md bg-background text-muted-foreground dark:bg-card dark:text-muted-foreground';

function createCategoryMap(categories: CategoryConfig[]) {
  return Object.fromEntries(categories.map((category) => [category.value, category]));
}

export const FREE_BOARD_CONFIG: BoardTypeConfig = {
  boardType: 'free',
  routePrefix: '/board/free',
  boardTitle: '자유 게시판',
  boardDescription: '테니스 관련 질문, 정보 공유, 일상 이야기를 자유롭게 나눌 수 있는 공간입니다.',
  cardDescription: '질문, 정보 공유, 후기, 잡담 등 다양한 이야기를 자유롭게 남겨 보세요.',
  errorMessage: '자유 게시판을 불러오는 중 오류가 발생했습니다.',
  emptyDescription: '자유 게시판의 첫 번째 글을 작성해 보세요.',
  categories: [
    { value: 'general', label: '자유' },
    { value: 'info', label: '정보' },
    { value: 'qna', label: '질문' },
    { value: 'tip', label: '노하우' },
    { value: 'etc', label: '기타' },
  ],
  categoryMap: createCategoryMap([
    { value: 'general', label: '자유', badgeClass: 'px-2.5 py-0.5 text-xs leading-[1.05] rounded-md bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300' },
    { value: 'info', label: '정보', badgeClass: 'px-2.5 py-0.5 text-xs leading-[1.05] rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
    { value: 'qna', label: '질문', badgeClass: 'px-2.5 py-0.5 text-xs leading-[1.05] rounded-md bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
    { value: 'tip', label: '노하우', badgeClass: 'px-2.5 py-0.5 text-xs leading-[1.05] rounded-md bg-purple-50 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
    { value: 'etc', label: '기타', badgeClass: 'px-2.5 py-0.5 text-xs leading-[1.05] rounded-md bg-background text-foreground dark:bg-card dark:text-muted-foreground' },
  ]),
  defaultCategoryBadgeClass,
};

export const MARKET_BOARD_CONFIG: BoardTypeConfig = {
  boardType: 'market',
  routePrefix: '/board/market',
  boardTitle: '중고 거래 게시판',
  boardDescription: '테니스 라켓, 스트링,장비 등 거래하는 공간입니다.',
  cardDescription: '회원들과 자유롭게 테니스 상품을 거래 해보세요.',
  errorMessage: '중고 거래 게시판을 불러오는 중 오류가 발생했습니다.',
  emptyDescription: '첫 번째 글을 작성해 보세요.',
  categories: [
    { value: 'racket', label: '라켓' },
    { value: 'string', label: '스트링' },
    { value: 'equipment', label: '일반장비' },
  ],
  categoryMap: createCategoryMap([
    { value: 'racket', label: '라켓', badgeClass: 'px-2.5 py-0.5 text-xs leading-[1.05] rounded-md bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300' },
    { value: 'string', label: '스트링', badgeClass: 'px-2.5 py-0.5 text-xs leading-[1.05] rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
    { value: 'equipment', label: '일반장비', badgeClass: 'px-2.5 py-0.5 text-xs leading-[1.05] rounded-md bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  ]),
  defaultCategoryBadgeClass,
  brandOptionsByCategory: MARKET_BRANDS_BY_CATEGORY,
  brandLabelMap: MARKET_BRAND_LABEL_MAP,
};

export const GEAR_BOARD_CONFIG: BoardTypeConfig = {
  boardType: 'gear',
  routePrefix: '/board/gear',
  boardTitle: '장비 사용기',
  boardDescription: '테니스 장비 사용기를 작성하는 공간입니다.',
  cardDescription: '라켓, 스트링 테니스화 등 자유롭게 사용기를 남겨 보세요.',
  errorMessage: '장비 사용기 게시판을 불러오는 중 오류가 발생했습니다.',
  emptyDescription: '첫 번째 글을 작성해 보세요.',
  categories: [
    { value: 'racket', label: '라켓' },
    { value: 'string', label: '스트링' },
    { value: 'shoes', label: '테니스화' },
    { value: 'bag', label: '가방' },
    { value: 'apparel', label: '의류' },
    { value: 'grip', label: '그립' },
    { value: 'accessory', label: '악세서리' },
    { value: 'ball', label: '테니스볼' },
    { value: 'other', label: '기타' },
  ],
  categoryMap: createCategoryMap([
    { value: 'racket', label: '라켓', badgeClass: 'px-2.5 py-0.5 text-xs leading-[1.05] rounded-md bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300' },
    { value: 'string', label: '스트링', badgeClass: 'px-2.5 py-0.5 text-xs leading-[1.05] rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
    { value: 'shoes', label: '테니스화', badgeClass: 'px-2.5 py-0.5 text-xs leading-[1.05] rounded-md bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
    { value: 'bag', label: '가방', badgeClass: 'px-2.5 py-0.5 text-xs leading-[1.05] rounded-md bg-purple-50 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
    { value: 'apparel', label: '의류', badgeClass: 'px-2.5 py-0.5 text-xs leading-[1.05] rounded-md bg-rose-50 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' },
    { value: 'grip', label: '그립', badgeClass: 'px-2.5 py-0.5 text-xs leading-[1.05] rounded-md bg-cyan-50 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300' },
    { value: 'accessory', label: '악세서리', badgeClass: 'px-2.5 py-0.5 text-xs leading-[1.05] rounded-md bg-background text-foreground dark:bg-card dark:text-muted-foreground' },
    { value: 'ball', label: '테니스볼', badgeClass: 'px-2.5 py-0.5 text-xs leading-[1.05] rounded-md bg-lime-50 text-lime-700 dark:bg-lime-900/40 dark:text-lime-300' },
    { value: 'other', label: '기타', badgeClass: 'px-2.5 py-0.5 text-xs leading-[1.05] rounded-md bg-background text-muted-foreground dark:bg-card dark:text-muted-foreground' },
  ]),
  defaultCategoryBadgeClass,
};
