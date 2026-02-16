# Admin API 감사로그 적용 매트릭스

## 1) 전수 목록: `app/api/admin/**`의 변경 메서드(POST/PATCH/PUT/DELETE)

> 기준: `export async function POST|PATCH|PUT|DELETE`, `export { POST|PATCH|PUT|DELETE } from ...` 정적 분석.

| 경로 | 메서드 | 감사로그 적용 상태 | 비고 |
|---|---:|---|---|
| `app/api/admin/applications/stringing/[id]/shipping/route.ts` | PATCH | 미적용 | 후속 확장 대상 |
| `app/api/admin/community/posts/[id]/status/route.ts` | PATCH | 미적용 | 후속 확장 대상 |
| `app/api/admin/community/reports/[id]/status/route.ts` | PATCH | 미적용 | 후속 확장 대상 |
| `app/api/admin/notifications/outbox/[id]/force/route.ts` | POST | 미적용 | 알림 재처리 계열 |
| `app/api/admin/notifications/outbox/[id]/retry/route.ts` | POST | 미적용 | 알림 재처리 계열 |
| `app/api/admin/orders/[id]/shipping/route.ts` | PATCH | 미적용 | 후속 확장 대상 |
| `app/api/admin/package-orders/[id]/adjust-sessions/route.ts` | POST | 미적용 | 후속 확장 대상 |
| `app/api/admin/package-orders/[id]/extend/route.ts` | POST | 미적용 | 후속 확장 대상 |
| `app/api/admin/package-orders/[id]/pass-status/route.ts` | POST | 미적용 | 후속 확장 대상 |
| `app/api/admin/package-orders/[id]/route.ts` | PATCH | 미적용 | 후속 확장 대상 |
| `app/api/admin/packages/settings/route.ts` | PUT | 미적용 | 후속 확장 대상 |
| `app/api/admin/points/adjust/route.ts` | POST | **적용 완료** | 우선순위 1 |
| `app/api/admin/products/[id]/route.ts` | PUT/DELETE | 미적용 | 후속 확장 대상 |
| `app/api/admin/products/route.ts` | POST | 미적용 | 후속 확장 대상 |
| `app/api/admin/rackets/[id]/route.ts` | PATCH/DELETE | 미적용 | 후속 확장 대상 |
| `app/api/admin/rackets/route.ts` | POST | 미적용 | 후속 확장 대상 |
| `app/api/admin/rentals/[id]/cancel-approve/route.ts` | POST | **적용 완료(하위 실제 처리 라우트)** | `/api/rentals/[id]/cancel-approve`로 프록시 |
| `app/api/admin/rentals/[id]/cancel-reject/route.ts` | POST | **적용 완료(하위 실제 처리 라우트)** | `/api/rentals/[id]/cancel-reject`로 프록시 |
| `app/api/admin/rentals/[id]/deposit/refund/route.ts` | POST | 미적용 | status transition 아님 |
| `app/api/admin/rentals/[id]/out/route.ts` | POST | **적용 완료(하위 실제 처리 라우트)** | `/api/rentals/[id]/out`로 프록시 |
| `app/api/admin/rentals/[id]/payment/confirm/route.ts` | POST | **적용 완료** | 우선순위 1 |
| `app/api/admin/rentals/[id]/return/route.ts` | POST | **적용 완료(하위 실제 처리 라우트)** | `/api/rentals/[id]/return`로 프록시 |
| `app/api/admin/rentals/[id]/return-shipping/route.ts` | POST | 미적용 | status transition 아님 |
| `app/api/admin/rentals/[id]/shipping/outbound/route.ts` | POST | 미적용 | status transition 아님 |
| `app/api/admin/rentals/cleanup-created/route.ts` | POST | 미적용 | 후속 확장 대상 |
| `app/api/admin/reviews/[id]/route.ts` | PATCH/DELETE | 미적용 | 후속 확장 대상 |
| `app/api/admin/reviews/maintenance/route.ts` | POST/DELETE | 미적용 | 후속 확장 대상 |
| `app/api/admin/settings/email/route.ts` | PATCH | **적용 완료** | 우선순위 1 |
| `app/api/admin/settings/payment/route.ts` | PATCH | **적용 완료** | 우선순위 1 |
| `app/api/admin/settings/site/route.ts` | PATCH | **적용 완료** | 우선순위 1 |
| `app/api/admin/settings/stringing/route.ts` | PATCH | **적용 완료** | 우선순위 1 |
| `app/api/admin/settings/user/route.ts` | PATCH | **적용 완료** | 우선순위 1 |
| `app/api/admin/settlements/[yyyymm]/route.ts` | POST/DELETE | **적용 완료(하위 실제 처리 라우트)** | `/api/settlements/[yyyymm]` 재수출 |
| `app/api/admin/settlements/bulk-delete/route.ts` | POST | **적용 완료(하위 실제 처리 라우트)** | `/api/settlements/bulk-delete` 재수출 |
| `app/api/admin/system/cleanup/route.ts` | DELETE | **적용 완료** | 우선순위 1 |
| `app/api/admin/system/purge/route.ts` | DELETE | **적용 완료** | 우선순위 1 |
| `app/api/admin/users/[id]/audit/route.ts` | POST | 미적용 | 사용자별 감사 로그 수기 입력 API |
| `app/api/admin/users/[id]/password/reset/route.ts` | POST | 기존 `appendAudit` 사용 | 추후 `appendAdminAudit`로 통합 권장 |
| `app/api/admin/users/[id]/route.ts` | PATCH/DELETE | 기존 `appendAudit` 사용 | 추후 `appendAdminAudit`로 통합 권장 |
| `app/api/admin/users/[id]/sessions/cleanup/route.ts` | POST | 기존 `appendAudit` 사용 | 추후 `appendAdminAudit`로 통합 권장 |
| `app/api/admin/users/bulk/route.ts` | POST | 미적용 | 후속 확장 대상 |

## 2) 우선순위 1 적용 범위 점검 결과

- `system/*`: `cleanup`, `purge` 적용 완료.
- `points/adjust`: 적용 완료.
- `settlements/*`: 실제 처리 라우트(`/api/settlements/[yyyymm]`, `/api/settlements/bulk-delete`)에 적용 완료.
- `rentals/* status transition`: `payment-confirm`, `out`, `return`, `cancel-approve`, `cancel-reject` 적용 완료.
- `settings/*`: `payment/email/site/stringing/user` PATCH 전부 적용 완료.

## 3) 감사로그 실패 분리 + 재시도 큐 정책

### 공통 정책
- 본 처리(도메인 처리)는 **성공/실패를 독립적으로 판단**.
- 감사로그 쓰기 실패 시,
  1. 운영 로그(`console.error`)로 즉시 기록,
  2. `admin_audit_retry_queue` 컬렉션에 재시도 이벤트 적재,
  3. 라우트 응답은 본 처리 결과를 그대로 유지.

### `admin_audit_retry_queue` 저장 스키마(요약)
- `status`: `queued`
- `retryCount`: `0`부터 시작
- `maxRetries`: 기본 `8`
- `nextRetryAt`: 지수 백오프(초기 30초)
- `lastError`: 마지막 에러 문자열
- `requestId`, `payload(type/actorId/targetId/message/diff/ip/ua)`
- `createdAt`, `updatedAt`

### 재시도 백오프
- `baseDelayMs = 30,000`
- `maxDelayMs = 3,600,000`(1시간)
- `nextRetryAt = now + min(maxDelayMs, baseDelayMs * 2^(retryCount-1))`
- 권장 배치 워커: `status=queued && nextRetryAt<=now && retryCount<maxRetries` 건 재처리
