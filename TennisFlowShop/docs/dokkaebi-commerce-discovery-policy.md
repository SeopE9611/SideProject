# Dokkaebi Commerce Discovery Policy (V2.2 Catalog Responsive Final Polish)

## 결과·툴바 구성

결과 요약과 toolbar의 구조는 도메인별 정보 밀도에 따라 달라질 수 있으나, catalog 결과 영역은 다음 순서를 기본으로 한다.

상품 목록:
- compact 결과 요약 카드
- 별도 toolbar 카드
- 활성 필터 별도 카드

라켓 목록:
- compact 결과 요약 카드
- 별도 toolbar 카드
- 활성 필터 별도 카드

## Catalog summary

Catalog summary는 header와 content를 분리하지 않는 single-surface 구조를 사용한다.

- eyebrow
- title
- description
- count

를 하나의 content 영역에 배치한다.

모바일에서는 세로 stack, 768px 이상에서는 설명과 count를 좌우 배치할 수 있다.

유지 문구:

상품:
- 스트링 상품
- 플레이 성향과 성능, 가격 조건을 조합해 원하는 스트링을 찾아보세요.

라켓:
- 라켓 목록
- 브랜드, 상태, 가격대와 대여 가능 여부를 조합해 원하는 라켓을 찾아보세요.

## Product toolbar

768px 이상:
- 왼쪽: 필터와 quick filter
- 오른쪽: 품절 제외, view, sort
- 한 줄을 우선한다.
- 공간이 부족하면 왼쪽 rail만 overflow할 수 있다.

767px 이하:
- 첫 행: 필터 + 정렬
- 두 번째 행: 추천, 신상품, 할인상품, 품절 제외
- quick filter는 compact horizontal rail
- view toggle은 숨긴다.

## Racket toolbar

768px 이상:
- 필터 왼쪽
- view와 sort 오른쪽

767px 이하:
- 필터 + 정렬
- view toggle 숨김

## 반복 카드 기준

분리된 카드가 각각 명확한 역할을 가질 경우 허용한다.

- 결과 카드: 결과 수와 조회 상태
- toolbar 카드: 필터·정렬·보기 조작
- active filter 카드: 현재 적용 조건과 해제

## Quick filter 모바일 기준

짧은 quick filter가 3~4개일 경우 compact horizontal group을 우선한다.

- 버튼을 큰 2열 grid로 확대하지 않는다.
- 360px에서만 필요한 경우 horizontal overflow를 허용한다.
- 기능이 숨겨졌다는 인상을 줄이지 않도록 버튼 일부가 충분히 보이게 한다.
- 품절 제외는 모바일 quick filter rail 마지막에 배치한다.
- 정렬은 첫 행에서 필터와 함께 배치한다.

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
