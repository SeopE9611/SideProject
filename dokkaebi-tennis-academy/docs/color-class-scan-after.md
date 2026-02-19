# color-class scan (batch-1)

## 범위
- 1차 대상군 고정: `app/admin`, `app/board`, `app/services`, `app/mypage`
- 치환 규칙
  - `text-gray-*`, `text-slate-*` → `text-foreground` / `text-muted-foreground`
  - `bg-white`, `bg-gray-*`, `bg-slate-*` → `bg-card` / `bg-muted` / `bg-background`
  - `border-gray-*`, `border-slate-*` → `border-border`
  - 버튼 계열의 대표 강조 스타일은 `bg-primary text-primary-foreground`로 정리 (기존 단색 파랑 계열 우선 치환)

## 우선순위 산정 (변경 전 잔존 클래스 수 기준)
### app/admin (총 882)
1. `app/admin/reviews/_components/AdminReviewListClient.tsx` (95)
2. `app/admin/classes/ClassesClient.tsx` (90)
3. `app/admin/packages/[id]/PackageDetailClient.tsx` (81)
4. `app/admin/orders/[id]/loading.tsx` (72)
5. `app/admin/operations/_components/OperationsClient.tsx` (48)

### app/board (총 644)
1. `app/board/qna/[id]/page.tsx` (62)
2. `app/board/page.tsx` (55)
3. `app/board/qna/_components/QnaPageClient.tsx` (53)
4. `app/board/notice/write/page.tsx` (53)
5. `app/board/market/[id]/edit/_components/FreeBoardEditClient.tsx` (49)

### app/services (총 445)
1. `app/services/apply/page.tsx` (105)
2. `app/services/packages/success/page.tsx` (50)
3. `app/services/applications/[id]/shipping/ShippingFormClient.tsx` (50)
4. `app/services/success/page.tsx` (38)
5. `app/services/locations/page.tsx` (31)

### app/mypage (총 33)
1. `app/mypage/profile/_components/ProfileClient.tsx` (11)
2. `app/mypage/MypageClient.tsx` (9)
3. `app/mypage/orders/_components/UserSidebar.tsx` (5)
4. `app/mypage/tabs/ActivityFeed.tsx` (2)
5. `app/mypage/applications/_components/ApplicationsClient.tsx` (2)

## 디렉터리별 재스캔 결과 (batch-1 적용 후)
- 스캔 패턴: `text-(gray|slate)-*`, `bg-white|bg-(gray|slate)-*`, `border-(gray|slate)-*`
- 결과
  - `app/admin`: 잔존 0
  - `app/board`: 잔존 0
  - `app/services`: 잔존 0
  - `app/mypage`: 잔존 0

## 참고 (동일 시점 전체 color-class 스캔)
- 명령: `node scripts/scan-color-classes.mjs app/admin app/board app/services app/mypage`
- scanned files: 284
- total matches: 3901
- 그룹 합계
  - `app/admin`: 1626
  - `app/board`: 775
  - `app/mypage`: 809
  - `app/others`(서비스 포함): 691
