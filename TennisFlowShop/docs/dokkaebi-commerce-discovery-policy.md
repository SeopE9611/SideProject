# Dokkaebi Commerce Discovery Policy (V2.2 Phase 7A)

## Catalog Results Panel

Commerce Discovery의 결과 영역은 하나의 `CatalogResultsPanel` 안에서 다음 순서를 따른다.

1. eyebrow / 카탈로그 성격
2. 전체 결과 수
3. 현재 표시 수
4. background refresh 상태
5. 필터·정렬·뷰 컨트롤
6. 적용 중인 필터

결과·툴바·활성 필터를 서로 다른 강한 카드로 반복하지 않는다. 외부 패널은 `rounded-panel`, `border-border`, `bg-card`, `shadow-soft`를 기준으로 하며 내부 구획은 `border-t`와 muted surface만 사용한다.

## 빠른 필터

항목 수가 5개 이하일 때 모바일에서 hidden horizontal scroll을 사용하지 않는다. grid 또는 wrap으로 모든 항목을 발견 가능하게 배치한다. active 상태는 soft brand surface(`brand-highlight-muted`)로 표시하고, 색상 외에도 `aria-pressed`, check icon, 텍스트로 상태를 전달한다.

## 활성 필터

활성 필터는 개별 제거와 전체 초기화를 모두 제공한다. 긴 조건은 한 줄 chip으로 유지하고, 조건이 많을 때만 horizontal overflow를 허용한다. scrollbar를 숨기는 경우 오른쪽 fade 등 overflow 단서를 제공한다. 제거 버튼은 최소 28px target과 구체적인 `aria-label`을 가져야 한다.

## 카드 정보 위계

1. 마케팅 Badge
2. 이미지
3. 브랜드
4. 상품명/모델명
5. 평점·후기
6. 도메인별 상태·성능
7. 가격
8. 액션

상품의 스트링 성능 정보와 라켓의 컨디션·구매·대여 정보는 도메인 컴포넌트가 유지한다.

## CTA

대표 구매·신청 CTA는 `highlight_soft`를 사용한다. 대안 구매·대여는 `outline` 또는 `secondary`를 사용한다. 상세 보기는 이미지·제목 Link를 우선하고, list view에서 별도 버튼이 필요하면 `outline`을 사용한다. 품절·구매 불가·대여 불가는 neutral disabled로 표현한다. 모든 카드에 filled highlight 또는 graphite default를 반복하지 않는다.

## Grid

- 360~575px: 1열
- 576~1199px: 2열
- 1200~1499px: 3열
- 1500px 이상: 4열

## 상품·라켓 도메인 분리

공용 컴포넌트는 presentation shell만 담당한다. 다음은 도메인 컴포넌트에 유지한다.

- 상품 재고 계산
- 스트링 옵션 재고
- 상품 성능 지표
- 교체서비스 가능 여부
- 라켓 컨디션
- 라켓 구매·대여 가능 여부
- 대여 Dialog
- 상품·라켓 상세 URL
- 위시리스트 로직
