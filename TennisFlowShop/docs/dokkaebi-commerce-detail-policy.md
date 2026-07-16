# Dokkaebi Commerce Detail Policy

## 상세 레이아웃

### 360~767px
- 1열
- gallery
- purchase panel
- detail tabs

### 768~1199px
- 2열
- gallery minmax(0, 1fr)
- purchase panel 320~380px

### 1200px 이상
- 2열
- gallery 약 1.2~1.35fr
- purchase panel 380~440px

## Gallery

- outer radius와 clipping은 공용 상세 갤러리에서 관리한다.
- 상품 이미지는 `object-contain`을 사용한다.
- 라켓 이미지는 현재 상세 사진 정책에 따라 `contain` 또는 `cover` prop으로 구분한다.
- thumbnail은 실제 `<button>`으로 구현한다.
- 선택 상태는 `aria-pressed`로 전달한다.
- 이전·다음 버튼에는 구체적인 `aria-label`을 제공한다.
- sticky 위치는 header 높이 기반 `top-[calc(var(--header-h,64px)+1rem)]`을 사용한다.
- raw `top-20`, `top-24`는 사용하지 않는다.

## Purchase information hierarchy

1. 브랜드·컨디션·재고 Badge
2. 상품명·모델명
3. 평점·후기 수
4. 판매가·할인가
5. 배송·장착비·대여 정보
6. 옵션
7. 대표 transaction CTA
8. 보조 transaction CTA
9. 위시리스트·비교 등의 utility

## CTA

- 대표 신청·구매: `highlight_soft`
- 대안 구매·대여: `outline` 또는 `secondary`
- 장바구니: `outline`
- 위시리스트·비교: `outline` 또는 `ghost` utility
- 품절·구매 불가·대여 불가: neutral disabled

## Tabs

- 설명·스펙·후기·문의 네 항목은 모두 항상 보인다.
- 모바일에서는 short label을 사용한다.
- 576px 이상에서는 full label을 사용한다.
- hidden horizontal scroll은 금지한다.
- URL `?tab=` 상태를 유지한다.

## Product purchase panel

- 상품과 라켓 상세는 모두 `CommercePurchasePanel`을 사용한다.
- 슬롯 순서는 다음을 따른다.
  1. eyebrow·badge
  2. title
  3. rating
  4. price
  5. summary
  6. options
  7. actions
  8. utilities

## Sold-out

- 품절 CTA의 visible label은 짧게 "품절"로 표시한다.
- 색상·게이지 조합 품절, 전체 재고 소진 등 구체적인 사유는 `CommercePurchaseActions.helper`에 표시한다.
- 긴 품절 문구를 `nowrap` Button 내부에 넣지 않는다.

## Utility actions

- Wishlist와 비교 기능은 transaction action 내부에 섞지 않고 `CommercePurchasePanel.utilities`에 배치한다.

## String detail CTA hierarchy

- 교체서비스 신청이 가능한 스트링 상세에서는 교체서비스 신청을 항상 대표 `highlight_soft` CTA로 표시한다.
- 동시에 단독 구매가 가능하면 단독 구매는 `secondary`, 장바구니는 `outline`으로 표시한다.
