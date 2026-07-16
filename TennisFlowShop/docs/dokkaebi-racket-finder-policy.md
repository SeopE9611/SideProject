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
