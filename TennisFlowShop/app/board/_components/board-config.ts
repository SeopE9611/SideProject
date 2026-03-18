import {
  MARKET_BRANDS_BY_CATEGORY,
  MARKET_BRAND_LABEL_MAP,
} from "@/lib/market";

export type BoardType = "free" | "market" | "gear";

type CategoryConfig = { value: string; label: string };

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
  brandOptionsByCategory?: Record<
    string,
    ReadonlyArray<{ value: string; label: string }>
  >;
  brandLabelMap?: Record<string, string>;
};

export function getCategoryBadgeText(category: CategoryConfig) {
  return category.label;
}

function createCategoryMap(categories: CategoryConfig[]) {
  return Object.fromEntries(
    categories.map((category) => [category.value, category]),
  );
}

export const FREE_BOARD_CONFIG: BoardTypeConfig = {
  boardType: "free",
  routePrefix: "/board/free",
  boardTitle: "자유 게시판",
  boardDescription:
    "테니스 관련 질문, 정보 공유, 일상 이야기를 자유롭게 나눌 수 있는 공간입니다.",
  cardDescription:
    "질문, 정보 공유, 후기, 잡담 등 다양한 이야기를 자유롭게 남겨 보세요.",
  errorMessage: "자유 게시판을 불러오는 중 오류가 발생했습니다.",
  emptyDescription: "자유 게시판의 첫 번째 글을 작성해 보세요.",
  categories: [
    { value: "general", label: "자유" },
    { value: "info", label: "정보" },
    { value: "qna", label: "질문" },
    { value: "tip", label: "노하우" },
    { value: "etc", label: "기타" },
  ],
  categoryMap: createCategoryMap([
    { value: "general", label: "자유" },
    { value: "info", label: "정보" },
    { value: "qna", label: "질문" },
    { value: "tip", label: "노하우" },
    { value: "etc", label: "기타" },
  ]),
};

export const MARKET_BOARD_CONFIG: BoardTypeConfig = {
  boardType: "market",
  routePrefix: "/board/market",
  boardTitle: "중고 거래 게시판",
  boardDescription: "테니스 라켓, 스트링,장비 등 거래하는 공간입니다.",
  cardDescription: "회원들과 자유롭게 테니스 상품을 거래 해보세요.",
  errorMessage: "중고 거래 게시판을 불러오는 중 오류가 발생했습니다.",
  emptyDescription: "첫 번째 글을 작성해 보세요.",
  categories: [
    { value: "racket", label: "라켓" },
    { value: "string", label: "스트링" },
    { value: "equipment", label: "일반장비" },
  ],
  categoryMap: createCategoryMap([
    { value: "racket", label: "라켓" },
    { value: "string", label: "스트링" },
    { value: "equipment", label: "일반장비" },
  ]),
  brandOptionsByCategory: MARKET_BRANDS_BY_CATEGORY,
  brandLabelMap: MARKET_BRAND_LABEL_MAP,
};

export const GEAR_BOARD_CONFIG: BoardTypeConfig = {
  boardType: "gear",
  routePrefix: "/board/gear",
  boardTitle: "장비 사용기",
  boardDescription: "테니스 장비 사용기를 작성하는 공간입니다.",
  cardDescription: "라켓, 스트링 테니스화 등 자유롭게 사용기를 남겨 보세요.",
  errorMessage: "장비 사용기 게시판을 불러오는 중 오류가 발생했습니다.",
  emptyDescription: "첫 번째 글을 작성해 보세요.",
  categories: [
    { value: "racket", label: "라켓" },
    { value: "string", label: "스트링" },
    { value: "shoes", label: "테니스화" },
    { value: "bag", label: "가방" },
    { value: "apparel", label: "의류" },
    { value: "grip", label: "그립" },
    { value: "accessory", label: "악세서리" },
    { value: "ball", label: "테니스볼" },
    { value: "other", label: "기타" },
  ],
  categoryMap: createCategoryMap([
    { value: "racket", label: "라켓" },
    { value: "string", label: "스트링" },
    { value: "shoes", label: "테니스화" },
    { value: "bag", label: "가방" },
    { value: "apparel", label: "의류" },
    { value: "grip", label: "그립" },
    { value: "accessory", label: "악세서리" },
    { value: "ball", label: "테니스볼" },
    { value: "other", label: "기타" },
  ]),
};
