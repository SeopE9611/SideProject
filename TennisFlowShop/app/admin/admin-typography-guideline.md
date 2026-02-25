# 관리자 타이포 정리 가이드 (2026-02)

## 1) 수집 범위와 결과

수집 범위:
- `app/admin/**`
- `components/admin/**`

수집 패턴:
- `text-[10px]`
- `text-[11px]`
- `text-xs text-muted-foreground`

집계 결과:
- 총 148건
- `text-xs text-muted-foreground`: 110건
- `text-[11px]`: 30건
- `text-[10px]`: 8건

집중 파일(상위):
- `app/admin/operations/_components/OperationsClient.tsx` (20)
- `app/admin/rentals/_components/AdminRentalsClient.tsx` (17)
- `app/admin/dashboard/_components/AdminDashboardClient_view.tsx` (13)
- `app/admin/users/_components/UsersClient.tsx` (11)
- `app/admin/users/_components/UserDetailClient.tsx` (10)

## 2) 중요도 재분류 기준

### P1 (높음): 본문/핵심 데이터
- 정의: 표의 주요 셀 값, 사용자가 바로 판단해야 하는 본문 라벨
- 규칙: `text-sm` 이상으로 승격 (최소 본문 크기)
- 대표 패턴: `text-[10px]`, `text-[11px]`가 본문에 사용된 경우

### P2 (중간): 메타/보조 정보
- 정의: 보충 설명, 날짜/부가 상태, 툴팁 보조 문구
- 규칙: `text-xs` 허용 + `text-foreground/80` 또는 `text-muted-foreground`
- 대표 패턴: `text-xs text-muted-foreground`

### P3 (높음): 경고/주의 문구
- 정의: 누락, 확인 필요, 위험 알림
- 규칙: `text-primary` 또는 `text-warning`로 승격
- 예시: 연결 누락, 정책 유의사항, 조치 유도 문구

## 3) 관리자 전용 타이포 기준

- 최소 본문 크기: `text-sm`
- 메타: `text-xs` 허용
  - 색상은 기본 `text-foreground/80` 또는 `text-muted-foreground` 중 대비 기준 충족값 사용
- 경고/주의:
  - `text-primary` 또는 `text-warning`
  - 필요 시 `font-medium`을 함께 사용해 스캔성 강화

## 4) 공용 토큰 적용 범위

`components/admin/admin-typography.ts`를 신설하고 다음 공용 컴포넌트에 적용:
- 배지: `StatusBadge`, `AdminBadgeRow`
- 패널: `Section`
- 사이드바: `AdminSidebar`

토큰 예시:
- 본문: `adminTypography.body`
- 메타: `adminTypography.meta`, `adminTypography.metaMuted`
- 경고: `adminTypography.caution`, `adminTypography.warning`
- 사이드바 섹션/카운트/푸터: `adminTypography.sidebarSection`, `adminTypography.sidebarCount`, `adminTypography.sidebarFooter`

## 5) 후속 권장 작업

1. `P1` 파일부터 `text-[10px]`, `text-[11px]`를 `text-sm` 기준으로 우선 교체.
2. `P2` 문구는 `text-xs` 유지하되 대비를 `text-foreground/80` 우선으로 정렬.
3. `P3` 문구는 의미상 경고인지 점검 후 `text-primary`/`text-warning`로 일괄 승격.
4. 신규 관리자 화면은 하드코딩 대신 `adminTypography` 토큰만 사용.
