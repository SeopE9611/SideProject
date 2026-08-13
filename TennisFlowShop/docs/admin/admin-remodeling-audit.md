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

최초 정적 조사에서는 `AdminFilterBar` 적용률이 낮고 직접 `<Table>`을 구성하는 화면이 많아
목록 화면 간 구조 차이가 컸다. Step 2-A와 Step 2-B에서 일반 목록 화면의 검색·필터 영역을
점진적으로 통합했지만, 복합 목록과 별도 운영 도구까지 모든 관리자 목록에 전파한 상태는 아니다.
`AdminDataTable`은 마크업을 소유하지 않는 클래스 규격이므로 기존 페이지에 점진 적용하기
적합하지만, 로딩·빈 결과·페이지네이션 구조는 여전히 각 화면이 책임진다.

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
- 운영 업무, 상품·주문·회원·패키지 목록은 `compact` 헤더를 사용한다.
- 상품 신규 등록은 `form` 헤더를 사용한다.
- 상품과 회원 테이블은 공통 `AdminDataTable` 변경을 함께 적용받는다.
- 대여 상세는 이미 `AdminDetailSectionNav`, `AdminNextActionPanel`, `AdminStatusCard`,
  `AdminInfoGrid`, `AdminInternalNotesCard`, `AdminCancelRequestCard`를 사용하고 있어 이번 단계에서는
  데이터·액션이 밀집한 최상위 JSX를 재작성하지 않았다.

## 목록 화면 전파 상태

### Step 2-A — 네 화면

- Step 2-A의 실제 수정 범위는 대여 목록, 라켓 목록, 아카데미 클래스 목록,
  아카데미 신청 목록의 네 화면에 한정된다.
- 네 화면은 검색·필터·액션과 활성 조건 요약을 `AdminFilterBar`에 통합하고
  `AdminPageHeader`의 `compact` 변형을 적용했다.
- 대여와 라켓 목록에는 기존 빠른 보기를 `quickFilters` 슬롯으로 옮겼다.
- 아카데미 클래스와 아카데미 신청에는 빠른 보기 슬롯을 적용하지 않았다. 두 화면의 KPI 카드는
  기존 상태 필터 역할을 유지하며, `AdminFilterBar`에는 검색·상태·액션·활성 조건만 배치했다.

### Step 2-B — 주문·회원·패키지

- 주문 목록은 기존 빠른 보기, 통합 검색, 상세 필터, 액션과 적용 조건 요약을
  하나의 `AdminFilterBar`로 통합했다.
- 회원 목록은 `FiltersSection`을 보존하고 그 안의 중복 필터 카드 래퍼를 `AdminFilterBar`로
  교체했다. KPI 빠른 필터와 `BulkActionsSection`은 기존 위치와 역할을 유지한다.
- 패키지 목록은 빠른 보기 카드, 현재 보기 요약, 패키지 찾기 카드를 하나의
  `AdminFilterBar`로 통합했다. KPI와 표는 변경하지 않았다.
- API URL, SWR 키와 fetcher, 필터 상태 및 계산, mutation과 확인 절차는 변경하지 않았다.

### Step 2-C — 복합 목록

- Step 2-C에서 후기 관리와 게시판 관리의 복합 목록 전파를 완료했다.
- 후기 관리는 sticky 검색·관리자 공개 상태·후기 유형·전체 선택·삭제 포함 보기 영역을
  `AdminFilterBar`의 `children`으로 옮기고, 보기 밀도와 정렬은 `actions`, 적용 검색어와
  비기본 필터·선택 수·로드 수·전체 수는 `activeFilters`로 분리했다.
- 후기의 `SWRInfinite` getKey와 페이지 추가 로딩, 커스텀 Grid와 sticky 목록 헤더,
  단건·일괄 작업, 상세·사진·확인 Dialog는 기존 구조와 동작을 보존했다.
- 게시판 관리는 기존 Tabs 위치와 `tab` query 동기화를 유지하고, 게시글·신고 탭에 따라
  유형·상태·검색 조건과 새로고침 액션, 전체 건수 요약이 바뀌는 하나의 `AdminFilterBar`를
  목록 위에 배치했다.
- 게시글 선택 수·복구 불가 안내·선택 삭제는 필터 액션에서 분리해 목록 바로 위의 별도
  선택 작업 바로 유지했으며, 게시글 카드 목록과 신고 목록 및 신고 처리 액션은 보존했다.
- 후기와 게시판의 API URL, SWR key·fetcher, mutation, URL parameter는 변경하지 않았다.
- 이로써 일반 목록과 복합 목록의 공통 필터 구조 전파를 완료했다. 감사 로그, 사설 결제,
  매출 보고, 오프라인 운영 등 별도 도구·리포트와 상세·등록·수정 화면은 완료 범위가 아니다.

### 별도 도구·리포트 분류

- 감사 로그, 사설 결제, 매출 보고, 오프라인 운영은 일반 목록 전파와 분리해
  별도 도구·리포트 목록으로 추후 분류한다.
- 따라서 모든 관리자 목록 화면의 공통 구조 전파가 끝난 것으로 보지 않는다.

## 상세 화면 전파 상태

### Step 3-A — 주문·교체서비스 상세

- 주문 상세의 수동 상단 헤더를 `AdminPageHeader`의 `detail` 변형으로 교체하고, 전체 주문 ID,
  상태·결제 배지, ID 복사, 목록·편집·배송 액션을 기존 조건과 동작 그대로 옮겼다.
- 주문 상세의 수동 섹션 내비게이션을 `AdminDetailSectionNav`로 교체했으며, 기존 섹션 ID와
  취소 요청·교체서비스 조건부 항목을 유지했다.
- 교체서비스 상세는 관리자 분기에만 `AdminPageShell`의 `wide` 변형과
  `AdminPageHeader detail`을 적용하고 중복 폭 제한을 정리했다.
- 교체서비스 관리자 섹션 내비게이션의 항목, 조건, href와 기존 업무 컴포넌트는 유지했다.
- 교체서비스 사용자 분기의 `MypageDetailHero`, `SiteContainer`, 마이페이지 레이아웃과 사용자
  액션은 변경하지 않았다.
- 주문·교체서비스 API URL, SWR key·fetcher, mutation, 상태·결제·연결 계산은 변경하지 않았다.
- 다음 Step 3-B 대상은 회원 상세와 패키지 상세이다. 전체 상세 화면, 오프라인 고객 상세,
  등록·수정 폼과 별도 도구·리포트는 아직 완료 범위가 아니다.

### Step 3-B — 회원 상세·패키지 상세

- 회원 상세와 패키지 상세에 `AdminPageHeader`의 `detail` 변형을 적용하고, 전체 회원·패키지
  ID와 상태 배지 및 기존 목록·편집 액션을 헤더에서 확인할 수 있게 했다.
- 두 화면의 `AdminDetailSectionNav`를 실제 섹션 anchor에 맞게 정리했다.
- 회원 상세의 권한·상태 변경, 세션 조회·정리, 감사 로그, 내부 메모와 확인 절차를 둔 위험 작업을
  보존했다.
- 패키지 상세의 결제·이용권·활성화 상태, 횟수 조정, 만료일 연장, NICE 동기화, 사용 내역 cursor
  pagination과 운영 이력 정렬 로직을 보존했다.
- API URL, SWR key·fetcher와 mutation은 변경하지 않았다.
- 오프라인 고객 상세, 전체 상세 화면, 등록·수정 폼과 감사 로그·사설 결제·매출 보고·오프라인
  운영 도구는 완료 범위가 아니다.
- 다음 권장 단계는 Step 3-C 오프라인 고객 상세 및 남은 상세 화면 조사이며, 이후 Step 4에서
  등록·수정 폼을 진행한다.

## 기능 로직 보존 확인

권한 검사, E2E 우회, `/api/admin/navigation-summary` SWR 키, 사이드바 localStorage 키,
관리자 URL과 메뉴 href를 변경하지 않았다. 대표 화면의 fetcher, mutation, 검색 파라미터,
필터 상태, KPI 계산, 폼 validation 및 제출 payload도 변경하지 않았다. 변경은 공통 컴포넌트의
선택적 표현 props와 Tailwind 클래스, 대표 화면의 variant 지정에 한정했다.

## 아직 전파하지 않은 화면과 남은 불일치

- 감사 로그, 사설 결제, 매출 보고, 오프라인 운영은 별도 도구·리포트 분류와 화면 규격 정리가 남아 있다.
- 오프라인 고객 상세와 그 밖의 남은 상세 화면에는 `detail` 헤더와 섹션 순서를 전파하지 않았다.
- 상품 수정, 라켓 및 아카데미 폼에는 `form` 헤더와 입력 흐름 규격을 전파하지 않았다.
- 로딩 행, 빈 결과 행, 페이지네이션, sticky 액션 열의 마크업은 화면별 차이가 남아 있다.
- 대형 클라이언트 파일은 기능 회귀를 피하기 위해 상태 훅이나 데이터 가공 함수를 분리하지 않았다.

## 미사용 공통 컴포넌트 후보

`AdminBadgeRow`, `LinkedDocsCard`, `LinkedFlowStageCard`는 정의 파일 외 정적 참조가 확인되지
않았다. 사용량을 늘리기 위해 강제 적용하지 말고 실제 상세 업무에 필요한지 먼저 판단해야 한다.

## 후속 권장 순서

1. Step 3-C에서 오프라인 고객 상세와 남은 상세 화면을 조사한다.
2. Step 4에서 상품 신규 등록 패턴을 상품 수정에 먼저 맞춘 뒤 라켓과 아카데미 폼으로 확장한다.
3. 감사 로그, 사설 결제, 매출 보고, 오프라인 운영 등 별도 도구·리포트는 분류 후 밀도와 표 규격을 정리한다.
4. 각 단계에서 1280, 1366, 1440, 1536, 1920px을 확인하고 기능 변경과 디자인 변경을 분리한다.
