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

### Step 3-C — 오프라인 고객 상세 적용 및 상세 화면 전수조사

- `/admin/offline/customers/[id]`에 `AdminPageShell wide`, `AdminPageHeader detail`과 실제 카드
  anchor에 연결한 `AdminDetailSectionNav`를 적용했다. 헤더에는 고객명, 전화번호, 전체 고객 ID,
  등록일·최근 방문일·회원 연결 상태와 목록·ID 복사·최근 기록 액션을 배치했다.
- 기본 1열에서 `xl` 이상일 때만 2열이 되도록 본문을 정리하고, 고객 요약과 기본 정보도 좁은
  화면에서 1열로 흐르게 했다. 삭제는 일반 헤더 액션에서 분리해 마지막 위험 작업 섹션으로 옮겼다.
- 고객 기본 정보·연락처·내부 메모, 온라인 회원 검색·연결·해제, 누적 정산 요약, 포인트 처리,
  패키지 조회·판매·환불·사용, 오프라인 작업·매출 이력과 고객 삭제 기능을 보존했다. API URL,
  SWR key·fetcher, mutation, 확인 문구와 데이터 계산은 변경하지 않았다.

### Step 3-D — 아카데미 클래스 상세·아카데미 신청 상세

- 아카데미 클래스 상세와 아카데미 신청 상세에 `AdminPageShell wide`, `AdminPageHeader detail`,
  실제 업무 섹션 anchor에 연결한 `AdminDetailSectionNav`와 반응형 Grid를 적용했다.
- 클래스 상세의 신청 통계·등록 확정 인원 계산과 최근 신청자 Table을 유지했으며, 신청 행 클릭과
  Enter·Space 키보드 상세 이동도 보존했다.
- 신청 상세의 상태 변경, 신청 정보 수정, 클래스 연결·변경, 관리자 메모 저장 mutation과 클래스 자동
  마감 안내, 처리 이력 정렬을 보존했다.
- 두 화면의 API URL, SWR key·fetcher와 응답 타입은 변경하지 않았다.

### Step 3-E — 게시글 상세 완료

- `/admin/boards/[id]`에 detail Header·section nav·반응형 본문/정보 Grid를 적용했다.
- 게시글 서버 조회·404·sanitize 정책과 공개·숨김·수정·삭제 액션을 보존했다.
- 댓글 조회·삭제 mutation을 보존했으며 API URL·fetcher·payload는 변경하지 않았다.
- 현재 활성 관리자 `[id]` 상세 화면은 리모델링 완료했다. `/admin/reviews/[id]`는 목록 redirect이므로
  활성 상세로 세지 않으며, edit 및 shipping-update 경로는 상세가 아니라 등록·수정·배송 폼 범위다.
- 별도 도구·리포트는 아직 남아 있다.
- 다음 단계는 Step 4-A 등록·수정 폼 전수조사 및 대표 상품 수정 화면 정리다.

#### 실제 `[id]` 라우트·클라이언트 전수조사 결과

아래 분류는 `app/admin`의 실제 `[id]/page.tsx`, `[id]/*Client.tsx`,
`[id]/_components/*.tsx`를 확인하고, 라우트가 외부 공용 클라이언트를 렌더하는 경우 그 실제 파일까지
추적한 결과다. 조사만 한 화면은 완료로 간주하지 않는다.

| 분류         | 라우트                                                                                                                 | 실제 렌더 파일과 공통 구조                                                                                                                | 상태         |
| ------------ | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| 완료         | `/admin/orders/[id]`                                                                                                   | `app/features/orders/components/OrderDetailClient.tsx`; Shell·detail Header·section nav 사용                                              | 완료         |
| 완료         | `/admin/applications/stringing/[id]`                                                                                   | `app/features/stringing-applications/components/StringingApplicationDetailClient.tsx`; 관리자 분기에 Shell·detail Header·section nav 사용 | 완료         |
| 완료         | `/admin/rentals/[id]`                                                                                                  | `_components/AdminRentalDetailClient.tsx`; Shell·detail Header·section nav 사용                                                           | 완료         |
| 완료         | `/admin/users/[id]`                                                                                                    | `app/admin/users/_components/UserDetailClient.tsx`; Shell·detail Header·section nav 사용                                                  | 완료         |
| 완료         | `/admin/packages/[id]`                                                                                                 | `PackageDetailClient.tsx`; Shell·detail Header·section nav 사용                                                                           | 완료         |
| 완료         | `/admin/offline/customers/[id]`                                                                                        | `_components/OfflineCustomerDetailClient.tsx`; Step 3-C에서 Shell·detail Header·section nav 적용                                          | 완료         |
| 완료         | `/admin/academy/classes/[id]`                                                                                          | `_components/AcademyClassDetailClient.tsx`; Step 3-D에서 Shell·detail Header·section nav 적용                                             | 완료         |
| 완료         | `/admin/academy/applications/[id]`                                                                                     | `_components/AcademyApplicationDetailClient.tsx`; Step 3-D에서 Shell·detail Header·section nav 적용                                       | 완료         |
| 완료         | `/admin/boards/[id]`                                                                                                   | 서버 `page.tsx`; Step 3-E에서 Shell·detail Header·section nav 적용                                                                        | 완료         |
| 별도 도구    | `/admin/reviews/[id]`                                                                                                  | `page.tsx`는 `/admin/reviews`로 redirect하며 `ReviewDetailClient.tsx`를 렌더하지 않음                                                     | 별도 검토    |
| 등록·수정 폼 | `/admin/products/[id]/edit`, `/admin/rackets/[id]/edit`, `/admin/academy/classes/[id]/edit`, `/admin/boards/[id]/edit` | 각 edit 클라이언트 또는 공용 폼을 렌더                                                                                                    | Step 4 후보  |
| 등록·수정 폼 | `/admin/orders/[id]/shipping-update`, `/admin/applications/stringing/[id]/shipping-update`                             | 각 `ShippingFormClient.tsx` 또는 배송 폼을 렌더                                                                                           | 별도 폼 후보 |

`ReviewDetailClient.tsx`는 실제 파일은 남아 있지만 현재 `[id]` 라우트에서는 사용하지 않으므로 상세
리모델링 완료 화면으로 세지 않는다. 이번 조사에서 새로운 상세 라우트는 추정하거나 추가하지 않았다.
현재 활성 관리자 `[id]` 상세 화면은 리모델링 완료했다. `/admin/reviews/[id]`는 목록 redirect이므로
활성 상세로 세지 않는다. edit 및 shipping-update 경로는 상세가 아니라 등록·수정·배송 폼 범위이며,
별도 도구·리포트는 아직 남아 있다. 다음 단계는 Step 4-A 등록·수정 폼 전수조사 및 대표 상품 수정
화면 정리다.

## 기능 로직 보존 확인

권한 검사, E2E 우회, `/api/admin/navigation-summary` SWR 키, 사이드바 localStorage 키,
관리자 URL과 메뉴 href를 변경하지 않았다. 대표 화면의 fetcher, mutation, 검색 파라미터,
필터 상태, KPI 계산, 폼 validation 및 제출 payload도 변경하지 않았다. 변경은 공통 컴포넌트의
선택적 표현 props와 Tailwind 클래스, 대표 화면의 variant 지정에 한정했다.

## 아직 전파하지 않은 화면과 남은 불일치

- 감사 로그, 사설 결제, 매출 보고, 오프라인 운영은 별도 도구·리포트 분류와 화면 규격 정리가 남아 있다.
- 상품 수정, 라켓 및 아카데미 폼에는 `form` 헤더와 입력 흐름 규격을 전파하지 않았다.
- 로딩 행, 빈 결과 행, 페이지네이션, sticky 액션 열의 마크업은 화면별 차이가 남아 있다.
- 대형 클라이언트 파일은 기능 회귀를 피하기 위해 상태 훅이나 데이터 가공 함수를 분리하지 않았다.

## 미사용 공통 컴포넌트 후보

`AdminBadgeRow`, `LinkedDocsCard`, `LinkedFlowStageCard`는 정의 파일 외 정적 참조가 확인되지
않았다. 사용량을 늘리기 위해 강제 적용하지 말고 실제 상세 업무에 필요한지 먼저 판단해야 한다.

## 후속 권장 순서

1. Step 4-A에서 등록·수정 폼을 전수조사하고 대표 상품 수정 화면을 정리한다.
2. 이후 상품 신규 등록 패턴을 라켓과 아카데미 폼으로 확장한다.
3. 감사 로그, 사설 결제, 매출 보고, 오프라인 운영 등 별도 도구·리포트는 분류 후 밀도와 표 규격을 정리한다.
4. 각 단계에서 1280, 1366, 1440, 1536, 1920px을 확인하고 기능 변경과 디자인 변경을 분리한다.

## Admin UX Reset 1 — 목록 업무 흐름 및 집계 정합성

- 이 작업은 기존 리모델링의 다음 전파 단계가 아니며 관리자 전체 리모델링 완료를 의미하지 않는다.
- 주문관리 사이드바 집계를 원본 주문·신청서 문서 합계에서 주문관리 대표 행 단위로 변경했다.
  연결 주문과 교체서비스 신청서는 한 건, 단독 교체서비스 신청서는 한 건으로 센다. 운영업무는
  주문·대여·단독 교체서비스의 대표 그룹 단위를 유지하고, 중복·누락 연결은 별도 확인 신호로 다룬다.
- 참조 팝오버는 문서 ID·이메일·연결 문서처럼 `copyValue`를 명시한 실제 식별자만 복사한다.
  문서 유형·시나리오·결제 상태·금액과 설명은 표시만 한다.
- 운영업무의 유형별 신호 카드는 기본 접힘 상태로 두고 대표 업무 합계에 더하는 수가 아님을 명시했다.
- 주문 결제 상태는 Semantic Badge로 표시하고, 목록 행은 직접 주 액션 하나와 중복되지 않는 공통
  더보기 메뉴로 구분했다. 상품 목록에는 API가 제공하는 첫 상품 이미지와 이미지 없음 대체물을 복원했다.
- 감사로그 쿼리 기본값과 변환 함수·페이지 초기화 키를 모듈 상수로 고정해 렌더마다 훅 의존성이
  바뀌며 URL 상태가 반복 동기화될 가능성을 제거했다.
- API URL, mutation payload, 결제·주문·재고·대여 가능 수 계산과 상세·등록·수정 화면은 변경하지 않았다.
- 다음 단계는 이 변경의 프리뷰를 사용자가 직접 확인한 뒤 결정하며 Step 4 폼 작업으로 자동 진행하지 않는다.

## Admin UX Reset 2-A — 목록 시각 계층 단순화 및 참조 복사 회귀 수정

- 목록용 `AdminPageHeader`의 카드형 테두리·배경·그림자를 제거하고 제목, 설명, 보조 정보,
  핵심 액션이 자연스럽게 줄바꿈되는 평면 헤더로 정리했다. 상세·폼 변형은 구획을 위한 기존
  surface를 유지하되 그림자를 사용하지 않는다.
- scope와 helper text는 별도 chip 대신 같은 metadata 행에서 구분점으로 나누어 표시한다.
- `AdminFilterBar`는 반투명 카드 대신 `background` 토큰을 사용하는 작은 toolbar surface로
  단순화했다.
- 대여·개인결제·패키지·회원 목록의 참조 팝오버에서 실제 식별자와 연락처에 `copyValue`를
  다시 연결했다. 서비스명, 상태, 금액, 주소처럼 설명 목적인 값은 복사 대상으로 추가하지 않았다.
- API URL, SWR key·fetcher, mutation, 업무 집계와 상태 계산, 권한 및 확인 절차는 변경하지 않았다.

## Admin UX Reset 2-A Completion

- PR #2478은 목록 Header와 FilterBar의 평면화, 일부 식별자·연락처 `copyValue` 복원까지만
  반영된 상태였으며, 이번 보완에서는 누락된 목록 운영 UX 범위만 정리했다.
- `AdminSummaryCard`와 `AdminTaskCard`의 둥근 정도와 그림자·호버 무게를 낮추고, 업무 카드의
  설명과 액션이 실제 콘텐츠 높이와 너비를 사용하도록 변경했다.
- 사이드바 집계는 전체 데이터 수가 아닌 확인·처리 필요 건수임을 `확인 N`으로 명시했다.
- 운영업무의 네 번째 대표 업무 합계 카드를 제거하고 `지금 확인할 업무` 헤더 metadata로 옮겼다.
- 운영업무의 중첩 `details`를 제거해 하나의 `업무 참고` 영역으로 합치고, 업무 유형 신호는
  건수가 있는 항목만 낮은 높이의 compact row로 표시한다.
- 대여 ID 링크와 참조 정보 trigger, 총액과 금액 구성 trigger를 분리하고 행 메뉴의 중복 상세
  액션을 제거했다.
- 개인결제 상태에 Semantic Badge를 적용하고, 행 메뉴의 중복 상세/수정 액션을 제거했다.
- 패키지 축약 ID를 일반 metadata로 바꾸고 별도의 참조 정보 trigger를 제공했다.
- API URL, SWR key·fetcher, 집계, 상태 계산, mutation과 payload는 변경하지 않았다.
- 관리자 전체 디자인, 아카데미·후기·정산·게시판 목록 전파, 오프라인·예약·설정·매출 리포트,
  등록·수정 폼은 완료 범위로 기록하지 않는다.
- 다음 단계는 `Admin UX Reset 2-B: 남은 목록 행 액션·상태 Badge·Popover 전파`다.

## Admin UX Reset 2-B — 아카데미·후기·정산 목록 통일

- 아카데미 클래스와 신청 상태 요약을 현재 상태 Select와 같은 상태를 사용하는 클릭 가능한 필터로
  변경하고, 선택 시 첫 페이지로 돌아가도록 연결했다.
- 클래스 요약 Grid는 기본 2열, `md` 3열, `xl` 5열로, 신청 요약 Grid는 기본 2열, `md` 3열,
  `xl` 6열로 반응형화했다.
- 클래스 수정·숨김·영구 삭제, 취소 신청 삭제, 후기 삭제, 정산 스냅샷 갱신·삭제 행 메뉴를
  `AdminRowActionMenu`로 통일하고 파괴적 작업을 공통 구분선 아래에 배치했다.
- 후기 관리자 공개·숨김 상태는 각각 success·neutral Semantic Badge로 표시하고 기존 Switch를
  유지했으며, 후기 삭제 상태에는 danger Badge를 적용했다.
- API URL, SWR key·fetcher, mutation·payload, 낙관적 업데이트, 일괄 작업과 정산 계산은 변경하지 않았다.
- 관리자 전체 디자인, 게시판·오프라인 관리, 예약·패키지·시스템 설정, 매출 리포트와 등록·수정 폼은
  완료 범위로 기록하지 않는다.
- 다음 단계는 `Admin UX Reset 2-C: 게시판·오프라인·예약·설정·리포트 도구 구조 정리`다.

## Admin UX Reset 2-C — 게시판·예약 설정 및 2-B 잔여 보완

- `AdminRowActionMenu`에 기존 호출부와 호환되는 optional Dropdown/content props를 지원한다.
- 정산 행 메뉴의 `modal=false`, collision padding, close autofocus 방지 옵션을 복구했다.
- 아카데미 클래스 행 메뉴는 실제 동작에 맞게 영구 삭제와 처리·차단 상태를 명시한다.
- 게시판은 API 전체 수와 현재 페이지의 공개·숨김·처리 대기 수를 구분하고, 오해를 유발하던 KPI Card를 제거했다.
- 게시글 제목은 관리자 상세로 통일하고 공개 페이지 이동은 명시적 보조 작업으로 분리했다.
- 게시글 공개·숨김은 공통 행 메뉴로 이동하고, 신고의 직접 주 액션은 완료 하나로 제한했다.
- 신고 반려와 대상 숨김+완료는 각각 공통 메뉴의 일반·위험 작업으로 분리했다.
- 게시글·신고별 Card 중첩을 제거하고 하나의 bordered list surface로 정리했다.
- 예약 설정의 안내·반응형 Grid·목록 장식을 단순화하고 저장 액션을 page-level bar로 이동했다.
- API·SWR·mutation·payload·validation은 변경하지 않았다.
- 관리자 전체 디자인과 오프라인 관리·정합성 도구, 매출 리포트, 패키지 설정, 시스템 설정,
  등록·수정 폼은 완료로 기록하지 않는다.
- 다음 단계는 `Admin UX Reset 2-D: 오프라인·매출 리포트·패키지/시스템 설정 도구 구조 정리`다.

## Admin UX Reset 2-D — 운영 상태·설정·매출 리포트 계층 통일

- 운영업무에서 `결제완료`를 넓은 `결제` 문자열 조건으로 `결제 대기 주문`이라고 오판정하던
  표시 규칙을 제거하고, 결제 확인 필요·신청서 접수 확인·결제 완료·실제 대기 상태를 구분했다.
- workflow와 payment 상태 label을 공백·구분자 차이까지 정규화해 동일 의미 Badge의 중복을
  제거하고, 서로 다른 workflow 상태에는 주문·대여·교체서비스 종류별 semantic tone을 적용했다.
- `통합 주문 다음 단계` 같은 결과가 불명확한 문구를 제거하고 취소 요청, 신청서 접수, 결제 확인,
  실제 조치 문구, 도메인 상세 확인 순서로 운영업무 주 액션 label을 정리했다.
- 운영업무 상세 필터와 preset 결과 Grid를 좁은 화면부터 단계적으로 확장되는 반응형 구조로 바꿨다.
- 게시판에는 게시글의 `검색 결과`, 신고의 `조회 결과` 문구와 실제 게시판·상태·검색어·결과 건수
  metadata를 복구해 현재 필터와 반환 건수의 의미를 함께 확인할 수 있게 했다.
- 예약 설정 저장 bar에는 문서 흐름을 유지하는 sticky bottom 동작을 적용했다.
- 패키지 설정은 Header·상태 bar·Tabs를 단순화하고, 비편집 상품 Card의 반복 surface를 하나의
  정보 계층으로 평탄화했으며, 상품·일반 설정 탭의 저장 action을 각 하단 sticky bar로 통일했다.
- 매출 리포트는 실시간 온라인·오프라인 핵심 매출을 스냅샷보다 먼저 배치하고, 참고 합계·참고
  순매출과 발급 보정·환불·미결제 예외 금액을 핵심 매출과 시각적으로 분리했다.
- 스냅샷의 기준 안내는 기본 접힌 details로, 저장 요약은 compact `<dl>`로, 실시간 차이는 기본
  접힌 details로 정리해 반복 Card의 시각 무게를 줄였다.
- 시스템 설정은 form Header, 탭 metadata, 사용자·이메일 입력 Grid와 저장 상태 표현을 같은
  규칙으로 통일하고, NICEPay 상태·설정 정보·운영 안내를 하나의 조회 전용 surface로 합쳤다.
- API URL, SWR key·fetcher, mutation, request payload, 집계 계산, validation과 저장·테스트
  handler는 변경하지 않았다.
- 관리자 전체 디자인, 오프라인 관리, 오프라인 고객·작업 등록 흐름, 오프라인 매출 요약과 작업
  목록 분리, 등록·수정 폼 전체, 실제 1280/1440/1920 브라우저 최종 QA는 완료 범위가 아니다.
- 다음 단계는 `Admin UX Reset 2-E: 오프라인 관리 신규 작업·기존 작업 흐름 분리`다.

## Admin Table V2 Phase 1 — 주문·대여 행 구조 전면 교체

- PR #2482는 기존 table wrapper를 공통화한 단계였으며 실제 행 정보 구조를 교체한 작업은
  아니었다.
- 주문·대여의 기존 semantic Table 본문을 CSS Grid 기반 list-table hybrid로 교체했다.
- 주문의 6열을 주문·고객, 상품·서비스, 상태·처리, 결제 금액, 다음 작업의 5개 정보 영역으로
  축소했다.
- 대여도 대여·고객, 라켓·기간, 상태·인도·반납, 결제·보증금, 다음 작업의 동일한 5영역 규격을
  적용했다.
- 세로 divider와 sticky action cell을 제거하고 하나의 외곽 surface와 수평 행 구분선만
  사용했다.
- ID·고객·대상·상태·금액·다음 action을 기본 행에 유지했다.
- 연락처·참조·연결 문서·금액 popover trigger를 결과가 명확한 문구로 변경했다.
- 각 행은 primary action 1개와 기존 overflow menu 1개로 통일했다.
- API URL, SWR key·fetcher, mutation, 상태 계산, 정렬 state·server query와 pagination은
  변경하지 않았다.
- 관리자 전체 Table V2, 운영업무·패키지 관리 적용, 상품·라켓·회원 적용과 브라우저 최종 QA는
  이 단계의 완료 범위가 아니다.

다음 단계는 `Admin Table V2 Phase 2: 운영업무·패키지 관리에 검증된 V2 정보 슬롯 적용`이다.

## Admin Table V2 Phase 1.5 — 운영업무 이식 및 행 작업 마감

- 운영업무 legacy Table·sticky action·세로 divider 구조를 AdminListTable V2로 교체했다.
- 주문·대여·운영업무의 별도 상세 확인 버튼을 제거했다.
- 주문·대여는 고객명, 운영업무는 업무 제목을 상세 링크로 사용한다.
- 작업 열은 실제 부가 작업이 있을 때만 더보기 메뉴를 표시한다.
- 더보기 trigger는 접근 가능한 무테 ghost button으로 경량화했다.
- 대여 workflow/payment 동일 Badge 중복을 제거했다.
- 대여 보증금 상태를 보관 중·환불 필요·환불 완료로 구분했다.
- 주문 기본 행에서 F1~F5 내부 flow code를 제거했다.
- 운영·주문·대여·패키지 navigation count 집계 로직은 변경하지 않았다.
- API·SWR·mutation·정렬·pagination은 변경하지 않았다.

다음 단계:

`Admin Table V2 Phase 2 — 패키지 관리 및 나머지 핵심 목록 전파`
