# Admin `any` 제거 계획 (우선순위/규칙/주간 목표)

## 1) 우선순위 분류 기준
- **P0 (결제/정산/상태변경)**: `app/api/admin` 내 결제, 정산, 상태 전이, 취소/환불, 운영 큐 관련 로직.
- **P1 (기타 API)**: `app/api/admin` 내 조회/리스트/보조 API.
- **P2 (조회 UI)**: `app/admin`, `components/admin` 클라이언트 UI.

> 최신 카운트는 `pnpm report:admin-any` 기준.

### 현재 스냅샷
- 전체: **191건**
- P0: **32건**
- P1: **84건**
- P2: **75건**

### 주요 집중 파일
1. `app/api/admin/dashboard/metrics/_core/getDashboardMetrics.ts` (P0, 28건)
2. `app/api/admin/operations/route.ts` (P0, 동적 필드 접근 우선 정리 대상)
3. `app/api/admin/*` 상태/결제 엔드포인트 (P0/P1)
4. `app/admin/users/_components/UserDetailClient.tsx` (P2)

---

## 2) 타입 안전 규칙 (API 진입점)

### 규칙
1. **외부 입력/DB raw/HTTP 응답은 `unknown`으로 받는다.**
2. **진입점에서만 파서(`zod` 또는 타입가드)로 검증한다.**
3. 검증 통과 후에는 **DTO 타입만 내부 전파**한다.
4. 컨트롤러/route에서는 파싱 + 오케스트레이션만 하고, 도메인 로직은 DTO 기반 함수로 분리한다.

### 권장 패턴
- `const raw: unknown = await req.json()`
- `const parsed = MyRequestSchema.safeParse(raw)`
- 실패 시 `400` + 필드 에러
- 성공 시 `const dto: MyRequestDto = parsed.data`

---

## 3) 단계적 치환 대상 (특정 파일)

### `app/api/admin/operations/route.ts`
- 동적 필드 접근(`doc?.x?.y`)을 `UnknownDoc` + `asObject/getString/getIdString` 헬퍼로 통일.
- order/rental/application 연결 검증 로직에서 문자열 ID 추출을 헬퍼 경유로 고정.
- 응답 직전 `AdminOperationsListResponseDto` 형태 유지(내부 any 금지).

### `app/api/admin/dashboard/metrics/_core/getDashboardMetrics.ts`
- 공용 헬퍼(`asDoc/asDocArray/toIsoSafe`)로 동적 입력 접근을 통일.
- 분포/목록 변환 로직에서 `any[]` 캐스팅 제거를 우선 진행.
- 집계 결과는 `unknown -> parser/guard -> DashboardMetrics DTO` 흐름으로 수렴.

---

## 4) CI 게이트
- `pnpm check:admin-any-gate`
  - `scripts/report-admin-any-count.mjs`로 카운트 산출
  - `scripts/admin-any-baseline.json` 대비
    - 전체 `any` 증가 시 실패
    - P0 `any` 증가 시 실패
- CI(`.github/workflows/ci.yml`)에서 PR 단계부터 게이트 실행.

---

## 5) 주간 목표 및 완료 기준

### 주간 목표 (권장)
- **주차별 `any` 총량 -20%** (기준: 직전 주 스냅샷)
- P0는 총량보다 강하게 관리: **매주 최소 -30%**

### 수치 예시 (현 기준 191건)
- 1주차 목표: 191 → 153 이하
- 2주차 목표: 153 → 122 이하
- 3주차 목표: 122 → 97 이하
- 4주차 목표: 97 → 77 이하

### 완료 기준 (Definition of Done)
1. **핵심 API(P0) `any` 0건**
2. 신규 PR에서 `any` 순증 0건 유지 (게이트 통과)
3. 진입점 파싱 규칙(`unknown + parser`) 위반 0건
