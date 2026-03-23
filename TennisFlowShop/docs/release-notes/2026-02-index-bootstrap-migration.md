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

2. **배포 직전 또는 배포 파이프라인에서 인덱스 선반영(Production 사실상 필수)**
   - 현재 production `getDb()`는 인덱스 보장을 백그라운드로 시작만 하고 요청 경로에서 완료를 기다리지 않습니다.
   - 따라서 운영에서는 `db:ensure-runtime-indexes`를 배포 전 절차로 고정하는 것을 기본 정책으로 봐야 합니다.
   - 대상 인덱스
     - `service_passes.idx_pass_user_status_type`
     - `service_passes.idx_pass_orderId`
     - `service_pass_consumptions.uniq_pass_application`
     - `service_pass_consumptions.idx_consumption_application`
     - `oauth_pending_signups.ttl_oauth_pending_expiresAt`
     - `user_sessions.user_sessions_user_at_desc`
     - `board_posts.idx_board_type_status_created`
     - `board_posts.idx_board_pinned_created`
     - `board_posts.idx_board_product_created`
     - `board_posts.idx_board_author_created`
     - `board_posts.boards_list_compound`
     - `board_posts.boards_updatedAt_desc`
     - `board_posts.boards_attachments_storagePath`
     - `board_view_dedupe.board_view_dedupe_unique`
     - `board_view_dedupe.board_view_dedupe_ttl_30m`
     - `community_posts.community_posts_type_category_brand_created`
     - `community_posts.community_posts_market_sale_status_created`
     - `community_posts.community_posts_market_price`
     - `community_posts.community_posts_market_racket_grip`
     - `community_posts.community_posts_market_string_material`
     - `community_likes.community_likes_post_user_unique`
     - `community_post_view_dedupe.community_post_view_dedupe_unique`
     - `community_post_view_dedupe.community_post_view_dedupe_expire_at_ttl`
     - `rental_orders.user_status`
     - `rental_orders.racket_status`
     - `rental_orders.createdAt_desc`
     - `messages.idx_messages_to_created`
     - `messages.idx_messages_from_created`
     - `messages.idx_messages_to_readAt`
     - `messages.idx_messages_broadcastId`
     - `messages.ttl_messages_expiresAt`
     - `points_transactions.idx_points_user_created`
     - `points_transactions.uq_points_user_type_refKey`
     - `points_transactions.uq_points_refKey`
     - `used_rackets.status_1_createdAt_-1`
     - `used_rackets.brand_1_status_1`
     - `used_rackets.condition_1_status_1`
     - `used_rackets.price_1_status_1`
     - `used_rackets.spec.headSize_1`
     - `used_rackets.spec.weight_1`
     - `used_rackets.spec.balance_1`
     - `used_rackets.spec.lengthIn_1`
     - `used_rackets.spec.stiffnessRa_1`
     - `used_rackets.spec.swingWeight_1`
     - `used_rackets.spec.pattern_1`
     - `wishlists.wishlist_user_product_unique`
     - `users.users_email_unique`
     - `users.users_lastLoginAt_idx`
     - `admin_locks.admin_locks_key_unique`
     - `admin_locks.ttl_locked_until`
     - `reviews.user_product_order_unique`
     - `reviews.user_service_app_unique`
     - `reviews.user_createdAt`
     - `reviews.product_list_index`
     - `reviews.status_created_desc`
     - `reviews.status_helpful_desc`
     - `reviews.status_rating_desc`
     - `review_votes.review_user_unique`
     - `review_votes.reviewId_idx`

3. **애플리케이션 배포**
   - production에서는 `getDb()`가 인덱스 보장을 비차단으로 시작합니다(요청 경로 await 없음).
   - 개발/테스트 환경에서는 기존처럼 `await`로 즉시 문제를 드러내는 보수 정책을 유지합니다.

4. **배포 후 운영 검증**
   - 다시 `pnpm db:check-runtime-indexes`를 실행해 존재/옵션 일치 여부를 검증합니다.
   - `check` 스크립트는 검증 전용이며 인덱스를 생성하지 않습니다.

5. **최종 확인**
   - 로그인/소셜로그인/위시리스트/리뷰 도움돼요/관리자 리뷰 유지보수 API 헬스체크를 수행합니다.

## 영향 범위

- API 라우트 내부 `createIndex` 호출 제거
- `lib/*indexes.ts` 인덱스 보장 모듈 신설
- `getDb()`의 부팅 시점 1회 인덱스 보장 체계 확장
- 운영 점검 스크립트(`scripts/db/check-runtime-indexes.mjs`) 추가
