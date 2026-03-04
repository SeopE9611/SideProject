# Unsaved Changes Guard 조사/정책 (2026-03-04, 2차 재수정 반영)

## 최종 정책

- 공통 훅 `useUnsavedChangesGuard`는 **beforeunload 전용 최소 책임**만 담당한다.
- `router.push`, `router.back`, `history.back`, 페이지 내 취소/목록 이동은 **각 페이지 local confirm**으로 처리한다.
- 모달/다이얼로그(`MessageComposeDialog`, `AdminBroadcastDialog`)는 **전역 guard 없이 local confirm 우선** 정책을 유지한다.
- 성공 페이지의 뒤로가기 정책은 동일 패턴(더미 `pushState` + `popstate`에서 홈으로 치환)으로 일관성을 맞춘다.

## 1차 수정 후 남은 hook-only 위험 지점(2차 작업 전)

다음 파일은 `useUnsavedChangesGuard`를 쓰지만 내부 이동 액션에 local confirm이 없어서 회귀 위험이 있었다.

- `app/admin/classes/new/NewClassClient.tsx`
- `app/admin/users/_components/UserDetailClient.tsx`
- `app/forgot-password/page.tsx`
- `app/mypage/profile/_components/ProfileClient.tsx`
- `app/reset-password/page.tsx`
- `app/services/apply/page.tsx`

## 2차에서 local confirm 보강한 파일

- `app/admin/classes/new/NewClassClient.tsx`
  - 목록 링크/취소(`window.history.back`)에 `confirmLeaveIfDirty` 적용
- `app/admin/users/_components/UserDetailClient.tsx`
  - 상단 `router.back()` 액션에 dirty 확인 추가
- `app/forgot-password/page.tsx`
  - 로그인 복귀 링크 클릭 시 dirty 확인 추가
- `app/mypage/profile/_components/ProfileClient.tsx`
  - 마이페이지 복귀 링크 클릭 시 dirty 확인 추가
- `app/reset-password/page.tsx`
  - 로그인 복귀 링크 클릭 시 dirty 확인 추가
- `app/services/apply/page.tsx`
  - 분기 이동 버튼(`router.push`)을 `safePush`로 래핑해 dirty 확인 추가

## success BackButtonGuard 정책 비교

- `app/checkout/success/_components/BackButtonGuard.tsx`
  - `pushState`로 현재 URL 1회 추가 + `popstate`에서 `router.replace('/')`
- `app/services/_components/BackButtonGuard.tsx`
  - 1차에서 제거됐던 `pushState`를 복구하여 checkout success와 동작 정책을 통일

## 이번 범위에서 확인한 “변경 없음” 파일

아래는 `useUnsavedChangesGuard`를 사용하지만, 이번 2차 범위 기준으로 제출 후 이동 외 별도 취소/내부 이동 포인트가 뚜렷하지 않아 추가 변경하지 않았다.

- `app/admin/applications/stringing/[id]/shipping-update/shipping-form.tsx`
- `app/admin/orders/[id]/shipping-update/shipping-form.tsx`
- `app/admin/rentals/[id]/shipping-update/shipping-form.tsx`
- `app/mypage/rentals/[id]/return-shipping/return-form.tsx`
- `app/rackets/[id]/_components/RacketPurchaseCheckoutClient.tsx`

## 조사 명령어

```bash
rg -n "useUnsavedChangesGuard" app lib
rg -n "router\.push|router\.back|history\.back|window\.history\.back|Link href" app/<target-files>
rg -n "window\.confirm|UNSAVED_CHANGES_MESSAGE" app/<target-files>
```
