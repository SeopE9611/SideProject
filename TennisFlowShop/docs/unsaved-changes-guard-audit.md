# Unsaved Changes Guard 조사/정책 (2026-03-04, 4차 반영)

## 최종 정책

- 공통 훅 `useUnsavedChangesGuard`는 **beforeunload 전용 최소 책임**만 담당한다.
- 내부 버튼/링크(`router.push`, `router.back`, `history.back`, `Link`)는 **각 페이지 local confirm**으로 처리한다.
- 브라우저/시스템 back(`popstate`)는 전역 interception 없이, **major form에서만 opt-in 훅 `useBackNavigationGuard`** 로 보호한다.
- 모달/다이얼로그(`MessageComposeDialog`, `AdminBroadcastDialog`)는 **전역 back guard 없이 local confirm 우선** 정책을 유지한다.

## 4차 blocker 해결 사항

- `lib/hooks/useBackNavigationGuard.ts`
  - guard가 추가한 history entry를 marker(`__unsavedBackGuard`)로 식별
  - dirty 상태 진입 시 marker entry를 1회만 삽입(중복 push 방지)
  - `popstate`에서 취소 시 marker entry를 재삽입해 현재 페이지 유지
  - dirty 해제/cleanup 시 현재 state가 **내가 만든 marker**일 때만 `history.back()`으로 정리하여 stale entry 잔존 방지
  - 사용자가 back 확인 후 실제 이탈 중인 경우에는 cleanup 정리를 건너뛰어 추가 back 호출 방지
- `app/checkout/page.tsx`
  - 번들 주문의 `수량/스트링 변경` 링크에도 기존 local confirm(`onLeaveCartClick`) 적용

## `useBackNavigationGuard` 최종 동작 원칙

- dirty(`enabled=true`)일 때만 marker entry를 사용한다.
- marker 기반으로 현재 엔트리를 판별해 중복 삽입을 막는다.
- disabled/cleanup 시에는 현재 state가 guard marker인 경우에만 최소 정리를 수행한다.
- 사용자가 뒤로가기를 수락한 실제 네비게이션 흐름에서는 guard 정리 로직이 추가 이탈을 만들지 않게 분기한다.

## opt-in back guard 적용 major form

- `app/services/apply/page.tsx`
- `app/checkout/page.tsx`
- `app/rackets/[id]/_components/RacketPurchaseCheckoutClient.tsx`
- `app/rentals/[id]/checkout/_components/RentalsCheckoutClient.tsx`
- `app/services/packages/checkout/PackageCheckoutClient.tsx`

## 남은 한계 / 후속 확인

- 브라우저/기기별(`iOS Safari`, `Android Chrome`, in-app webview) back stack 처리 차이는 실기기 재검증이 필요하다.
- 관리자 배송 업데이트/반송 폼 4종은 현재 정책상 major form 우선순위에서 제외되어 있으며, 사용자 리포트가 누적되면 opt-in back guard 후보로 재평가한다.

## 조사 명령어

```bash
rg -n "useUnsavedChangesGuard|UNSAVED_CHANGES_MESSAGE|window\.confirm" app lib
rg -n "router\.push|router\.back|history\.back|Link href|popstate" app/<target-files> lib/hooks
```


## 5차 확장 반영 사항 (게시판/리뷰 write·edit opt-in)

- 범위: **긴 글 작성/수정 화면(write/edit)만** `useBackNavigationGuard`를 opt-in으로 확장.
- 유지: 기존 `useUnsavedChangesGuard`(beforeunload)와 각 페이지 local confirm 로직은 그대로 유지.
- 제외: 상세(detail)/댓글(comment)/답글(reply)/신고/토글/모달 계열 화면은 이번 차수에서 미적용.

### 5차 적용 파일

- `app/board/free/_components/FreeBoardWriteClient.tsx`
- `app/board/free/[id]/edit/_components/FreeBoardEditClient.tsx`
- `app/board/gear/_components/FreeBoardWriteClient.tsx`
- `app/board/gear/[id]/edit/_components/FreeBoardEditClient.tsx`
- `app/board/market/_components/FreeBoardWriteClient.tsx`
- `app/board/market/[id]/edit/_components/FreeBoardEditClient.tsx`
- `app/board/notice/write/page.tsx`
- `app/board/qna/write/page.tsx`
- `app/reviews/write/page.tsx`

### 정책 재확인 (변경 없음)

- unload(탭 닫기/새로고침): `useUnsavedChangesGuard`
- internal navigation(버튼/링크): 페이지 local confirm
- browser/system back(popstate): `useBackNavigationGuard` (opt-in)
- 전역 click/popstate interception은 복원하지 않음
