# 관리자 고비용 엔드포인트 분류 및 보호정책

## 1) 분류 대상
아래 엔드포인트를 **고비용 API**로 분류했습니다.

- `app/api/admin/system/*`
  - 삭제 후보 미리보기(`cleanup/preview`, `purge/preview`): 대량 문서 조회
  - 실제 정리 실행(`cleanup`, `purge`): 대량 삭제/인덱스 부하
- `app/api/settlements/*` 및 이를 재사용하는 `app/api/admin/settlements/*`
  - 월 스냅샷 생성/삭제, 라이브 집계, 일괄 삭제: 다중 컬렉션 스캔 + 집계
- `app/api/admin/operations`
  - 주문/대여/신청서 병합 조회 + 정렬/필터링
- `app/api/admin/dashboard/metrics`
  - 운영 대시보드용 다중 집계

## 2) 레이트리밋 키
레이트리밋은 다음 키로 계산합니다.

- `endpointKey + adminId + clientIp + windowStart`

즉, **IP + adminId 기준**으로 엔드포인트별 호출량을 분리합니다.

## 3) 장시간 작업 보호
아래 API에는 단일 실행 락을 적용했습니다.

- `admin.system.cleanup` (DELETE)
- `admin.system.purge` (DELETE)
- `admin.settlements.generate:{yyyymm}` (POST)
- `admin.settlements.bulk-delete` (POST)

락 충돌 시 `409 execution_locked`를 반환해 운영자가 중복 실행을 인지할 수 있게 했습니다.

## 4) 표준 초과 응답
레이트리밋 초과 시 표준 `429`를 반환합니다.

- body
  - `error.code = rate_limited`
  - `error.message = 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.`
- headers
  - `Retry-After`
  - `X-RateLimit-Limit`

## 5) 운영 모니터링 로그
레이트리밋 이벤트는 구조화 로그로 남깁니다.

- `admin.rate_limit.near_limit`
- `admin.rate_limit.exceeded`

운영 대시보드는 `endpointKey`, `category`, `ip`, `count`, `limit`, `remaining` 등을 기반으로 모니터링할 수 있습니다.
