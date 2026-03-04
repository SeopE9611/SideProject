# Unsaved Changes Guard 조사/정책 (2026-03-04, 3차 반영)

## 최종 정책

- 공통 훅 `useUnsavedChangesGuard`는 **beforeunload 전용 최소 책임**만 담당한다.
- 내부 버튼/링크(`router.push`, `router.back`, `history.back`, `Link`)는 **각 페이지 local confirm**으로 처리한다.
- 브라우저/시스템 back(`popstate`)는 전역 interception 없이, **major form에서만 opt-in 훅 `useBackNavigationGuard`** 로 보호한다.
- 모달/다이얼로그(`MessageComposeDialog`, `AdminBroadcastDialog`)는 **전역 back guard 없이 local confirm 우선** 정책을 유지한다.

## 3차 신규 도입: opt-in back guard

- `lib/hooks/useBackNavigationGuard.ts`
  - dirty(`enabled=true`)일 때만 현재 URL을 1회 `pushState`
  - `popstate` 발생 시 확인 창 노출
  - 취소 시 현재 페이지 유지(`pushState` 재등록)
  - 확인 시 뒤로가기 허용(`history.back`)
  - document click capture / cleanup `history.back()` 없음

## 3차에서 opt-in back guard 적용한 major form

- `app/services/apply/page.tsx`
- `app/checkout/page.tsx`
- `app/rackets/[id]/_components/RacketPurchaseCheckoutClient.tsx`
- `app/rentals/[id]/checkout/_components/RentalsCheckoutClient.tsx`
- `app/services/packages/checkout/PackageCheckoutClient.tsx`

## 3차에서 local confirm만 보강/유지한 파일

- `app/admin/packages/[id]/PackageDetailClient.tsx`
  - 상단 목록 이동 링크(`/admin/packages`)에 dirty 확인 추가
- `app/admin/rackets/[id]/edit/_components/AdminRacketEditClient.tsx`
- `app/admin/rackets/_components/AdminRacketForm.tsx`
- `app/admin/rackets/new/_components/AdminRacketNewClient.tsx`
- `app/services/apply/page.tsx` (기존 `safePush` 유지)
- `app/checkout/page.tsx` (기존 `onLeaveCartClick` 유지)
- `app/rentals/[id]/checkout/_components/RentalsCheckoutClient.tsx` (기존 `pushIfSafe` 유지)
- `app/services/packages/checkout/PackageCheckoutClient.tsx` (기존 `onLeavePageClick` 유지)

## 이번 3차에서 확인만 하고 변경하지 않은 hook-only 폼

- `app/admin/applications/stringing/[id]/shipping-update/shipping-form.tsx`
- `app/admin/orders/[id]/shipping-update/shipping-form.tsx`
- `app/admin/rentals/[id]/shipping-update/shipping-form.tsx`
- `app/mypage/rentals/[id]/return-shipping/return-form.tsx`

> 사유: 제출 완료 후 이동 중심 플로우이거나, 입력 규모/체류 시간 기준으로 major form 우선순위에서 제외.

## 후속 검토 필요 페이지

- 관리자 배송 업데이트/반송 폼 4종:
  - 모바일 실사용에서 시스템 back 오조작 리스크가 반복 보고되면 opt-in back guard 후보로 재평가
- 향후 신규 체크아웃/신청 대형 폼:
  - `useUnsavedChangesGuard` + local confirm 기본 적용 후, 입력 손실 비용이 큰 경우만 `useBackNavigationGuard` 추가

## 조사 명령어

```bash
rg -n "useUnsavedChangesGuard|UNSAVED_CHANGES_MESSAGE|window\.confirm" app lib
rg -n "router\.push|router\.back|history\.back|Link href|popstate" app/<target-files> lib/hooks
```
