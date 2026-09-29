# Dokkaebi Racket Finder Policy

## Finder hierarchy

1. Finder header
2. Mobile toolbar 또는 desktop filter/results layout
3. Active filters
4. Result cards
5. Responsive Compare Tray

## State ownership

### draft

- 사용자가 아직 적용하지 않은 filter 값

### applied

- API·URL·result에 실제 적용된 filter 값

### compare items

- Finder filter와 독립된 session 상태

## Reset policy

필터 초기화는 비교 목록을 삭제하지 않는다.

비교 목록은:

- 개별 제거
- 모두 삭제

를 통해서만 삭제한다.

## Mobile filter

Header 고정
Filter body scroll
Footer 고정

Footer:

- 초기화
- 검색하기

## Finder card action hierarchy

대표 transaction

- 스트링 선택 후 구매: highlight_soft

대안 transaction

- 스트링 선택 후 대여: outline

Utility

- 상세 스펙
- 비교 담기·해제

## Compare tray

모바일

- 선택된 라켓만 horizontal rail
- 빈 slot 숨김
- 개별 제거 항상 표시
- 최소 2개일 때 비교 가능

768px 이상

- 최대 4개 slot
- 빈 slot 표시 가능

## Deferred scope

Compare page와 Quick View Dialog 내부는
Phase 7B-2B2에서 처리한다.

## Bottom filter sheet

Finder의 Bottom Sheet는 viewport의 최대 88dvh를 사용한다.

CatalogFilterPanelShell을 Bottom Sheet 안에서 사용할 때는
Shell 높이를 부모의 100%로 제한한다.

768px 이상에서 Shell의 기본 100dvh가 Bottom Sheet 높이를
초과하지 않도록 Finder 로컬 wrapper가 높이를 override한다.

## Mobile toolbar

검색 완료 후 모바일 Toolbar 순서:

1행

- 필터
- 정렬

2행

- 결과 수·현재 페이지
- 이전·다음 페이지

검색 전에는 정렬 placeholder와 페이지 이동 버튼을 표시하지 않는다.

## Compare slots

모바일 selected compare item은 168~200px rail item 폭을 사용한다.

768px 이상에서는 max-width 제한을 제거하고
4-column grid의 전체 slot 폭을 사용한다.

## Condition filter

상태 filter label은 condition SSOT를 사용한다.

A (최상급)
B (양호)
C (보통)
