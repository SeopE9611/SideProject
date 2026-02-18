# 릴리즈 노트: 라우트 런타임 인덱스 생성 제거 및 부팅 시점 보장 전환

## 변경 배경

기존에는 일부 API 라우트가 요청 처리 중 `createIndex`를 직접 호출했습니다. 이 방식은 다음 리스크가 있었습니다.

- 첫 요청 지연 증가(인덱스 확인/생성 비용이 요청 경로에 포함됨)
- 동시 요청 시 인덱스 생성 충돌 가능성 증가
- 라우트별 인덱스 생성 책임 분산으로 운영 가시성 저하

이번 릴리즈에서 인덱스 보장을 `lib/*indexes.ts` 계층으로 통합하고, 애플리케이션 부팅 경로(`getDb`)에서 컨테이너 생애주기당 1회만 보장하도록 전환했습니다.

## 인덱스 마이그레이션 순서 (필수)

아래 순서를 반드시 지켜서 반영하세요.

1. **애플리케이션 코드 배포 전, 운영 DB 인덱스 상태 점검**
   - `pnpm db:check-runtime-indexes`
   - 누락/옵션 불일치 인덱스가 있다면 2단계에서 선반영합니다.

2. **배포 직전 또는 배포 파이프라인에서 인덱스 선반영(권장)**
   - 신규 부팅 로직은 자동 보장을 수행하지만, 대규모 트래픽 환경에서는 선반영 후 배포가 더 안전합니다.
   - 대상 인덱스
     - `oauth_pending_signups.ttl_oauth_pending_expiresAt`
     - `user_sessions.user_sessions_user_at_desc`
     - `wishlists.wishlist_user_product_unique`
     - `users.users_email_unique`
     - `users.users_lastLoginAt_idx`
     - `admin_locks.admin_locks_key_unique`
     - `admin_locks.ttl_locked_until`
     - `review_votes.review_user_unique`
     - `review_votes.reviewId_idx`

3. **애플리케이션 배포**
   - 부팅 시 `getDb()`가 위 인덱스를 1회 보장합니다.

4. **배포 후 운영 검증**
   - 다시 `pnpm db:check-runtime-indexes`를 실행해 존재/옵션 일치 여부를 검증합니다.

5. **최종 확인**
   - 로그인/소셜로그인/위시리스트/리뷰 도움돼요/관리자 리뷰 유지보수 API 헬스체크를 수행합니다.

## 영향 범위

- API 라우트 내부 `createIndex` 호출 제거
- `lib/*indexes.ts` 인덱스 보장 모듈 신설
- `getDb()`의 부팅 시점 1회 인덱스 보장 체계 확장
- 운영 점검 스크립트(`scripts/db/check-runtime-indexes.mjs`) 추가
