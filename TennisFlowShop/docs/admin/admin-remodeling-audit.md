# 관리자 리모델링 전수조사

## 조사 범위와 방법

2026-08-13 기준으로 `app/admin`, `components/admin`, `components/ui`, `lib/admin`,
`lib/badge-style.ts`, `app/globals.css`, `tailwind.config.ts`, `package.json`을 정적 조사했다.
`app/admin`의 파일은 176개이며, `components/admin`까지 합치면 215개(이 중 TypeScript/TSX
209개)다. 이번 변경은 기능 재설계가 아니라 공통 기반과 대표 화면의 시각적 계층을
안정화하는 1차 단계다.

## 관리자 라우트와 화면 유형

### 대시보드·업무 허브

- `/dashboard`, `/operations`, `/settlements`, `/reports/revenue`, `/academy`

### 데이터 목록

- `/products`, `/users`, `/rentals`, `/rackets`, `/orders`, `/reviews`, `/boards`
- `/packages`, `/private-payments`, `/community/reports`
- `/academy/classes`, `/academy/applications`, `/applications/stringing`

### 상세·처리

- `/orders/[id]`, `/rentals/[id]`, `/users/[id]`, `/packages/[id]`, `/reviews/[id]`
- `/boards/[id]`, `/academy/classes/[id]`, `/academy/applications/[id]`
- `/applications/stringing/[id]`, `/offline/customers/[id]`
- 주문·대여·교체서비스의 `/shipping-update` 경로

### 등록·수정 폼

- `/products/new`, `/products/[id]/edit`, `/rackets/new`, `/rackets/[id]/edit`
- `/academy/classes/new`, `/academy/classes/[id]/edit`, `/boards/[id]/edit`
- 기존 호환 경로인 `/classes/new`

### 설정·감사·정산·보조 도구

- `/settings`, `/audit`, `/scheduling`, `/packages/settings`
- `/offline`, `/offline/reconciliation`, `/operations/apps-in-toss-reconciliation`

## 기존 공통 컴포넌트 사용 현황

정적 참조 파일 수는 `AdminPageShell` 41개, `AdminPageHeader` 37개,
`AdminPageSection` 14개, `AdminFilterBar` 2개, `AdminDataTable` 19개,
`AdminSemanticBadge` 42개다. `AdminFilterBar`의 낮은 적용률과 직접 `<Table>`을 구성하는
23개 파일이 목록 화면 간 구조 차이의 주요 원인이다. `AdminDataTable`은 마크업을
소유하지 않는 클래스 규격이므로 기존 페이지에 점진 적용하기 적합하지만, 로딩·빈 결과·
페이지네이션 구조는 여전히 각 화면이 책임진다.

## 이번 작업에서 수정한 기반

- `AdminPageHeader`: 기존 기본값을 보존하면서 `compact`, `detail`, `form` 변형을 추가했다.
- `AdminPageShell`: 1280~1440px 구간에서 본문 폭을 더 확보하도록 기본 여백을 줄였다.
- `AdminPageSection`: 내부 섹션의 카드 중첩을 줄일 수 있는 `subtle`, `plain` 변형을 추가했다.
- `AdminFilterBar`: 검색·필터·액션·빠른 필터에 더해 활성 필터 보조 정보를 표현할 수 있게 했다.
- `AdminDataTable`: 표 헤더 높이와 세로 밀도를 고정했다.
- `adminSurface`: 필터와 상세 섹션의 그림자·테두리·배경 대비를 낮췄다.
- 관리자 레이아웃과 사이드바: 권한, 조회, URL, 접힘 상태는 유지하고 레이어와 장식을 단순화했다.

## 대표 적용 화면

- 대시보드는 기존 기본 헤더 계층을 명시적으로 사용한다.
- 운영 업무, 상품 목록, 회원 목록은 `compact` 헤더를 사용한다.
- 상품 신규 등록은 `form` 헤더를 사용한다.
- 상품과 회원 테이블은 공통 `AdminDataTable` 변경을 함께 적용받는다.
- 대여 상세는 이미 `AdminDetailSectionNav`, `AdminNextActionPanel`, `AdminStatusCard`,
  `AdminInfoGrid`, `AdminInternalNotesCard`, `AdminCancelRequestCard`를 사용하고 있어 이번 단계에서는
  데이터·액션이 밀집한 최상위 JSX를 재작성하지 않았다.

## 목록 화면 전파 Step 2-A

- 일반 목록 화면 전파 Step 2-A를 완료했다.
- 실제 수정 화면은 대여 목록, 라켓 목록, 아카데미 클래스 목록, 아카데미 신청 목록이다.
- 네 화면 모두 기존 검색·필터·빠른 보기·액션을 `AdminFilterBar` 슬롯으로 통합했다.
- 네 화면 모두 `AdminPageHeader`의 `compact` 변형을 적용했다.
- API URL, SWR 키와 fetcher, 필터 상태 및 계산, mutation과 확인 절차는 변경하지 않았다.
- 아직 남은 복합 목록 화면은 후기 관리와 게시판 관리다. 후기의 `SWRInfinite`·일괄 작업과
  게시판의 게시글·신고 탭 구조는 Step 2-B에서 각각 보존한 채 전파한다.
- 다음 권장 단계는 Step 2-B 복합 목록 화면이며, 이후 상세 화면 전파를 진행한다.

## 기능 로직 보존 확인

권한 검사, E2E 우회, `/api/admin/navigation-summary` SWR 키, 사이드바 localStorage 키,
관리자 URL과 메뉴 href를 변경하지 않았다. 대표 화면의 fetcher, mutation, 검색 파라미터,
필터 상태, KPI 계산, 폼 validation 및 제출 payload도 변경하지 않았다. 변경은 공통 컴포넌트의
선택적 표현 props와 Tailwind 클래스, 대표 화면의 variant 지정에 한정했다.

## 아직 전파하지 않은 화면과 남은 불일치

- 후기·게시판 관리는 복합 목록 구조를 보존하기 위해 아직 공통 필터 바를 전파하지 않았다.
- 주문·회원·패키지·오프라인 고객 상세에는 `detail` 헤더와 섹션 순서를 전파하지 않았다.
- 상품 수정, 라켓 및 아카데미 폼에는 `form` 헤더와 입력 흐름 규격을 전파하지 않았다.
- 로딩 행, 빈 결과 행, 페이지네이션, sticky 액션 열의 마크업은 화면별 차이가 남아 있다.
- 대형 클라이언트 파일은 기능 회귀를 피하기 위해 상태 훅이나 데이터 가공 함수를 분리하지 않았다.

## 미사용 공통 컴포넌트 후보

`AdminBadgeRow`, `LinkedDocsCard`, `LinkedFlowStageCard`는 정의 파일 외 정적 참조가 확인되지
않았다. 사용량을 늘리기 위해 강제 적용하지 말고 실제 상세 업무에 필요한지 먼저 판단해야 한다.

## 후속 권장 순서

1. Step 2-B에서 후기·게시판의 복합 목록 구조를 보존하며 공통 필터 구조를 전파한다.
2. 대여 상세의 업무 우선순위를 기준으로 주문·교체서비스·회원·패키지 상세를 통일한다.
3. 상품 신규 등록 패턴을 상품 수정에 먼저 맞춘 뒤 라켓과 아카데미 폼으로 확장한다.
4. 정산·오프라인·설정·감사 도구는 마지막에 밀도와 표 규격을 정리한다.
5. 각 단계에서 1280, 1366, 1440, 1536, 1920px을 확인하고 기능 변경과 디자인 변경을 분리한다.
