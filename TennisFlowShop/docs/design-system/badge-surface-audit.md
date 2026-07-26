# 고객 화면 뱃지 표면 전수 조사

## 표시 원칙

- 현재가와 정상가를 함께 보여 주는 화면은 가격 영역의 `CatalogPrice` 또는 인라인
  `CommerceBadge`가 `N% 할인`을 한 번 표시한다. 같은 카드의 이미지 뱃지에서는 `sale`을
  제외한다.
- 메인 상품·라켓 카드는 가격 영역에 할인율이 없으므로 기존 이미지 할인 뱃지를 유지한다.
- `NEW`, 추천, 품절은 할인과 다른 의미다. 이미지 최대 두 개 제한과 품절 우선순위를 유지하고,
  신상품 필터에서는 `ensureNew`로 `NEW` 노출을 보장한다.
- 옵션 품절, CTA 구매 불가, 대여 상태는 각각 제어 상태·행동 결과를 설명하므로 상품 상태 뱃지와
  문구가 같더라도 목적이 다르면 유지한다.

## 고객 화면 조합 추적

| 경로/컴포넌트                                                                      | 화면 영역                          | 의미                            | 데이터 원천                       | 렌더러                                            | 중복 여부                               | 이번 결정                                                                               |
| ---------------------------------------------------------------------------------- | ---------------------------------- | ------------------------------- | --------------------------------- | ------------------------------------------------- | --------------------------------------- | --------------------------------------------------------------------------------------- |
| `app/HomePageRedesign.tsx`                                                         | 메인 상품·라켓 이미지              | 할인, NEW, 추천, 품절           | inventory, marketing, 재고        | `commerceBadgeSpecs` + `SemanticBadge`            | 가격 영역에 할인율이 없어 중복 아님     | 이미지 할인 유지                                                                        |
| `app/products/components/ProductCard.tsx`                                          | 상품 목록 그리드·리스트            | NEW, 추천, 품절                 | inventory, 상품, 옵션 재고        | 이미지 `SemanticBadge`, 가격 `CatalogPrice`       | 이미지와 가격의 할인 중복 가능          | 이미지 sale 제외, 가격에만 할인 표시; `ensureNew` 유지                                  |
| `app/products/[id]/ProductDetailImageGallery.tsx` / `ProductDetailClient.utils.ts` | 상품 상세 이미지 갤러리            | NEW, 추천, 품절                 | inventory, 상품, 계산된 전체 품절 | `SemanticBadge`                                   | 구매 패널 가격과 할인 중복              | 이미지 sale 제외                                                                        |
| `app/products/[id]/ProductDetailClient.tsx`                                        | 상품 상세 구매 패널·가격           | 판매가, 정상가, 할인            | price, inventory.salePrice        | `CatalogPrice`                                    | 이미지 할인과 중복 가능                 | `N% 할인`의 단일 소유 위치로 지정                                                       |
| `app/products/[id]/ProductDetailClient.tsx`                                        | 색상·게이지 옵션, 재고 안내, CTA   | 옵션 품절, 재고 부족, 구매 불가 | 옵션별 재고, 전체 재고            | 옵션 제어 문구, 안내, 버튼                        | 목적이 달라 단순 중복 아님              | 기존 판정과 문구 유지                                                                   |
| `app/products/[id]/ProductDetailClient.tsx`                                        | 추천·상세 스펙                     | 추천 근거, 상품 속성            | 상품 상세 데이터                  | 설명·스펙 UI                                      | 할인 중복 없음                          | 유지                                                                                    |
| `app/products/[id]/ProductReviewCard.tsx`                                          | 상품 상세 후기                     | 후기 문맥, 비공개               | reviewContext, status, 소유권     | `ReviewContextBadge`, `ReviewVisibilityBadge`     | 작성자 `(비공개)`와 상태 뱃지 중복 가능 | 관리 가능한 후기에는 이름과 별도 뱃지로 한 번만 표시; 마스킹 후기는 이름에서 한 번 표시 |
| `app/products/[id]/ProductDetailQnaTab.tsx`                                        | 상품 상세 문의                     | 카테고리, 비밀글, 답변 상태     | Q&A category, isSecret, answer    | `SemanticBadge`                                   | 서로 다른 의미                          | 기존 tone 보존, 비밀글 neutral outline 유지                                             |
| `components/HorizontalProducts.tsx` / `ProductDetailRelatedProductsSection.tsx`    | 상세 관련 상품                     | NEW, 추천, 품절, 할인           | inventory 또는 racket marketing   | 이미지 `SemanticBadge`, 가격 아래 `CommerceBadge` | 할인 두 번 표시                         | 이미지 sale 제외, 정상가 다음 인라인 할인 유지                                          |
| `components/recent-viewed/RecentViewedItems.tsx`                                   | 최근 본 상품                       | 상품·라켓 구분 및 가격 정보     | 로컬 최근 본 항목                 | 최근 본 카드 UI                                   | 이미지/가격 할인 중복 없음              | 유지                                                                                    |
| `app/components/select-string/StringCard.tsx`                                      | 스트링 선택 카드                   | 가격·할인                       | 상품 가격, salePrice              | `CatalogPrice`                                    | 별도 이미지 할인 없음                   | 가격의 `N% 할인` 유지                                                                   |
| `app/components/select-string/SelectStringLayout.tsx`                              | 라켓 스트링 선택 요약              | 선택 상품 가격·할인             | 선택 상품 가격                    | `CatalogPrice`                                    | 별도 이미지 할인 없음                   | 가격의 `N% 할인` 유지                                                                   |
| `app/products/recommend/_components/StringRecommendResultCard.tsx`                 | 스트링 추천 결과                   | 추천 결과·상품 가격·할인        | 추천 응답, 상품                   | 결과 카드 UI, `CommerceBadge`                     | 가격 할인 이미지 중복 없음              | 기존 `% OFF`를 공용 `N% 할인`으로 통일                                                  |
| `app/rackets/_components/RacketCard.tsx`                                           | 중고 라켓 목록 그리드·리스트       | NEW, 추천, 할인                 | marketing, 가격 계산              | 이미지 `SemanticBadge`, 가격 `CatalogPrice`       | 이미지와 가격 할인 중복 가능            | 이미지 sale 제외, 가격에만 할인 표시                                                    |
| `app/rackets/[id]/_components/RacketDetailClient.tsx`                              | 라켓 상세 이미지 갤러리            | NEW, 추천                       | marketing                         | `SemanticBadge`                                   | 가격 할인과 중복 가능                   | 이미지 sale 제외                                                                        |
| `app/rackets/[id]/_components/RacketDetailClient.tsx`                              | 브랜드·등급·재고/대여              | 분류, condition, availability   | brand, condition, stock/rental    | `SemanticBadge`, `RacketBadge`                    | 서로 다른 의미                          | 브랜드 neutral outline, condition·availability 유지                                     |
| `app/rackets/[id]/_components/RacketDetailClient.tsx`                              | 가격, 배송·대여 요약, CTA          | 할인, 배송, 구매·대여 가능 여부 | 가격, 배송비, 재고·대여           | `CatalogPrice`, 요약, 버튼                        | 목적이 달라 단순 중복 아님              | 할인은 가격에 한 번; 구매·대여 판정 유지                                                |
| `app/rackets/[id]/_components/RacketDetailClient.tsx`                              | 상세 설명·스펙                     | 라켓 속성                       | racket detail                     | 설명·스펙 UI                                      | 할인 중복 없음                          | 유지                                                                                    |
| `app/rackets/[id]/_components/RacketDetailClient.tsx`                              | 후기·문의                          | 후기 문맥/비공개, Q&A 상태      | review, Q&A                       | 공용 후기 뱃지, `ProductDetailQnaTab`             | 비공개 이름과 뱃지 중복 가능            | 상품 상세와 같은 단일 표현 적용                                                         |
| `app/rackets/[id]/_components/RacketDetailClient.tsx`                              | 스트링 선택 진입                   | 다음 행동                       | 구매 흐름                         | CTA                                               | 상태 뱃지 중복 없음                     | 유지                                                                                    |
| `app/rackets/finder/_components/FinderRacketCard.tsx`                              | 라켓 찾기                          | 가격, 대여 가능                 | racket price, rental.enabled      | `CatalogPrice`, 상태 Badge                        | 할인 가격 미사용                        | 기존 표시 유지                                                                          |
| `app/rackets/compare/_components/*`                                                | 라켓 비교 데스크톱·모바일·미리보기 | 선택·스펙 차이                  | 비교 store, racket spec           | 비교 상태 Badge                                   | commerce 할인 중복 없음                 | 비교 semantic 계열 유지                                                                 |
| 상품·라켓 관련 미리보기 카드                                                       | 검색·선택 미리보기                 | 분류, 가격, 선택 상태           | 각 결과 데이터                    | 해당 카드 Badge/가격 UI                           | 동일 할인 이중 표출 없음                | 기존 구조 유지                                                                          |

## 상세 페이지 점검 결론

- 상품 상세는 갤러리와 구매 패널의 실제 조합을 기준으로 할인 소유 위치를 구매 패널 가격으로
  정했다. 옵션 일부 품절과 전체 품절, 재고 부족 안내 및 CTA는 역할이 달라 유지했다.
- 라켓 상세는 갤러리 마케팅 뱃지, 브랜드·등급·대여 가능 상태, 가격, 배송·대여 요약, CTA,
  설명·스펙, 후기·문의, 스트링 선택 진입을 함께 확인했다. condition·availability 판정은
  `RacketBadge`에 그대로 두었다.
- 후기의 문맥과 공개 여부는 서로 다른 의미다. 문맥은 neutral outline `ReviewContextBadge`,
  관리자가 식별할 수 있는 비공개 상태는 같은 계열의 `ReviewVisibilityBadge`로 통일했다.
- Q&A 카테고리·답변 상태는 기존 spec의 tone을 사용하고, 비밀글은 neutral outline으로 유지했다.

## 범위 밖

관리자, 주문, 커뮤니티 목록의 workflow/status 뱃지는 상품 merchandising 뱃지와 다른 semantic
계열이다. 이번 변경에서는 데이터 판정이나 렌더러를 바꾸지 않았으며, 별도의 업무 상태 정합성
작업 대상으로 남긴다.
