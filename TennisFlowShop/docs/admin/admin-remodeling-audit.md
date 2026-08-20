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
4. 관리자 화면은 고정 데스크톱 운영 정책을 유지한다. 반응형·모바일 UI를 복구하거나 별도
   검증 범위로 추가하지 않고, 현재 지원하는 데스크톱 환경에서 기능 변경과 디자인 변경을
   분리해 확인한다.

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
  목록 분리, 등록·수정 폼 전체와 현재 지원하는 고정 데스크톱 환경의 최종 브라우저 QA는 완료
  범위가 아니다.
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

## Admin Table V2 Phase 2-A — 패키지 관리 목록 전환

- 패키지 관리 목록의 외곽 `Card`와 내부 bordered semantic Table이 중첩된 legacy 구조를
  `AdminListTable` 기반 list-table 구조로 교체했다.
- 기존 `min-w-[1040px]`, 7개 열, 세로 divider, sticky 작업 셀과 별도 `상세` 버튼을 제거했다.
- 목록은 패키지·고객, 이용·기간, 상태·운영 확인, 금액의 4개 정보 영역과 작업 메뉴 1열을
  사용하는 고정 데스크톱 5열 Grid로 구성했다.
- 고객명은 상세 링크로 사용하지 않고 일반 기본 정보로 유지했다.
- 모든 패키지 행에는 실제 이동 작업이 있으므로 52px 일반 작업 열을 유지하고,
  `AdminRowActionMenu`의 `상세보기`를 통해 기존 `/admin/packages/[id]` 상세 화면으로
  이동하도록 구성했다.
- 작업 열에는 sticky positioning을 적용하지 않았으며, 현재 실제 부가 작업이 없는 상태이므로
  더보기 메뉴에는 `상세보기` 한 항목만 제공한다.
- 패키지·고객 영역에는 고객명, 비회원 표시, 패키지 종류, 서비스 유형과 축약 패키지 ID를
  기본 정보로 표시한다.
- 기존의 모호한 `참조 정보` 문구를 `연락처·패키지 참조 보기`로 변경하고 패키지 ID, 이메일,
  전화번호, 패키지 종류와 서비스 유형을 확인할 수 있도록 정리했다.
- 이용 현황과 기간 열을 하나로 합쳐 잔여 횟수·전체 횟수, 서버 `progressPercent` 기준 사용
  진행률, 구매일, 만료일, 이용권 상태와 만료 주의 정보를 같은 영역에 표시한다.
- 사용 진행률은 잔여 비율로 다시 계산하지 않고 기존 서버 값의 의미를 유지해
  `사용 진행 N%`로 표시한다.
- 패스 미발급 상태는 횟수 보조 문구와 이용권 Badge에서 확인하며, 만료 보조 정보에서
  `미발급` 문구가 중복되지 않도록 정리했다.
- 결제 상태와 활성화 상태는 최대 2개의 Semantic Badge로 표시한다.
- 운영 확인 필요 여부는 별도의 세 번째 Badge로 추가하지 않고 첫 번째 확인 사유를 attention
  text로 표시하며, 확인 사항이 없는 행은 `운영 확인 이상 없음`으로 표시한다.
- 금액은 Badge 없이 `AdminMoneyBlock`을 사용해 우측 정렬하고 기존 패키지 결제 금액을
  그대로 표시한다.
- 로딩 행, 빈 결과 행과 페이지네이션은 동일한 5열 구조를 사용하며, 페이지네이션을 목록의
  외부 여백 영역이 아닌 같은 list surface 내부에 배치했다.
- 공통 `AdminListTable.tsx`에는 패키지 전환에 필요한 기능이 이미 존재하므로 변경하지 않았다.
- 관리자 페이지의 반응형·모바일 목록 기능은 복구하지 않았다. 패키지 목록에도 breakpoint별
  열 변경, 모바일 카드 전환 또는 별도 반응형 행 구조를 추가하지 않았다.
- 패키지 API URL, SWR key·fetcher, 검색과 필터 state, URL query 동기화, 빠른 보기, 정렬,
  총 건수와 KPI 계산, 이용권·결제·활성화·운영 확인 계산, 페이지네이션 로직과 상세 URL은
  변경하지 않았다.

## Admin Table V2 Phase 2-B — 상품 관리·라켓 관리 catalog-list 전환

Phase 2-B는 카탈로그 성격이 같은 상품 관리와 라켓 관리를 대상으로 진행했으며, 두 화면의
데이터 구조와 실제 행 작업 차이를 고려해 Phase 2-B1과 Phase 2-B2로 분리해 적용했다.

### Phase 2-B1 — 상품 관리 목록 전환

- 상품 관리 목록의 외곽 `Card`와 내부 bordered semantic Table이 중첩된 legacy 구조를
  `AdminListTable` 기반 catalog-list 구조로 교체했다.
- 기존 `min-w-[720px]`, sticky 관리 열, Table 전용 정렬 헤더와 마지막 페이지 filler 행을
  제거했다.
- 목록은 상품, 분류·옵션, 가격, 판매·재고의 4개 정보 영역과 작업 1열을 사용하는 고정
  데스크톱 5열 Grid로 구성했다.
- 상품 영역에는 썸네일, 상품명과 SKU를 표시하고 상품명 자체에는 상세 링크를 적용하지 않았다.
- 분류·옵션 영역에는 브랜드, 재질, 게이지와 추천·신상품·할인 속성을 함께 표시하고, 별도
  노출 속성이 없는 상품은 `기본 노출`로 표시했다.
- 할인 상품은 할인 설정이 활성화돼 있고 할인가가 0원보다 크며 정상가보다 낮을 때만 할인가를
  사용한다.
- 유효한 할인 상품은 `AdminMoneyBlock`에 할인가를 기본 금액으로 표시하고 정상가는 보조
  정보로 표시했다.
- 판매·재고 영역에는 판매중·재고 부족·품절 상태, 현재 재고 수량과 스토어 숨김 여부를 함께
  표시했다.
- 상품명, 가격과 재고의 기존 서버 정렬 기능을 유지했으며 Grid 헤더에 맞는 정렬 버튼으로
  교체했다.
- 작업 영역에는 자주 사용하는 `수정` 버튼을 직접 표시하고 `AdminRowActionMenu`에는 공개
  `상세 보기` 또는 숨김 상품의 `관리자 미리보기`, `삭제`를 제공했다.
- 기존 삭제 API, 삭제 확인 Dialog와 삭제 후 목록 갱신 흐름은 변경하지 않았다.
- 서버 페이지네이션은 유지하고 이전·다음 버튼을 동일한 list surface 내부에 배치했다.
- 마지막 페이지의 남은 공간을 가짜 행으로 채우던 filler row는 제거하고 실제 상품 행만
  표시하도록 변경했다.
- 상품 API URL, SWR fetcher, 검색 디바운스, 브랜드·재질·재고·노출 필터, 빠른 보기, KPI,
  정렬 query와 총 건수 계산은 변경하지 않았다.

### Phase 2-B2 — 라켓 관리 목록 전환

- 라켓 관리 목록의 외곽 `Card`, 내부 bordered Table, sticky 관리 열과 Table primitive를
  제거하고 `AdminListTable` 기반 catalog-list 구조로 교체했다.
- 목록은 라켓, 등급·노출, 가격, 판매·대여·재고의 4개 정보 영역과 작업 1열을 사용하는 고정
  데스크톱 5열 Grid로 구성했다.
- 라켓 영역에는 썸네일, 브랜드와 모델명을 표시하고 브랜드나 모델명 자체에는 상세 링크를
  적용하지 않았다.
- 등급·노출 영역에는 기존 A·B·C 상태 등급과 추천·신상품·할인 속성을 함께 표시하고, 별도
  노출 속성이 없는 라켓은 `기본 노출`로 표시했다.
- 라켓 할인 가격도 할인 설정 활성화, 0원 초과, 정상가 미만의 세 조건을 모두 만족할 때만
  사용한다.
- 기존 `RacketAvailabilityCell`은 `<TableCell>`까지 반환하는 구조였으므로 Grid 목록에서
  재사용할 수 있도록 `RacketAvailabilityContent`로 변경했다.
- `RacketAvailabilityContent`는 셀 외곽 구조를 소유하지 않고 판매·대여 상태 Badge, 재고
  보조 문구와 스토어 숨김 attention text만 반환하도록 정리했다.
- 각 행의 `/api/admin/rentals/active-count/[id]` 조회, 대여 가능 수량 계산,
  `getRacketAvailabilityState()` 상태 판정과 재고 문구 분기는 변경하지 않았다.
- 판매·대여·재고 영역에는 구매 가능, 구매·대여 가능, 대여 중, 판매 완료, 현재 이용 불가,
  재고 상태와 스토어 숨김 여부를 함께 표시했다.
- 작업 영역에는 `수정` 버튼을 직접 표시하고 `AdminRowActionMenu`에는 공개 `상세 보기` 또는
  숨김 라켓의 `관리자 미리보기`를 제공했다.
- 라켓 목록에 기존에 없던 삭제, 정렬 또는 페이지네이션 기능을 새로 추가하지 않았다.
- 라켓 API URL, `page=1`, `pageSize=50`, 검색, 상태·등급·노출 필터, 빠른 보기, KPI와
  클라이언트 등급 필터는 변경하지 않았다.

### Phase 2-B 공통 결과

- 상품 관리와 라켓 관리가 같은 catalog-list 시각 언어를 사용하도록 통일했다.
- 두 목록 모두 기본 정보, 카탈로그 속성, 가격, 운영 상태와 실제 작업의 우선순위가 한 행에서
  명확하게 구분된다.
- 상세 이동은 상품명이나 라켓명에 숨겨진 링크로 제공하지 않고 작업 메뉴의 `상세 보기` 또는
  `관리자 미리보기`로 명시했다.
- 실제로 자주 사용하는 `수정`은 직접 노출하고, 보조 이동과 위험 작업은 더보기 메뉴에
  분리했다.
- 공통 `AdminListTable.tsx`에는 두 화면에 필요한 primitive가 이미 존재하므로 변경하지
  않았다.
- 관리자 페이지의 반응형·모바일 목록 기능은 복구하지 않았다. 상품과 라켓 목록 모두
  breakpoint별 열 변경, 모바일 카드 전환 또는 별도 반응형 행 구조를 추가하지 않았다.
- 배포 화면에서 상품과 라켓 목록의 열 배치, 정보 밀도, 상태 표현, 가격 정렬과 작업 영역이
  의도한 catalog-list 구조로 표시되는 것을 확인했다.

## Admin Table V2 Phase 2-C — 회원 관리 account-ledger 전환

- 회원 관리의 기존 7열 semantic Table, `min-w-[1020px]`, 가로 스크롤 wrapper,
  sticky 작업 열과 Table 전용 열 폭 정의를 제거했다.
- 회원 목록을 선택, 회원·계정, 연락처·주소, 활동·포인트, 권한·상태, 작업의 고정
  데스크톱 6열 `AdminListTable` 구조로 전환했다.
- 회원 목록은 상품·라켓 catalog-list와 달리 행 선택과 일괄 작업 기능이 있으므로 선택
  Checkbox를 독립된 첫 번째 열로 유지했다.
- 회원·계정 영역에는 회원명, 이메일, 카카오·네이버·Apps in Toss 가입 경로와
  `계정 참조 보기`를 배치했다.
- 계정 참조 Popover에는 회원 ID, 이메일, 가입 경로와 Apps in Toss 연결 여부를 표시했다.
- 회원명 자체에는 상세 링크를 적용하지 않고, 상세 이동은 작업 열의 명시적인 `상세`
  버튼으로 유지했다.
- 연락처·주소 영역에는 전화번호, 축약 주소와 `전체 연락처 보기`를 배치했다.
- 연락처 Popover에는 이메일, 전화번호와 전체 주소를 표시하고 기존 전화 링크와 복사 기능을
  유지했다.
- 활동·포인트 영역에는 최근 로그인, 가입일과 보유 포인트를 우측 정렬해 함께 표시했다.
- 보유 포인트는 회원 목록 API가 이미 반환하는 `pointsBalance`를 그대로 사용했으며 별도
  조회나 재계산을 추가하지 않았다.
- 권한과 계정 상태를 각각 독립된 열로 사용하던 구조를 하나의 권한·상태 영역으로 통합했다.
- 권한·상태 영역에는 일반·관리자·최고 관리자 역할 Badge와 활성·비활성·삭제됨 상태 Badge를
  최대 두 개까지 표시한다.
- 목록에서 권한 변경, 행별 활성화·비활성화 또는 삭제 기능을 새로 추가하지 않았다.
- 작업 영역에는 주요 작업인 `상세` 버튼을 직접 노출하고, `AdminRowActionMenu`에는
  `포인트 내역/조정`만 유지했다.
- 기존 포인트 Dialog 호출, 회원 상세 URL과 `preventDefault()` 처리는 변경하지 않았다.
- 로딩 8행, 조회 오류와 빈 결과 상태를 새로운 6열 Grid 구조에 맞게 변경했다.
- 필터가 적용된 빈 결과와 전체 데이터가 없는 상태의 안내 문구를 구분했다.
- 기존 페이지네이션 계산과 첫 페이지·이전·페이지 번호·다음·끝 페이지 동작은 유지하고,
  페이지네이션을 별도 외부 영역이 아닌 동일한 list surface 내부에 배치했다.
- route loading skeleton의 열 수를 기존 7열에서 실제 목록과 동일한 6열로 변경했다.

### 목록 응답 타입 정합성

- `useUserList.ts`에 중복 선언돼 있던 `UserListItem`, `UserListResponse` 지역 타입을 제거했다.
- 회원 목록 API의 공식 응답 계약인 `AdminUsersListResponseDto`를 SWR 제네릭으로 직접
  사용하도록 변경했다.
- 공식 DTO의 `items`를 별도 타입 단언 없이 사용하고, 조회 미확정·오류 상태에서는 기존처럼
  `rows`를 `null`로 유지했다.
- `UsersClient.tsx`의 `UsersListCounters`, `UsersListPayload` 지역 타입을 제거하고
  `data?.counters`를 직접 사용하도록 변경했다.
- API가 제공하는 `pointsBalance`, `counters`, `updatedAt`과 클라이언트 목록 타입의 불일치를
  제거했다.
- API URL, projection, DB query와 응답 데이터 계산은 변경하지 않았다.

### 선택 Checkbox 수정

- Radix Checkbox 내부에서 존재하지 않는 `input[type="checkbox"]`를 찾아 부분 선택 상태를
  설정하던 `useRef`와 `useEffect` 기반 DOM 조작을 제거했다.
- 현재 페이지의 일부 회원만 선택됐을 때 Checkbox의 공식
  `checked="indeterminate"` 상태를 직접 전달하도록 변경했다.
- 전체 선택 Checkbox의 접근성 문구를 `현재 페이지 회원 전체 선택`으로 명확하게 변경했다.
- 공통 Checkbox 컴포넌트에 indeterminate 상태의 배경 스타일과 `Minus` 아이콘을 추가했다.
- 최종 화면에서 선택된 회원 행은 체크 아이콘, 헤더 전체 선택 Checkbox는 가로선 아이콘으로
  서로 다른 상태가 정상 표시되는 것을 확인했다.

## Admin Table V2 Phase 2-D1 — 아카데미 클래스·신청 관리 목록 전환

Phase 2-D1에서는 아카데미 클래스 관리와 아카데미 신청 관리에 남아 있던 legacy semantic
Table을 `AdminListTable` 기반의 고정 데스크톱 목록으로 전환했다.

PR #2489에서 기존 Table primitive, 가로 스크롤과 sticky 작업 열을 제거했으나 기존 7열
정보 구조가 그대로 유지됐다. PR #2492에서 관련 정보를 하나의 업무 영역으로 묶어 두 목록을
확정된 5열 구조로 통합했다.

### 아카데미 클래스 관리

- 기존 등록일, 클래스, 수업 정보, 운영 정보, 신청 현황, 가격·상태, 관리의 7열을 다음
  5열로 통합했다.
  - 클래스
  - 수업 / 운영
  - 신청 / 정원
  - 가격 / 상태
  - 작업
- 독립된 등록일 열을 제거하고 클래스명, 설명과 함께 `AdminListPrimary`의 metadata로
  이동했다.
- 클래스명 자체에는 상세 링크를 적용하지 않고 작업 열의 명시적인 `상세 보기` 버튼을
  유지했다.
- 수업 유형, 레벨, 강사, 일정과 장소를 하나의 수업·운영 영역으로 통합했다.
- 값이 없는 강사, 일정과 장소는 각각 `강사 미입력`, `일정 미입력`, `장소 미입력`으로
  표시한다.
- 일정은 최대 두 줄, 강사와 장소는 열 너비 안에서 줄임표로 표시해 인접 열 침범을
  방지했다.
- 기존 `ApplicationStatsCell`을 유지해 전체 신청, 확정 인원과 정원을 동일한 계산으로
  표시한다.
- 가격과 공개 상태를 `AdminMoneyBlock`으로 통합하고 기존 가격 formatter와 상태 Badge의
  semantic tone을 유지했다.
- 작업 영역에는 `상세 보기`를 outline 버튼으로 직접 노출했다.
- 수정과 숨김 처리는 일반 `AdminRowActionMenu`, 영구 삭제는 파괴적 작업 영역에 유지했다.
- 취소되지 않은 신청이 존재하는 클래스의 영구 삭제 차단과 삭제 불가 안내를 유지했다.
- 이미 숨김 상태이거나 숨김 처리가 진행 중인 클래스의 중복 처리 방지 조건을 유지했다.

### 아카데미 신청 관리

- 기존 접수일, 신청자, 선택 클래스, 희망 정보, 선호 일정, 상태, 관리의 7열을 다음
  5열로 통합했다.
  - 신청자 / 접수
  - 클래스 / 희망 수업
  - 선호 일정
  - 상태
  - 작업
- 독립된 접수일 열을 제거하고 신청자명, 이메일, 전화번호와 함께 `AdminListPrimary`에
  배치했다.
- 신청자명 자체에는 상세 링크를 적용하지 않고 작업 열의 명시적인 `상세 보기` 버튼을
  유지했다.
- 기존 `SelectedClassCell`의 선택 클래스 정보를 유지하고 그 아래에 희망 수업 유형과
  현재 레벨을 추가했다.
- 클래스가 연결되지 않은 일반 레슨 신청은 기존 `클래스 미선택`,
  `일반 레슨 신청 · 연결 필요` 문구를 유지한다.
- 희망 요일과 희망 시간을 같은 셀의 별도 행으로 배치하고 긴 값은 최대 두 줄 또는
  줄임표로 제한했다.
- 신청 상태는 기존 `AcademyStatusBadge`를 `AdminStatusGroup` 안에 배치해 다른 V2
  목록과 동일한 상태 표현 구조를 사용한다.
- 상세 버튼의 장식용 `Eye` 아이콘과 `ghost` variant를 제거하고 outline 버튼으로
  직접 노출했다.
- 삭제 메뉴는 기존과 동일하게 `cancelled` 상태의 신청에만 표시한다.
- 진행 중 신청에는 삭제 메뉴를 추가하지 않았으며 기존 삭제 확인 Dialog와 mutation
  동작을 유지했다.

### 목록 상태와 페이지네이션

- 제출된 검색어가 존재하면 현재 보기를 `검색 결과`로 표시한다.
- 검색어가 없고 전체 상태이면 각각 `전체 클래스`, `전체 신청`으로 표시한다.
- 상태 필터가 적용되면 현재 보기 영역에 해당 상태명을 표시한다.
- 오류, 로딩, 빈 결과와 실제 데이터가 동시에 표시되지 않도록
  `error → isLoading → empty → data` 순서의 단일 조건 분기로 정리했다.
- 전체 데이터가 없는 상태와 검색·상태 필터 결과가 0건인 상태의 안내 문구를 구분했다.
- 로딩 상태는 실제 5열 구조를 반영한 Skeleton 6행으로 변경했다.
- 오류와 빈 결과 행은 실제 열 수와 동일한 `col-span-5`를 사용한다.
- 기존 이전·다음 버튼, 현재 페이지, 전체 페이지와 총 건수 계산은 유지했다.
- 페이지네이션을 목록 외부에서 제거하고 `AdminListBody` 다음의 동일한
  `AdminListTable` surface 내부에 배치했다.
- 페이지네이션의 접근성 열 수를 실제 구조와 동일한 `aria-colspan={5}`로 변경했다.

### 보존한 기능

- `LIMIT=20`
- SWR key와 `adminFetcher`
- 검색어 제출과 필터 초기화
- KPI 상태 필터와 첫 페이지 초기화
- 서버 페이지네이션 계산
- 클래스 상세·수정 이동
- 클래스 숨김과 영구 삭제
- 진행 중 신청이 있는 클래스의 삭제 차단
- 신청 상세 이동
- 취소 신청 삭제
- toast와 확인 Dialog
- API URL, HTTP method와 mutation payload
- 날짜, 가격, 상태와 정원 formatter
- 클래스와 신청의 상세·등록·수정 화면

### 변경하지 않은 범위

- 새 API 또는 DTO
- 새 정렬 기능
- 전체 선택과 일괄 작업
- 인라인 상태 변경
- 공통 `AdminListTable.tsx`
- 모바일 카드 목록
- breakpoint별 열 변경
- sticky 작업 열

### 검증 결과

- 변경 파일은 다음 두 파일로 제한했다.
  - `app/admin/academy/classes/_components/AcademyClassesClient.tsx`
  - `app/admin/academy/applications/_components/AcademyApplicationsClient.tsx`
- 두 화면에서 기존 7열 Grid, `col-span-7`, `aria-colspan={7}`을 제거했다.
- 두 화면에 확정된 5열 Grid, `AdminListPrimary`, `AdminRowActions`,
  `col-span-5`와 `aria-colspan={5}`를 적용했다.
- 클래스 목록에는 `AdminMoneyBlock`, 신청 목록에는 `AdminStatusGroup`을 적용했다.
- 클래스 숨김·삭제 보호 조건과 취소 신청 삭제 제한을 유지했다.
- `pnpm typecheck`는 앱과 Cypress TypeScript 설정 모두 종료 코드 0으로 통과했다.
- `git diff --check`는 공백 오류 없이 통과했다.
- lint, build, 테스트, Cypress와 Playwright는 실행하지 않았다.

### Phase 2-D1 최종 결과

- 아카데미 클래스와 신청 관리가 기존 7열 Table의 정보를 단순히 Grid로 옮기는 수준을
  벗어나 관련 업무 정보를 묶은 5열 V2 목록 구조를 사용하게 됐다.
- 등록일과 접수일은 독립 열에서 기본 정보 metadata로 이동했다.
- 클래스의 수업·운영 정보와 신청의 클래스·희망 수업 정보가 각각 하나의 업무 영역으로
  통합됐다.
- 자주 사용하는 상세 이동은 직접 노출하고 보조 작업과 파괴적 작업은 더보기 메뉴에
  분리했다.
- 관리자 페이지의 반응형·모바일 목록 기능은 복구하지 않았다.
- 두 목록 모두 고정 데스크톱 5열 구조를 사용한다.

다음 단계는 `Admin Table V2 Phase 2-D2 — 관리자 감사 로그 목록 전환`이다.
