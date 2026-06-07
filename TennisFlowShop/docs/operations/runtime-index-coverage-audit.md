# Runtime 인덱스 범위 정적 감사

- 감사일: 2026-06-07
- 범위: `getDb()` runtime ensure, `ensure-runtime-indexes.mjs`, `check-runtime-indexes.mjs`
- 방법: 저장소 정적 분석만 수행했다. MongoDB URI/환경변수 값은 확인·출력하지 않았고, DB 연결 및 쓰기 스크립트는 실행하지 않았다.
- 결론: runtime 87개와 ensure script 82개는 동일하지 않다. check script는 두 생성/보정 경로의 합집합 96개를 읽기 전용으로 점검한다.

## 확인한 파일

- 호출 진입점: `lib/mongodb.ts`
- runtime ensure 구현: `lib/adminLocks.indexes.ts`, `lib/adminNotes.indexes.ts`, `lib/adminOperations.indexes.ts`, `lib/auth.indexes.ts`, `lib/boards.indexes.ts`, `lib/messages.indexes.ts`, `lib/notifications.indexes.ts`, `lib/passes.indexes.ts`, `lib/points.indexes.ts`, `lib/rentals.indexes.ts`, `lib/revenueReportSnapshots.indexes.ts`, `lib/risk.indexes.ts`, `lib/usedRackets.indexes.ts`, `lib/users.indexes.ts`, `lib/wishlist.indexes.ts`, `lib/offline/offline.repository.ts`, `lib/reviews.maintenance.ts`
- 배포 전 스크립트: `scripts/db/ensure-runtime-indexes.mjs`, `scripts/db/check-runtime-indexes.mjs`
- 명령 및 기존 운영 문서: `package.json`, `docs/operations/admin-user-indexes.md`, `docs/operations/vercel-atlas-region-diagnosis.md`

## `getDb()`가 호출하는 ensure 함수

`getDb()`는 아래 17개 함수를 시작하며 production에서는 완료를 기다리지 않고, 개발/테스트에서는 `Promise.all`로 기다린다.

1. `ensurePassIndexes`
2. `ensureAuthIndexes`
3. `ensureBoardIndexes`
4. `ensureRentalIndexes`
5. `ensureMessageIndexes`
6. `ensureUserNotificationIndexes`
7. `ensurePointsIndexes`
8. `ensureUsedRacketsIndexes`
9. `ensureWishlistIndexes`
10. `ensureAdminLocksIndexes`
11. `ensureAdminOperationsIndexes`
12. `ensureAdminNotesIndexes`
13. `ensureUserIndexes`
14. `ensureRiskIndexes`
15. `ensureRevenueReportSnapshotIndexes`
16. `ensureOfflineIndexes`
17. `ensureReviewIndexes`

## 핵심 비교 결과

| 비교                             | 누락/추가 수 | 결과                                                            |
| -------------------------------- | -----------: | --------------------------------------------------------------- |
| runtime에만 있고 ensure에는 없음 |           14 | `auth_rate_limit_windows` 2개, `users` OAuth 2개, offline 10개  |
| runtime에만 있고 check에는 없음  |            0 | 없음                                                            |
| ensure에만 있고 runtime에는 없음 |            9 | 공개 목록용 `products` 3개, `used_rackets` 4개, 검색 이메일 2개 |
| check에만 있고 runtime에는 없음  |            9 | ensure-only 9개와 동일                                          |
| ensure에만 있고 check에는 없음   |            0 | 없음                                                            |
| check에만 있고 ensure에는 없음   |           14 | runtime-only 14개와 동일                                        |

동일 이름/키라도 옵션 범위가 완전히 같지 않은 항목도 있다.

- `users.users_email_unique`: runtime은 `background: true`를 지정하지만 ensure/check 기대 옵션에는 없다. check는 background를 비교하지 않는다.
- `board_view_dedupe.board_view_dedupe_ttl_30m`: runtime TTL은 `COMMUNITY_VIEW_DEDUPE_TTL_SECONDS`를 1,800~86,400초로 제한한 환경 의존 값이고, ensure/check는 1,800초로 고정한다.
- `users` OAuth unique 2개는 runtime에만 있으며 `background: true`와 partial filter를 함께 사용한다.
- offline 10개는 이름을 지정하지 않고 `createIndexes()`를 호출하므로 아래 표의 이름은 MongoDB 기본 생성 이름을 기준으로 적었다.

## 전체 인덱스 비교표

표의 runtime/ensure/check는 각 위치가 해당 인덱스를 생성·보장 또는 검사 대상으로 선언하는지를 뜻한다. `background`는 runtime 코드가 명시한 경우만 표시했다.

| 컬렉션                       | 인덱스명                                         | key spec                                                                       | 옵션                                                                                                     | runtime | ensure | check |
| ---------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- | :-----: | :----: | :---: |
| `admin_locks`                | `admin_locks_key_unique`                         | `{"key":1}`                                                                    | `unique`                                                                                                 |   ✅    |   ✅   |  ✅   |
| `admin_locks`                | `ttl_locked_until`                               | `{"lockedUntil":1}`                                                            | `TTL=0`                                                                                                  |   ✅    |   ✅   |  ✅   |
| `admin_notes`                | `admin_notes_target_createdAt_idx`               | `{"targetType":1,"targetId":1,"createdAt":-1}`                                 | —                                                                                                        |   ✅    |   ✅   |  ✅   |
| `auth_rate_limit_windows`    | `auth_rate_limit_lookup_route_key_window_desc`   | `{"routeId":1,"key":1,"windowStart":-1}`                                       | —                                                                                                        |   ✅    |   —    |  ✅   |
| `auth_rate_limit_windows`    | `ttl_auth_rate_limit_expireAt`                   | `{"expireAt":1}`                                                               | `TTL=0`                                                                                                  |   ✅    |   —    |  ✅   |
| `board_posts`                | `boards_attachments_storagePath`                 | `{"attachments.storagePath":1}`                                                | —                                                                                                        |   ✅    |   ✅   |  ✅   |
| `board_posts`                | `boards_list_compound`                           | `{"type":1,"status":1,"isPinned":-1,"createdAt":-1}`                           | —                                                                                                        |   ✅    |   ✅   |  ✅   |
| `board_posts`                | `boards_updatedAt_desc`                          | `{"updatedAt":-1}`                                                             | —                                                                                                        |   ✅    |   ✅   |  ✅   |
| `board_posts`                | `idx_board_author_created`                       | `{"authorId":1,"createdAt":-1}`                                                | —                                                                                                        |   ✅    |   ✅   |  ✅   |
| `board_posts`                | `idx_board_pinned_created`                       | `{"isPinned":-1,"createdAt":-1}`                                               | —                                                                                                        |   ✅    |   ✅   |  ✅   |
| `board_posts`                | `idx_board_product_created`                      | `{"productRef.productId":1,"createdAt":-1}`                                    | —                                                                                                        |   ✅    |   ✅   |  ✅   |
| `board_posts`                | `idx_board_type_status_created`                  | `{"type":1,"status":1,"createdAt":-1}`                                         | —                                                                                                        |   ✅    |   ✅   |  ✅   |
| `board_view_dedupe`          | `board_view_dedupe_ttl_30m`                      | `{"createdAt":1}`                                                              | `TTL=환경값(1800~86400, 기본 1800); 차이 E: {"expireAfterSeconds":1800}; C: {"expireAfterSeconds":1800}` |   ✅    |   ✅   |  ✅   |
| `board_view_dedupe`          | `board_view_dedupe_unique`                       | `{"postId":1,"viewerKey":1}`                                                   | `unique`                                                                                                 |   ✅    |   ✅   |  ✅   |
| `cancel_refund_risk_signals` | `cancel_refund_risk_lastAt_desc`                 | `{"lastAt":-1}`                                                                | —                                                                                                        |   ✅    |   ✅   |  ✅   |
| `cancel_refund_risk_signals` | `cancel_refund_risk_subject_event_unique`        | `{"category":1,"subjectKey":1,"eventType":1}`                                  | `unique`                                                                                                 |   ✅    |   ✅   |  ✅   |
| `cancel_refund_risk_signals` | `cancel_refund_risk_target_lastAt_desc`          | `{"targetType":1,"targetId":1,"lastAt":-1}`                                    | —                                                                                                        |   ✅    |   ✅   |  ✅   |
| `community_likes`            | `community_likes_post_user_unique`               | `{"postId":1,"userId":1}`                                                      | `unique`                                                                                                 |   ✅    |   ✅   |  ✅   |
| `community_post_view_dedupe` | `community_post_view_dedupe_expire_at_ttl`       | `{"expireAt":1}`                                                               | `TTL=0`                                                                                                  |   ✅    |   ✅   |  ✅   |
| `community_post_view_dedupe` | `community_post_view_dedupe_unique`              | `{"postId":1,"viewerKey":1}`                                                   | `unique`                                                                                                 |   ✅    |   ✅   |  ✅   |
| `community_posts`            | `community_posts_market_price`                   | `{"type":1,"category":1,"marketMeta.price":1}`                                 | —                                                                                                        |   ✅    |   ✅   |  ✅   |
| `community_posts`            | `community_posts_market_racket_grip`             | `{"type":1,"category":1,"marketMeta.racketSpec.gripSize":1}`                   | —                                                                                                        |   ✅    |   ✅   |  ✅   |
| `community_posts`            | `community_posts_market_sale_status_created`     | `{"type":1,"category":1,"marketMeta.saleStatus":1,"createdAt":-1}`             | —                                                                                                        |   ✅    |   ✅   |  ✅   |
| `community_posts`            | `community_posts_market_string_material`         | `{"type":1,"category":1,"marketMeta.stringSpec.material":1}`                   | —                                                                                                        |   ✅    |   ✅   |  ✅   |
| `community_posts`            | `community_posts_type_category_brand_created`    | `{"type":1,"category":1,"brand":1,"createdAt":-1}`                             | —                                                                                                        |   ✅    |   ✅   |  ✅   |
| `messages`                   | `idx_messages_broadcastId`                       | `{"broadcastId":1}`                                                            | —                                                                                                        |   ✅    |   ✅   |  ✅   |
| `messages`                   | `idx_messages_from_created`                      | `{"fromUserId":1,"createdAt":-1}`                                              | —                                                                                                        |   ✅    |   ✅   |  ✅   |
| `messages`                   | `idx_messages_to_created`                        | `{"toUserId":1,"createdAt":-1}`                                                | —                                                                                                        |   ✅    |   ✅   |  ✅   |
| `messages`                   | `idx_messages_to_readAt`                         | `{"toUserId":1,"readAt":1}`                                                    | —                                                                                                        |   ✅    |   ✅   |  ✅   |
| `messages`                   | `ttl_messages_expiresAt`                         | `{"expiresAt":1}`                                                              | `TTL=0; partial={"expiresAt":{"$type":"date"}}`                                                          |   ✅    |   ✅   |  ✅   |
| `oauth_pending_signups`      | `ttl_oauth_pending_expiresAt`                    | `{"expiresAt":1}`                                                              | `TTL=0`                                                                                                  |   ✅    |   ✅   |  ✅   |
| `offline_customers`          | `createdAt_-1`                                   | `{"createdAt":-1}`                                                             | —                                                                                                        |   ✅    |   —    |  ✅   |
| `offline_customers`          | `emailLower_1`                                   | `{"emailLower":1}`                                                             | —                                                                                                        |   ✅    |   —    |  ✅   |
| `offline_customers`          | `linkedUserId_1`                                 | `{"linkedUserId":1}`                                                           | —                                                                                                        |   ✅    |   —    |  ✅   |
| `offline_customers`          | `phoneNormalized_1`                              | `{"phoneNormalized":1}`                                                        | —                                                                                                        |   ✅    |   —    |  ✅   |
| `offline_service_records`    | `kind_1`                                         | `{"kind":1}`                                                                   | —                                                                                                        |   ✅    |   —    |  ✅   |
| `offline_service_records`    | `occurredAt_-1`                                  | `{"occurredAt":-1}`                                                            | —                                                                                                        |   ✅    |   —    |  ✅   |
| `offline_service_records`    | `offlineCustomerId_1`                            | `{"offlineCustomerId":1}`                                                      | —                                                                                                        |   ✅    |   —    |  ✅   |
| `offline_service_records`    | `payment.status_1`                               | `{"payment.status":1}`                                                         | —                                                                                                        |   ✅    |   —    |  ✅   |
| `offline_service_records`    | `status_1`                                       | `{"status":1}`                                                                 | —                                                                                                        |   ✅    |   —    |  ✅   |
| `offline_service_records`    | `userId_1`                                       | `{"userId":1}`                                                                 | —                                                                                                        |   ✅    |   —    |  ✅   |
| `orders`                     | `ops_orders_searchEmailLower_idx`                | `{"searchEmailLower":1}`                                                       | —                                                                                                        |    —    |   ✅   |  ✅   |
| `orders`                     | `ops_orders_stringingApplicationId_idx`          | `{"stringingApplicationId":1}`                                                 | —                                                                                                        |   ✅    |   ✅   |  ✅   |
| `points_transactions`        | `idx_points_user_created`                        | `{"userId":1,"createdAt":-1}`                                                  | —                                                                                                        |   ✅    |   ✅   |  ✅   |
| `points_transactions`        | `uq_points_refKey`                               | `{"refKey":1}`                                                                 | `unique; partial={"refKey":{"$type":"string"}}`                                                          |   ✅    |   ✅   |  ✅   |
| `points_transactions`        | `uq_points_user_type_refKey`                     | `{"userId":1,"type":1,"refKey":1}`                                             | `unique; partial={"refKey":{"$type":"string"}}`                                                          |   ✅    |   ✅   |  ✅   |
| `products`                   | `idx_products_public_count`                      | `{"isDeleted":1}`                                                              | —                                                                                                        |    —    |   ✅   |  ✅   |
| `products`                   | `idx_products_public_price`                      | `{"price":1}`                                                                  | —                                                                                                        |    —    |   ✅   |  ✅   |
| `products`                   | `idx_products_public_reviews`                    | `{"ratingCount":-1,"ratingAvg":-1,"_id":-1}`                                   | —                                                                                                        |    —    |   ✅   |  ✅   |
| `rental_orders`              | `createdAt_desc`                                 | `{"createdAt":-1}`                                                             | —                                                                                                        |   ✅    |   ✅   |  ✅   |
| `rental_orders`              | `ops_rental_orders_stringingApplicationId_idx`   | `{"stringingApplicationId":1}`                                                 | —                                                                                                        |   ✅    |   ✅   |  ✅   |
| `rental_orders`              | `racket_status`                                  | `{"racketId":1,"status":1}`                                                    | —                                                                                                        |   ✅    |   ✅   |  ✅   |
| `rental_orders`              | `user_status`                                    | `{"userId":1,"status":1}`                                                      | —                                                                                                        |   ✅    |   ✅   |  ✅   |
| `revenue_report_snapshots`   | `revenue_report_snapshots_updatedAt_yyyymm_desc` | `{"updatedAt":-1,"yyyymm":-1}`                                                 | —                                                                                                        |   ✅    |   ✅   |  ✅   |
| `revenue_report_snapshots`   | `revenue_report_snapshots_yyyymm_unique`         | `{"yyyymm":1}`                                                                 | `unique`                                                                                                 |   ✅    |   ✅   |  ✅   |
| `review_votes`               | `reviewId_idx`                                   | `{"reviewId":1}`                                                               | —                                                                                                        |   ✅    |   ✅   |  ✅   |
| `review_votes`               | `review_user_unique`                             | `{"reviewId":1,"userId":1}`                                                    | `unique`                                                                                                 |   ✅    |   ✅   |  ✅   |
| `reviews`                    | `product_list_index`                             | `{"productId":1,"status":1,"createdAt":-1}`                                    | —                                                                                                        |   ✅    |   ✅   |  ✅   |
| `reviews`                    | `status_created_desc`                            | `{"status":1,"createdAt":-1,"_id":-1}`                                         | —                                                                                                        |   ✅    |   ✅   |  ✅   |
| `reviews`                    | `status_helpful_desc`                            | `{"status":1,"helpfulCount":-1,"_id":-1}`                                      | —                                                                                                        |   ✅    |   ✅   |  ✅   |
| `reviews`                    | `status_rating_desc`                             | `{"status":1,"rating":-1,"_id":-1}`                                            | —                                                                                                        |   ✅    |   ✅   |  ✅   |
| `reviews`                    | `user_createdAt`                                 | `{"userId":1,"createdAt":-1}`                                                  | —                                                                                                        |   ✅    |   ✅   |  ✅   |
| `reviews`                    | `user_product_order_unique`                      | `{"userId":1,"productId":1,"orderId":1}`                                       | `unique; partial={"productId":{"$exists":true},"orderId":{"$exists":true},"isDeleted":false}`            |   ✅    |   ✅   |  ✅   |
| `reviews`                    | `user_service_app_unique`                        | `{"userId":1,"service":1,"serviceApplicationId":1}`                            | `unique; partial={"serviceApplicationId":{"$exists":true},"isDeleted":false}`                            |   ✅    |   ✅   |  ✅   |
| `service_pass_consumptions`  | `idx_consumption_application`                    | `{"applicationId":1}`                                                          | —                                                                                                        |   ✅    |   ✅   |  ✅   |
| `service_pass_consumptions`  | `uniq_pass_application`                          | `{"passId":1,"applicationId":1}`                                               | `unique`                                                                                                 |   ✅    |   ✅   |  ✅   |
| `service_passes`             | `idx_pass_orderId`                               | `{"orderId":1}`                                                                | `sparse`                                                                                                 |   ✅    |   ✅   |  ✅   |
| `service_passes`             | `idx_pass_user_status_type`                      | `{"userId":1,"status":1,"type":1}`                                             | —                                                                                                        |   ✅    |   ✅   |  ✅   |
| `stringing_applications`     | `ops_apps_orderId_idx`                           | `{"orderId":1}`                                                                | —                                                                                                        |   ✅    |   ✅   |  ✅   |
| `stringing_applications`     | `ops_apps_rentalId_idx`                          | `{"rentalId":1}`                                                               | —                                                                                                        |   ✅    |   ✅   |  ✅   |
| `stringing_applications`     | `ops_apps_searchEmailLower_idx`                  | `{"searchEmailLower":1}`                                                       | —                                                                                                        |    —    |   ✅   |  ✅   |
| `stringing_applications`     | `ops_apps_stringingApplicationId_idx`            | `{"stringingApplicationId":1}`                                                 | —                                                                                                        |   ✅    |   ✅   |  ✅   |
| `used_rackets`               | `brand_1_status_1`                               | `{"brand":1,"status":1}`                                                       | —                                                                                                        |   ✅    |   ✅   |  ✅   |
| `used_rackets`               | `condition_1_status_1`                           | `{"condition":1,"status":1}`                                                   | —                                                                                                        |   ✅    |   ✅   |  ✅   |
| `used_rackets`               | `idx_used_rackets_public_latest`                 | `{"createdAt":-1,"_id":-1}`                                                    | —                                                                                                        |    —    |   ✅   |  ✅   |
| `used_rackets`               | `idx_used_rackets_public_price`                  | `{"price":1,"_id":-1}`                                                         | —                                                                                                        |    —    |   ✅   |  ✅   |
| `used_rackets`               | `idx_used_rackets_public_reviews`                | `{"reviewCount":-1,"ratingCount":-1,"createdAt":-1,"_id":-1}`                  | —                                                                                                        |    —    |   ✅   |  ✅   |
| `used_rackets`               | `idx_used_rackets_public_sales`                  | `{"purchaseCount":-1,"salesCount":-1,"orderCount":-1,"createdAt":-1,"_id":-1}` | —                                                                                                        |    —    |   ✅   |  ✅   |
| `used_rackets`               | `price_1_status_1`                               | `{"price":1,"status":1}`                                                       | —                                                                                                        |   ✅    |   ✅   |  ✅   |
| `used_rackets`               | `spec.balance_1`                                 | `{"spec.balance":1}`                                                           | —                                                                                                        |   ✅    |   ✅   |  ✅   |
| `used_rackets`               | `spec.headSize_1`                                | `{"spec.headSize":1}`                                                          | —                                                                                                        |   ✅    |   ✅   |  ✅   |
| `used_rackets`               | `spec.lengthIn_1`                                | `{"spec.lengthIn":1}`                                                          | —                                                                                                        |   ✅    |   ✅   |  ✅   |
| `used_rackets`               | `spec.pattern_1`                                 | `{"spec.pattern":1}`                                                           | —                                                                                                        |   ✅    |   ✅   |  ✅   |
| `used_rackets`               | `spec.stiffnessRa_1`                             | `{"spec.stiffnessRa":1}`                                                       | —                                                                                                        |   ✅    |   ✅   |  ✅   |
| `used_rackets`               | `spec.swingWeight_1`                             | `{"spec.swingWeight":1}`                                                       | —                                                                                                        |   ✅    |   ✅   |  ✅   |
| `used_rackets`               | `spec.weight_1`                                  | `{"spec.weight":1}`                                                            | —                                                                                                        |   ✅    |   ✅   |  ✅   |
| `used_rackets`               | `status_1_createdAt_-1`                          | `{"status":1,"createdAt":-1}`                                                  | —                                                                                                        |   ✅    |   ✅   |  ✅   |
| `user_notifications`         | `idx_user_notifications_user_created`            | `{"userId":1,"createdAt":-1}`                                                  | —                                                                                                        |   ✅    |   ✅   |  ✅   |
| `user_notifications`         | `idx_user_notifications_user_read_created`       | `{"userId":1,"readAt":1,"createdAt":-1}`                                       | —                                                                                                        |   ✅    |   ✅   |  ✅   |
| `user_notifications`         | `uniq_user_notifications_dedupe_key`             | `{"dedupeKey":1}`                                                              | `unique; partial={"dedupeKey":{"$type":"string"}}`                                                       |   ✅    |   ✅   |  ✅   |
| `user_sessions`              | `user_sessions_user_at_desc`                     | `{"userId":1,"at":-1}`                                                         | —                                                                                                        |   ✅    |   ✅   |  ✅   |
| `users`                      | `users_email_unique`                             | `{"email":1}`                                                                  | `unique; background; 차이 E: {"unique":true}; C: {"unique":true}`                                        |   ✅    |   ✅   |  ✅   |
| `users`                      | `users_lastLoginAt_idx`                          | `{"lastLoginAt":-1}`                                                           | —                                                                                                        |   ✅    |   ✅   |  ✅   |
| `users`                      | `users_oauth_kakao_id_unique`                    | `{"oauth.kakao.id":1}`                                                         | `unique; partial={"oauth.kakao.id":{"$exists":true,"$type":"string"}}; background`                       |   ✅    |   —    |  ✅   |
| `users`                      | `users_oauth_naver_id_unique`                    | `{"oauth.naver.id":1}`                                                         | `unique; partial={"oauth.naver.id":{"$exists":true,"$type":"string"}}; background`                       |   ✅    |   —    |  ✅   |
| `wishlists`                  | `wishlist_user_product_unique`                   | `{"userId":1,"productId":1}`                                                   | `unique`                                                                                                 |   ✅    |   ✅   |  ✅   |

## 위치별 인덱스 목록 요약

### Runtime ensure: 87개

전체 사양은 위 비교표의 runtime 열을 기준으로 한다. runtime에만 있는 14개는 다음과 같다.

- `auth_rate_limit_windows`: `ttl_auth_rate_limit_expireAt`, `auth_rate_limit_lookup_route_key_window_desc`
- `users`: `users_oauth_kakao_id_unique`, `users_oauth_naver_id_unique`
- `offline_customers`: `phoneNormalized_1`, `emailLower_1`, `linkedUserId_1`, `createdAt_-1`
- `offline_service_records`: `offlineCustomerId_1`, `userId_1`, `occurredAt_-1`, `status_1`, `payment.status_1`, `kind_1`

### ensure-runtime-indexes: 82개

전체 사양은 위 비교표의 ensure 열을 기준으로 한다. runtime에 없는 9개도 배포 전 스크립트가 보장한다.

- `products`: `idx_products_public_count`, `idx_products_public_price`, `idx_products_public_reviews`
- `used_rackets`: `idx_used_rackets_public_latest`, `idx_used_rackets_public_price`, `idx_used_rackets_public_reviews`, `idx_used_rackets_public_sales`
- `orders`: `ops_orders_searchEmailLower_idx`
- `stringing_applications`: `ops_apps_searchEmailLower_idx`

이 9개는 공개 목록/운영 검색 성능 목적일 수 있으므로, 단순히 삭제할 불일치로 판단하면 안 된다. 스크립트 설명의 “runtime 보장 범위”와 실제 책임 범위를 구분해 문서화할 필요가 있다.

### check-runtime-indexes: 96개

전체 사양은 위 비교표의 check 열을 기준으로 한다. check는 runtime ensure 87개와 ensure script 82개의 합집합 96개를 점검한다. 이번 보강으로 `user_notifications` 3개와 runtime-only 14개를 추가했으며, 인덱스 생성·삭제 없이 이름, 키, `unique`, `sparse`, `expireAfterSeconds`, `partialFilterExpression` 불일치만 보고한다.

offline 인덱스 10개는 runtime `createIndexes()`가 이름을 지정하지 않으므로 MongoDB의 기본 이름 생성 규칙(`<필드>_<방향>`)에 따른 이름을 기대한다. runtime 정의가 복합 키나 별도 옵션으로 바뀌면 check 기대 이름도 함께 검토해야 한다.

## 특수 인덱스

### Unique

- runtime: `admin_locks_key_unique`, `board_view_dedupe_unique`, `community_likes_post_user_unique`, `community_post_view_dedupe_unique`, `uniq_pass_application`, `revenue_report_snapshots_yyyymm_unique`, `uniq_user_notifications_dedupe_key`, `uq_points_user_type_refKey`, `uq_points_refKey`, `cancel_refund_risk_subject_event_unique`, `users_email_unique`, `users_oauth_kakao_id_unique`, `users_oauth_naver_id_unique`, `wishlist_user_product_unique`, `user_product_order_unique`, `user_service_app_unique`, `review_user_unique`
- ensure에는 위 runtime 목록 중 `users` OAuth 2개가 없다. check는 runtime의 unique 인덱스를 모두 점검한다.
- unique 생성은 기존 중복 데이터 때문에 실패할 수 있으므로 운영 데이터 사전 점검 없이 범위를 넓히면 안 된다.

### TTL

- runtime: `ttl_oauth_pending_expiresAt`, `ttl_auth_rate_limit_expireAt`, `board_view_dedupe_ttl_30m`, `community_post_view_dedupe_expire_at_ttl`, `ttl_messages_expiresAt`, `ttl_locked_until`
- ensure에는 `ttl_auth_rate_limit_expireAt`가 없고, check는 runtime과 동일하게 `expireAfterSeconds: 0`을 점검한다.
- `board_view_dedupe_ttl_30m`은 runtime에서 환경 의존 TTL을 사용하지만 ensure/check는 1,800초를 기대한다. 먼저 운영 정책값을 확정해야 한다.

### Partial

- runtime: `ttl_messages_expiresAt`, `uniq_user_notifications_dedupe_key`, `uq_points_user_type_refKey`, `uq_points_refKey`, `users_oauth_kakao_id_unique`, `users_oauth_naver_id_unique`, `user_product_order_unique`, `user_service_app_unique`
- ensure에는 `users` OAuth 2개가 없다. check는 runtime의 partial 인덱스를 모두 점검한다.

### Background

- runtime에서 명시: `users_email_unique`, `users_oauth_kakao_id_unique`, `users_oauth_naver_id_unique`
- ensure/check 사양에는 `background` 옵션이 없고, check 비교 로직도 이를 검사하지 않는다.

## 인덱스 외 DB 변경 동작 주의

이번 감사에서는 실행하지 않았지만, 이름과 달리 관련 경로에는 인덱스 생성 외 쓰기 동작이 있다.

- runtime `ensurePointsIndexes()`는 같은 `{ refKey: 1 }` non-unique 인덱스를 발견하면 drop 후 unique 생성을 시도한다.
- runtime `ensureReviewIndexes()`는 `reviews.isDeleted`를 `false`로 보정하는 `updateMany()`와 레거시 인덱스 `uniq_user_product_active_review` drop을 수행한다.
- `ensure-runtime-indexes.mjs`는 인덱스를 생성한 뒤 `community_post_view_dedupe.expireAt` 누락 문서를 `updateMany()`로 보정한다.

따라서 runtime ensure 및 ensure script를 “인덱스만 생성하는 작업”으로 간주하면 안 되며, 후속 변경 전에 별도 운영 승인과 데이터 영향 검토가 필요하다.

## 바로 수정해도 비교적 안전한 항목

실제 DB 생성/삭제 없이 코드·문서만 변경한다는 전제에서 다음이 안전하다.

1. `check-runtime-indexes.mjs`와 `ensure-runtime-indexes.mjs`의 범위가 동일하다는 현재 설명을 실제 차이에 맞게 정정한다.
2. 정적 사양 목록을 단일 소스로 관리하거나, DB에 연결하지 않고 세 목록의 차이만 실패시키는 테스트를 추가한다.
3. runtime 범위와 “배포 전 추가 성능 인덱스” 범위를 별도 그룹으로 명명한다.
4. offline 인덱스에 명시적 이름을 부여하는 방안은 제안만 작성하고, 이번 PR에서는 적용하지 않는다.

## 운영 DB 확인 후 수정해야 하는 위험 항목

1. unique/partial 인덱스 추가 또는 옵션 변경: 중복 데이터, partial 대상 문서, 기존 동일 키 인덱스를 먼저 읽기 전용으로 확인해야 한다.
2. TTL 범위 정렬: 실제 `COMMUNITY_VIEW_DEDUPE_TTL_SECONDS` 정책과 기존 TTL 인덱스 옵션을 확인한 뒤 결정해야 한다.
3. OAuth unique 인덱스의 ensure 편입: 기존 OAuth ID 중복 및 타입 분포를 먼저 점검해야 한다. check 편입은 읽기 전용 점검이므로 완료했다.
4. offline 인덱스의 ensure 편입 또는 runtime 이름 명시: 기존 자동 생성 이름과 동일 키 인덱스 중복 여부를 확인해야 한다. check는 현재 기본 생성 이름을 기대한다.
5. runtime-only를 ensure에 추가하는 작업: ensure script가 실제 쓰기 작업이므로 배포 절차, 롤백, 실패 정책을 함께 설계해야 한다.
6. ensure-only 9개 제거: runtime 외 성능 책임을 가진 인덱스일 수 있으므로 쿼리/explain 근거 없이 제거하면 안 된다.
7. points/reviews의 drop/update 동작: 인덱스 범위 정렬과 분리해 별도 위험 작업으로 검토해야 한다.

## 다음 PR 제안

### 1순위: DB 비접속 불일치 감지 테스트

- TypeScript 또는 JSON/TS 모듈에 정규화된 인덱스 사양을 두고 runtime/ensure/check가 이를 참조하도록 점진적으로 변경한다.
- 즉시 단일화가 어렵다면, 정적 분석 테스트가 컬렉션명·이름·키·`unique`·`sparse`·`expireAfterSeconds`·`partialFilterExpression` 차이를 출력하고 허용된 추가 성능 인덱스만 allowlist로 관리하도록 한다.
- 환경 의존 TTL과 자동 생성 이름은 명시적인 예외 규칙으로 다룬다.
- 테스트는 MongoDB URI 없이 실행되어야 하며 DB 쓰기를 절대 수행하지 않아야 한다.

### 2순위: check 범위 보완 (완료)

- `user_notifications` 3개와 runtime-only 14개를 check에 추가했다.
- check는 읽기 전용 `listIndexes()` 결과만 비교하며, 누락은 `MISSING`, 키·옵션 불일치는 `MISMATCH`로 보고하고 보정하지 않는다.
- `background`는 MongoDB 버전/드라이버에 따라 비교 의미가 약하므로 기존 정책대로 점검하지 않는다.

### 3순위: 책임 범위 분리

- runtime 필수 인덱스와 배포 전 추가 성능 인덱스를 별도 사양으로 구분한다.
- 인덱스 생성, 데이터 backfill, 기존 인덱스 drop을 서로 다른 명령으로 분리해 운영 위험을 명확히 한다.

## 실행하지 않은 DB 명령

- `pnpm db:ensure-runtime-indexes`: 인덱스 생성 및 `updateMany()`를 수행하므로 실행 금지.
- `pnpm db:check-runtime-indexes`: 소스상 읽기 전용이지만 운영 MongoDB 연결과 환경변수가 필요하므로 이번 정적 감사에서는 실행하지 않음.
- `pnpm db:ensure-admin-user-indexes`, `pnpm db:explain-admin-operations-search`: 이번 범위가 아니며 운영 DB 연결이 필요하므로 실행하지 않음.
