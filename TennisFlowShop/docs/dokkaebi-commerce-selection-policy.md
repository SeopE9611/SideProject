# Dokkaebi Commerce Selection Policy

## Selection flow hierarchy

1. 뒤로가기와 진행 단계
2. 현재 단계 제목·설명
3. 선택한 라켓 요약
4. 검색·재고 필터·보기 방식
5. 결과 수와 다음 단계 안내
6. 스트링 선택 카드
7. 다음 단계 이동

## 실제 사용자 경로

- `/rackets/[id]/purchase`는 별도 구매 폼을 렌더링하지 않고 `/rackets/[id]/select-string`으로 이동합니다.
- `/rackets/[id]/rent`는 라켓 상세 `/rackets/[id]`로 이동하며, 대여 기간을 정한 실제 선택 화면은 `/rentals/[id]/select-string?period=7|15|30`입니다.
- 신규 구매는 `/rackets/[id]/select-string`, 기존 주문 연계는 `/racket-orders/[orderId]/select-string`에서 각각 기존 거래와 query 계약을 유지합니다.
- 리디렉션 전용 route에는 중간 거래 UI를 새로 만들지 않으며, loading도 목적지 화면과 같은 선택 흐름 문법을 사용합니다.

## V2 표면과 상태

- 0~767px에서는 헤더·라켓 요약·툴바 외부 section을 평면 또는 full-bleed로 표시하고, 768px 이상에서 panel radius·전체 border·card 배경·shadow를 복원합니다.
- 선택 대상인 스트링 상품 카드는 유지하되, 카드 내부 색상·게이지·선택값은 구분선과 간격을 우선하고 강한 보조 카드를 반복하지 않습니다.
- 모바일 사용자 조작은 최소 44×44px이며, 768px 이상에서만 필요한 compact 40px을 허용합니다.
- 제목은 `font-ui-bold`, 카드명·선택값·금액·버튼은 `font-ui-medium`, 설명은 `font-ui-regular`를 사용하고 수량·가격·재고·주문번호는 `tabular-nums`를 사용합니다.
- 진행 CTA는 `highlight_soft`, 상세 보기와 스트링 없이 진행은 `outline`, 필터·재시도·더 보기는 `secondary` 또는 `ghost`, 품절·옵션 부족은 neutral disabled를 사용합니다.
- 최초 loading, API error와 재시도, 실제 empty, 검색·재고 조건의 filtered empty, load-more 및 load-more loading을 서로 다른 사용자 상태로 안내합니다. `hasMore`가 남아 있으면 로드된 수를 전체 수로 단정하지 않습니다.
- 새 탭 상세 보기는 `target="_blank"`와 `rel="noopener noreferrer"`를 유지하고 화면 또는 스크린리더 문구로 새 창 열림을 알립니다.
- 실제 화면과 skeleton은 정보 순서, breakpoint별 열, 카드 표면과 모바일 버튼 높이를 일치시킵니다.

## Mobile order

Flow header
Selected racket summary
Search/filter toolbar
Result summary
String cards

## Desktop order

Main

- Flow header
- Search/filter toolbar
- Result summary
- String cards

Sticky aside

- Selected racket
- 수량
- 스트링 없이 진행
- 다음 단계 안내

## CTA

스트링 선택
→ highlight_soft

상세 보기
→ outline

스트링 없이 구매·대여
→ outline

품절·옵션 부족
→ neutral disabled

## Responsive grid

360~575px

- 1열

576~1199px

- 2열

1200~1499px

- 3열

1500px 이상

- 4열

list view는 768px 이상에서 실제 horizontal card를 사용합니다.

## Phase 7B-2A completion notes

- 스트링 list view 카드는 768px 이상에서 `[Media 210px] [Body minmax] [Actions 200px]`의 직접 자식 3열 구조를 사용합니다.
- list skeleton도 실제 카드와 동일한 media/body/actions 구조와 action column border를 유지해 loading 이후 column 이동을 줄입니다.
- 구매 신규·장바구니 수정·대여 스트링 선택 화면은 각각 구체적인 뒤로가기 label과 검증된 내부 경로만 사용합니다.
- 대여 라켓 summary는 라켓명에 한글 브랜드와 모델만 표시하고, meta에는 대여 기간과 상태 label만 표시합니다.
- loading skeleton은 별도 `role="status"` live region으로 구매·대여 로딩 상태를 전달합니다.

## Internal return navigation

장바구니 편집 등 query 기반 복귀 경로는 raw search parameter를 Link href 또는 router.push에 직접 전달하지 않습니다.
모든 return path는 normalizeInternalReturnPath를 통과해야 합니다.

허용:

- 동일 origin의 /로 시작하는 내부 경로
- query와 hash

거부:

- 외부 absolute URL
- protocol-relative URL
- 역슬래시가 포함된 경로
- 제어 문자
- 잘못된 percent encoding

검증 실패 시 flow별 고정 fallback을 사용합니다.
스트링 선택 장바구니 편집의 fallback은 /cart입니다.
