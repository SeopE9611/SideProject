# Dokkaebi Commerce Selection Policy

## Selection flow hierarchy

1. 뒤로가기와 진행 단계
2. 현재 단계 제목·설명
3. 선택한 라켓 요약
4. 검색·재고 필터·보기 방식
5. 결과 수와 다음 단계 안내
6. 스트링 선택 카드
7. 다음 단계 이동

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
