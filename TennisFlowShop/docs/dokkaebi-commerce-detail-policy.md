# Dokkaebi Commerce Detail Policy

## 상세 레이아웃

- 모바일의 갤러리·구매 패널·상세 탭은 좌우 full-bleed 평면 섹션을 사용한다.
- 둥근 카드, 전체 테두리와 그림자는 768px 이상에서 복원한다.
- 모바일 상단 탐색 버튼과 갤러리 이전·다음 버튼은 최소 44px 터치 영역을 제공한다.
- 거래 CTA는 기존 `tall` 역할을 유지한다.
- 내부 정보를 반복해서 중첩 카드로 만들지 않는다.
- 추천 정보·관련 상품·최근 본 상품 같은 상세 하단 section도 모바일에서는 평면으로 표시하고 768px 이상에서 Card를 복원한다.
- 사용자 행동 Button은 모바일에서 최소 44px 터치 영역을 제공하고 데스크톱에서만 compact 크기를 복원한다.
- 상단 뒤로·breadcrumb와 같은 목적의 하단 탐색 Link를 중복하지 않는다.
- 사용자용 상세 화면의 분류·eyebrow 문구는 특별한 이유가 없으면 한국어 용어를 사용한다.

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
- 상품·라켓의 설명·스펙 제목은 동일한 제목·아이콘 문법을 사용한다.
- 모바일 설명 본문은 중첩 카드 대신 구분선 기반 평면 섹션으로 표시한다.
- 모바일 스펙은 왼쪽 label과 오른쪽 value를 갖는 구분선 목록으로 표시하며, 긴 value는 자연스럽게 줄바꿈한다.
- 768px 이상에서는 설명 보조 카드와 2열 스펙 카드 그리드를 복원한다.
- 모바일 후기 목록은 구분선 기반 평면 목록으로 표시하고, 768px 이상에서 개별 후기 Card를 복원한다.
- 후기 본문 내부에는 카드를 다시 중첩하지 않는다.
- 후기 작성 CTA와 관리 메뉴는 모바일에서 최소 44px 터치 영역을 제공한다.
- 후기 rating은 warning 의미색을 사용하며, 데이터가 없는 날짜를 가짜 값으로 표시하지 않는다.
- 후기 빈 상태에서는 상단과 동일한 작성 CTA를 반복하지 않는다.
- 모바일 문의 목록은 구분선 기반 평면 목록으로 표시하고, 768px 이상에서 개별 문의 Card를 복원한다.
- 문의 작성 CTA는 모바일에서 최소 44px 터치 영역을 제공한다.
- 문의 카드 전체 Link는 hover와 focus-visible 상태를 모두 제공한다.
- 문의 빈 상태에서는 상단과 동일한 문의 CTA를 반복하지 않는다.
- 문의 loading·error·empty 상태는 실제 목록과 같은 모바일 평면·데스크톱 Card 표면 규칙을 따른다.
- 문의 날짜가 없을 때 빈 요소나 가짜 날짜를 표시하지 않는다.

## Product purchase panel

- 상품과 라켓 상세는 모두 `CommercePurchasePanel`을 사용한다.
- 상품 수량 Stepper는 모바일에서 최소 44px 터치 영역을 제공한다.
- 색상·옵션 선택 raw button은 명확한 선택 상태와 `focus-visible` ring을 제공한다.
- 긴 배송·대여·보증금 값에는 `whitespace-nowrap`을 강제하지 않고 오른쪽 정렬 상태로 줄바꿈을 허용한다.
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
