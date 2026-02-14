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
