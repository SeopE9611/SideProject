# Admin 모듈 책임/경계 컨벤션

## 파일 책임 (max responsibility)
- `app/api/admin/dashboard/metrics/route.ts`: **transport only** (인증/응답 포장).
- `app/api/admin/dashboard/metrics/_core/query-collector.ts`: **query collection only**.
- `app/api/admin/dashboard/metrics/_core/aggregate-transformer.ts`: **aggregation transform only**.
- `app/api/admin/dashboard/metrics/_core/response-mapper.ts`: **mapping only**.
- `app/api/admin/operations/route.ts`: **transport + orchestration only**.
- `types/admin/operations.ts`: **domain type definition only**.
- `app/admin/users/_hooks/*`: **data fetching only**.
- `app/admin/users/_components/*`: **UI only**.

## import 경계 컨벤션
1. `_components/*`는 `_hooks/*`를 import 할 수 있지만, API route(`app/api/**`)를 직접 import 하지 않는다.
2. `route.ts`는 `_components/*`를 import 하지 않는다.
3. `types/admin/*`는 런타임 로직(import side effect) 없이 type export만 허용한다.
4. `_core/response-mapper.ts`는 DB 접근 코드를 포함하지 않는다.

> lint rule 미적용 상태이므로, 위 규칙을 PR 리뷰 체크리스트로 강제한다.

## 파일 크기(LOC) 팀 규칙
- 목표: 단일 파일은 **권장 300~400 LOC 이내**로 유지한다.
- 400 LOC를 초과하면 우선적으로 다음 단위로 분리한다: `query / aggregation / mapping`, `hooks / components`, `filters / table / dialogs`.
- 예외가 필요한 경우 PR 본문에 사유와 추후 분리 계획을 명시한다.


## 강제 규칙: 관리자 UI API 경계
- 관리자 UI(`app/admin/**`)는 **반드시 `/api/admin/**`만 호출**한다.
- `/api/**`(비 admin 네임스페이스) 호출이 필요한 경우는 읽기 전용 공용 조회 API로 한정하고, 예외 사유를 PR 본문에 명시한다.
- 관리자 전용 행위(승인/반려/수정/삭제/정산/발송 재시도)는 `app/api/admin/**`로만 제공한다.
- 전환 단계에서는 기존 비-admin 경로에 `Deprecation` 응답 헤더 또는 307/410 응답 정책을 적용해 누락 클라이언트를 조기 탐지한다.
