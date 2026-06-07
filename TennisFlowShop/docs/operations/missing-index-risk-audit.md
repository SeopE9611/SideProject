# MISSING 런타임 인덱스 8개 사전 위험도 감사

## 목적과 안전 경계

PR #1434 이후 `pnpm dlx dotenv-cli -e .env.local -- pnpm db:check-runtime-indexes`의 96개 검사 범위에서 MISSING으로 보고된 8개 인덱스를 정적으로 감사했다. 이 문서는 생성 전 위험도와 읽기 전용 점검 예시만 기록한다.

- 이번 감사에서는 운영 DB aggregation, 인덱스 생성·삭제·수정, 데이터 보정 작업을 실행하지 않았다.
- 아래 쿼리는 `mongosh`에서 검토 후 실행할 수 있는 **읽기 전용 예시**다. URI나 환경변수 값을 출력하지 않는다.
- `pnpm db:ensure-runtime-indexes`는 인덱스 생성 외에도 `reviews.updateMany()`, 레거시 인덱스 drop, `community_post_view_dedupe.updateMany()`를 수행하므로 이번 범위에서 실행하면 안 된다.
- runtime ensure 함수도 애플리케이션 시작 경로에서 `createIndex()`를 호출할 수 있다. 실제 생성 PR에서는 runtime 자동 생성 여부와 배포 순서를 별도로 통제해야 한다.

## 확인한 정의 위치

| 역할                     | 확인 파일                                                                        | 확인 내용                                                                                                              |
| ------------------------ | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 읽기 전용 상태 검사      | `scripts/db/check-runtime-indexes.mjs`                                           | 8개 모두 검사 목록에 있으며 이름, key, `unique`, `expireAfterSeconds`, `sparse`, `partialFilterExpression`을 비교한다. |
| 생성/보정 스크립트       | `scripts/db/ensure-runtime-indexes.mjs`                                          | 8개 모두 생성 사양에 있다. 이 스크립트 자체는 읽기 전용이 아니다.                                                      |
| 인증 runtime 정의        | `lib/auth.indexes.ts`                                                            | OAuth pending TTL과 user session 조회 인덱스                                                                           |
| 게시판/runtime 정의      | `lib/boards.indexes.ts`                                                          | board list 조회 인덱스와 community likes unique 인덱스                                                                 |
| 위시리스트 runtime 정의  | `lib/wishlist.indexes.ts`                                                        | wishlist unique 인덱스                                                                                                 |
| 사용자 runtime 정의      | `lib/users.indexes.ts`                                                           | users email unique 인덱스; runtime에만 `background: true`가 있으나 check 비교 대상은 아니다.                           |
| 리뷰 runtime 정의        | `lib/reviews.maintenance.ts`                                                     | user별 생성일 정렬 인덱스; 같은 함수에는 이번 인덱스와 무관한 데이터 보정/drop 동작도 있다.                            |
| 관리자 잠금 runtime 정의 | `lib/adminLocks.indexes.ts`                                                      | admin lock key unique 인덱스                                                                                           |
| 기존 범위 감사           | `docs/operations/runtime-index-coverage-audit.md`                                | runtime/ensure/check 전체 비교 및 쓰기 동작 주의사항                                                                   |
| TTL 필드 작성 경로       | `app/api/oauth/kakao/callback/route.ts`, `app/api/oauth/naver/callback/route.ts` | 신규 pending 문서의 `expiresAt` 타입이 `Date`이며 생성 시점부터 10분 뒤 값으로 작성된다.                               |

## MISSING 8개 분류표

표의 “중복 점검”은 인덱스 생성 실패 방지를 위한 사전 읽기 점검 필요 여부다. 8개 모두 `partialFilterExpression`과 `sparse`가 없다.

| 분류           | 컬렉션                  | 인덱스명                           | key spec                                             | unique | partial | expireAfterSeconds | 중복 점검 | 생성 실패 가능성                                                                                         | 운영 영향도                                                             | 추천 순서 |
| -------------- | ----------------------- | ---------------------------------- | ---------------------------------------------------- | :----: | :-----: | :----------------: | :-------: | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | :-------: |
| 일반 조회/정렬 | `user_sessions`         | `user_sessions_user_at_desc`       | `{"userId":1,"at":-1}`                               | 아니요 |  없음   |        없음        |  불필요   | 낮음. 주 위험은 빌드 중 CPU/I/O 및 디스크 사용량이다.                                                    | 낮음~중간                                                               |     1     |
| 일반 조회/정렬 | `reviews`               | `user_createdAt`                   | `{"userId":1,"createdAt":-1}`                        | 아니요 |  없음   |        없음        |  불필요   | 낮음. 리뷰 컬렉션 크기와 운영 부하에 따라 빌드 비용은 확인해야 한다.                                     | 낮음~중간                                                               |     2     |
| 일반 조회/정렬 | `board_posts`           | `boards_list_compound`             | `{"type":1,"status":1,"isPinned":-1,"createdAt":-1}` | 아니요 |  없음   |        없음        |  불필요   | 낮음. 4필드 복합 인덱스이므로 다른 일반 인덱스보다 저장공간·쓰기 증폭이 클 수 있다.                      | 중간                                                                    |     3     |
| TTL            | `oauth_pending_signups` | `ttl_oauth_pending_expiresAt`      | `{"expiresAt":1}`                                    | 아니요 |  없음   |        `0`         |  불필요   | 인덱스 빌드 자체 실패 위험은 낮지만, 잘못된 옵션/타입보다 보존 정책 확인이 핵심이다.                     | 중간. 생성 후 이미 만료된 Date 문서가 TTL 모니터에 의해 삭제될 수 있다. |     4     |
| Unique         | `admin_locks`           | `admin_locks_key_unique`           | `{"key":1}`                                          |   예   |  없음   |        없음        | **필수**  | 중복 `key` 또는 여러 null/누락 값이 있으면 `E11000`으로 실패할 수 있다.                                  | 중간                                                                    |     5     |
| Unique         | `wishlists`             | `wishlist_user_product_unique`     | `{"userId":1,"productId":1}`                         |   예   |  없음   |        없음        | **필수**  | 중복 튜플 및 null/누락 조합 중복 시 실패할 수 있다.                                                      | 중간                                                                    |     6     |
| Unique         | `community_likes`       | `community_likes_post_user_unique` | `{"postId":1,"userId":1}`                            |   예   |  없음   |        없음        | **필수**  | 중복 튜플 및 null/누락 조합 중복 시 실패할 수 있다.                                                      | 중간~높음. 생성 뒤 중복 좋아요 쓰기가 오류로 바뀐다.                    |     7     |
| Unique         | `users`                 | `users_email_unique`               | `{"email":1}`                                        |   예   |  없음   |        없음        | **필수**  | 정확히 같은 email, 여러 null/누락 값이 있으면 실패할 수 있다. 문자열 정규화 불일치도 별도 확인해야 한다. | 높음. 계정 생성·OAuth 연결 핵심 경로에 제약을 추가한다.                 |     8     |

## Unique 인덱스 사전 점검

### 공통 판단

4개 unique 인덱스에는 `partialFilterExpression`과 `sparse`가 없다. 따라서 정상 형태의 비즈니스 키 중복뿐 아니라, 키가 null이거나 누락된 문서가 여러 개인 경우도 생성 실패 가능성을 점검해야 한다. 아래 첫 쿼리들은 실제 key spec과 같은 값을 그룹화해 인덱스 생성 실패 후보를 찾는다.

점검 결과가 0건이어도 점검과 실제 생성 사이에 새 중복 쓰기가 발생할 수 있다. 실제 생성 PR에서는 애플리케이션의 동시 쓰기 통제, 생성 직전 재점검, 실패 시 중단 기준을 함께 정해야 한다.

### `users.users_email_unique`

정확한 인덱스 키 중복 및 null/누락 충돌 후보:

```javascript
db.users.aggregate([
  { $group: { _id: "$email", count: { $sum: 1 }, ids: { $push: "$_id" } } },
  { $match: { count: { $gt: 1 } } },
  { $sort: { count: -1 } },
]);
```

비어 있지 않은 문자열의 대소문자·공백 정규화 기준 비즈니스 중복 후보:

```javascript
db.users.aggregate([
  { $match: { email: { $type: "string", $ne: "" } } },
  {
    $project: { normalizedEmail: { $toLower: { $trim: { input: "$email" } } } },
  },
  { $match: { normalizedEmail: { $ne: "" } } },
  { $group: { _id: "$normalizedEmail", count: { $sum: 1 } } },
  { $match: { count: { $gt: 1 } } },
  { $sort: { count: -1 } },
]);
```

현재 key spec은 `email`이고 collation/partial 옵션이 없으므로 기본 비교에서는 대소문자가 다른 문자열을 서로 다른 값으로 본다. `emailLower` 기준을 사용하려면 현재 인덱스 정의와 다른 정책 변경이므로 별도 PR에서 결정해야 한다.

### `wishlists.wishlist_user_product_unique`

```javascript
db.wishlists.aggregate([
  {
    $group: {
      _id: { userId: "$userId", productId: "$productId" },
      count: { $sum: 1 },
      ids: { $push: "$_id" },
    },
  },
  { $match: { count: { $gt: 1 } } },
  { $sort: { count: -1 } },
]);
```

### `community_likes.community_likes_post_user_unique`

```javascript
db.community_likes.aggregate([
  {
    $group: {
      _id: { postId: "$postId", userId: "$userId" },
      count: { $sum: 1 },
      ids: { $push: "$_id" },
    },
  },
  { $match: { count: { $gt: 1 } } },
  { $sort: { count: -1 } },
]);
```

### `admin_locks.admin_locks_key_unique`

```javascript
db.admin_locks.aggregate([
  { $group: { _id: "$key", count: { $sum: 1 }, ids: { $push: "$_id" } } },
  { $match: { count: { $gt: 1 } } },
  { $sort: { count: -1 } },
]);
```

### 키 타입 및 누락 분포 공통 점검 예시

중복 결과와 별도로 각 unique 키의 null/누락/예상 밖 타입 분포도 확인해야 한다. 다음 예시는 `users.email`용이며, 다른 컬렉션도 필드명을 바꿔 같은 방식으로 점검할 수 있다.

```javascript
db.users.aggregate([
  {
    $project: {
      keyType: { $type: "$email" },
      isEmptyString: { $eq: ["$email", ""] },
    },
  },
  {
    $group: {
      _id: { keyType: "$keyType", isEmptyString: "$isEmptyString" },
      count: { $sum: 1 },
    },
  },
  { $sort: { count: -1 } },
]);
```

## TTL 인덱스 확인 사항

`oauth_pending_signups.ttl_oauth_pending_expiresAt`은 `{"expiresAt":1}`에 `expireAfterSeconds: 0`을 사용하는 절대 시각 TTL 인덱스다. partial filter는 없다.

- 카카오·네이버 신규 pending 작성 경로의 타입 선언과 저장 값은 모두 `Date`다.
- 신규 값은 생성 시점에서 10분 뒤의 `Date`로 작성된다.
- 운영의 레거시 문서까지 모두 Date라고 단정할 수 없으므로 생성 전 읽기 전용 타입 분포와 이미 만료된 문서 수를 확인해야 한다.
- Date가 아닌 값은 기대대로 만료되지 않을 수 있다. 반대로 이미 지난 Date 값은 인덱스 생성 후 TTL 모니터에 의해 삭제 대상이 된다.
- TTL 삭제는 즉시 정확한 시각에 실행된다고 가정하면 안 된다. 이 인덱스는 임시 가입 문서 보존 정책용이다.

읽기 전용 타입 분포 예시:

```javascript
db.oauth_pending_signups.aggregate([
  { $group: { _id: { $type: "$expiresAt" }, count: { $sum: 1 } } },
  { $sort: { count: -1 } },
]);
```

이미 만료된 Date 문서 수 예시:

```javascript
db.oauth_pending_signups.countDocuments({
  expiresAt: { $type: "date", $lte: new Date() },
});
```

## 일반 조회/정렬 인덱스 위험도

`user_sessions_user_at_desc`, `boards_list_compound`, `user_createdAt`은 unique/TTL/partial 옵션이 없는 일반 인덱스다. 데이터 중복 때문에 생성이 실패하지는 않으므로 8개 중 상대적으로 먼저 생성하기 적합하다.

다만 “낮은 위험”은 무영향을 뜻하지 않는다. 실제 생성 전 컬렉션 크기, 현재 디스크 여유, 복제 지연, CPU/I/O 여유, 피크 시간대 여부를 확인해야 한다. 특히 `boards_list_compound`는 4개 필드 복합 인덱스여서 세 일반 인덱스 중 저장공간과 이후 쓰기 증폭이 가장 클 가능성이 있다.

## 바로 생성 가능해 보이는 후보와 추천 순서

운영 자원 점검과 승인 절차를 전제로, 데이터 정리 없이 생성 후보로 넘기기 쉬운 순서는 다음과 같다. 이번 PR에서는 어느 것도 생성하지 않는다.

1. `user_sessions.user_sessions_user_at_desc`
2. `reviews.user_createdAt`
3. `board_posts.boards_list_compound`
4. `oauth_pending_signups.ttl_oauth_pending_expiresAt` — 타입 분포, 이미 만료된 문서 수, 삭제 정책 확인 후
5. `admin_locks.admin_locks_key_unique` — 중복·누락 점검 통과 후
6. `wishlists.wishlist_user_product_unique` — 중복·누락 조합 점검 통과 후
7. `community_likes.community_likes_post_user_unique` — 중복·누락 조합 및 쓰기 오류 처리 확인 후
8. `users.users_email_unique` — 정확한 중복, null/누락, 정규화 기준, 계정 생성/OAuth 영향 확인 후 마지막 적용

반드시 사전 중복 점검이 필요한 후보는 `admin_locks_key_unique`, `wishlist_user_product_unique`, `community_likes_post_user_unique`, `users_email_unique` 네 개다.

## 실제 생성 PR의 중단 기준

다음 중 하나라도 해당하면 생성하지 않고 조사 또는 데이터 정리 계획을 별도 승인받는다.

- unique 키 중복, null/누락 조합 중복, 예상 밖 타입이 발견됨
- users email의 대소문자·공백 정규화 정책이 확정되지 않음
- TTL 대상의 타입 분포나 이미 만료된 문서 삭제 영향이 확인되지 않음
- 인덱스 빌드에 필요한 디스크/CPU/I/O 여유 또는 복제 지연 관측 계획이 없음
- 생성 중 애플리케이션 동시 쓰기와 실패 처리 방안이 없음
- `ensure-runtime-indexes.mjs`의 인덱스 외 쓰기 동작을 분리하지 않은 채 실행하려 함

## 다음 PR 제안

1. **읽기 전용 사전 점검 PR**: 승인된 운영 절차에서 위 aggregation/count 쿼리를 실행하고, 값 자체나 URI를 노출하지 않은 건수·타입 분포 결과만 기록한다.
2. **일반 인덱스 생성 PR**: 세 일반 인덱스를 운영 자원 관측과 함께 작은 단위로 생성하고 각 단계 후 `db:check-runtime-indexes`로 확인한다.
3. **TTL 생성 PR**: Date 타입 및 만료 삭제 영향 확인 후 TTL 인덱스만 별도로 생성한다.
4. **Unique 데이터 정리/생성 PR**: 네 unique 인덱스를 각각 별도 승인 단위로 처리한다. 중복 발견 시 정리 정책과 감사 기록을 먼저 확정한다.
5. **도구 안전성 PR**: 인덱스 생성, reviews 보정, 레거시 drop, community dedupe backfill을 서로 다른 명령으로 분리해 운영 쓰기 범위를 명확히 한다.
