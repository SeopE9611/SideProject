# 뉴스 콘텐츠 플랫폼 아키텍처

## 1. 현재 단계

공개 뉴스 읽기 기반에 더해 MongoDB 관리자 계정, scrypt 비밀번호 해시,
MongoDB 세션, 로그인 제한, 관리자 로그인·로그아웃, 관리자 보호 레이아웃과
대시보드와 관리자 뉴스 목록 조회를 제공한다. 관리자 뉴스 목록의 분류·게시 상태·
승인 상태 필터, 페이지 이동과 현재 공개 여부 표시, 관리자 뉴스 초안 작성 화면,
클라이언트·서버 입력 검증, 관리자 작성 API, 중복 slug 처리와 MongoDB 초안 저장,
관리자 뉴스 상세 조회와 안전한 초안 수정, `updatedAt` 기반 동시 수정 충돌 방지를
완료했다. 관리자 뉴스 검토 요청, `draft → review` 원자적 상태 전환,
`updatedAt` 기반 검토 요청 충돌 감지와 검토 요청 후 내용 수정 잠금도 제공한다.
검토 승인·반려, `review+pending → review+approved`,
`review+pending → draft+rejected`, 반려 후 수정과 재검토 요청도 제공한다.
승인 게시물 즉시 게시, `review+approved → published+approved` 전환, 서버 게시
시각 기록, `updatedAt` 기반 게시 충돌 감지와 기존 공개 뉴스 목록·상세 연결을
제공한다. 공개 게시물의 게시 중단과 보관, 게시 중단 후 재게시, 보관 후
공개·수정·재게시 차단과 `updatedAt` 기반 상태 변경 충돌 감지도 제공한다.

## 2. 데이터 소스

`SHALOM_CONTENT_SOURCE`는 다음 값 중 하나를 사용한다.

- `empty`: 게시물을 반환하지 않는다. 운영 환경에서 설정이 없을 때의 기본값이다.
- `fixture`: 목록과 상세 화면 개발을 위한 명시적인 예시 게시물을 반환한다.
- `mongodb`: 승인된 운영 콘텐츠를 MongoDB에서 읽는다.

환경변수가 없으면 `NODE_ENV=development`에서만 `fixture`를 사용하고, 그 외
환경에서는 `empty`를 사용한다. 알 수 없는 값은 구성 오류로 처리하며 다른 소스로
자동 전환하지 않는다.

## 3. MongoDB

- 연결 환경변수: `SHALOM_MONGODB_URI`
- DB명 환경변수: `SHALOM_MONGODB_DB`
- 기본 DB명: `shalom_house`
- 컬렉션: `news_posts`
- slug 인덱스: `{ slug: 1 }`, `news_posts_slug_unique`, unique
- 공개 목록 인덱스: `{ publicationStatus: 1, approvalStatus: 1, publishedAt: -1 }`,
  `news_posts_public_list`
- 관리자 최근 수정 목록 인덱스: `{ deletedAt: 1, updatedAt: -1, _id: -1 }`,
  `news_posts_admin_updated`

연결 URI는 코드나 문서에 기록하지 않는다. 같은 Atlas 클러스터를 사용할 수
있더라도 기본 DB명을 별도로 두어 도깨비테니스 데이터와 논리적으로 분리한다.
인덱스는 런타임 요청이 아니라 `db:ensure-news-indexes` 스크립트로 보장한다.

## 4. 공개 조건

MongoDB 게시물은 서버 쿼리에서 다음 조건을 모두 만족해야 공개된다.

```text
publicationStatus=published
approvalStatus=approved
publishedAt가 null이 아니고 현재 시각 이하
deletedAt가 없거나 null
```

`publicationStatus=published`와 `approvalStatus=approved`는 서로 독립된 조건이다.
slug 상세 조회에도 같은 공개 조건을 적용하며 ObjectId는 공개 URL에 사용하지 않는다.
목록 쿼리는 본문을 조회하지 않고 상세 쿼리만 일반 텍스트 문단 배열을 조회한다.

## 5. fixture 정책

- 공식 콘텐츠가 아니며 `fixture` 모드에서만 사용한다.
- 목록과 상세 화면에 개발용 예시임을 텍스트로 표시한다.
- 운영 환경의 기본값에서는 노출하지 않는다.
- 실제 사람, 활동, 시설 운영 사실을 만들지 않는다.
- MongoDB에 자동 삽입하지 않으며 seed 기능을 제공하지 않는다.

## 6. 관리자 인증

- 공개 로그인 경로는 `/admin/login`이다.
- `/admin`과 `/admin/news`는 `(protected)` Route Group의 Server Component
  레이아웃에서 현재 관리자를 확인한 뒤 렌더링한다.
- `admin_users`, `admin_sessions`, `admin_login_attempts` 컬렉션을 각각 계정,
  세션, 로그인 실패 제한에 사용한다.
- 비밀번호는 Node.js scrypt로 해시하고, 무작위 세션 토큰은 브라우저 쿠키에만
  전달하며 MongoDB에는 SHA-256 해시만 저장한다.
- 세션은 8시간 고정 만료이며 슬라이딩 연장을 하지 않는다. 쿠키는 `HttpOnly`,
  `SameSite=Lax`, production 환경의 `Secure` 속성을 사용한다.
- 로그인과 로그아웃 POST는 동일 출처 요청만 허용한다.
- 정규화 이메일과 클라이언트 주소를 해시한 키로 15분 동안 5회 실패를 제한하며,
  이메일과 주소 원문은 로그인 제한 문서에 저장하지 않는다.
- `admin_login_attempts`는 `keyHash` 고유 인덱스와 aggregation pipeline upsert로
  원자적으로 갱신하며, 신규 문서의 `_id`는 MongoDB가 생성한다. 새 15분 창에서는
  `failedCount=1`, `blockedUntil=null`로 초기화하고 같은 창에서는 실패 횟수를
  증가시키며, 5회 실패 시 15분 동안 차단한다. TTL 정리는 `expiresAt` 단일 필드
  인덱스를 사용한다.
- 코드·정적·HTTP 검증과 실제 MongoDB 통합 검증은 구분해 기록하며, MongoDB
  환경변수가 없는 환경에서는 실제 통합 검증을 완료로 간주하지 않는다.
- 세션 조회 시 활성 상태와 `admin` 역할을 다시 검사하므로 비활성 관리자의 기존
  세션도 거부한다.

### 최초 관리자 계정 생성

실행 전 `SHALOM_MONGODB_URI`를 설정하고 필요하면 `SHALOM_MONGODB_DB`를 지정한다.
인덱스를 먼저 보장한다.

```bash
pnpm --dir shalom-house db:ensure-admin-auth-indexes
```

이후 `SHALOM_ADMIN_EMAIL`, `SHALOM_ADMIN_PASSWORD`, `SHALOM_ADMIN_NAME`을 모두
설정한 로컬 환경에서 다음 명령을 실행한다.

```bash
pnpm --dir shalom-house admin:create-user
```

관리자 생성용 환경변수는 일회성 로컬 실행에만 사용하며 실제 값을 Git이나 배포
설정에 장기 보관하지 않는다. 기존 이메일의 계정은 덮어쓰거나 자동 활성화하지 않는다.

## 7. 관리자 뉴스 조회

- 관리자 목록은 fixture나 공개 데이터 소스 설정을 사용하지 않고 MongoDB만 조회한다.
- `deletedAt: null` 조건으로 삭제되지 않은 게시물을 조회한다.
- 20개 단위로 페이지를 이동하며 `updatedAt`, `_id` 내림차순으로 정렬한다.
- 분류, 게시 상태, 승인 상태를 각각 선택 필터로 제공한다.
- 관리자 목록 projection에는 `body`를 포함하지 않는다.
- 공개 여부는 공개 저장소와 동일하게 게시·승인 완료, 게시일 설정 및 현재 시각 이하,
  삭제되지 않음 조건으로 계산한다.
- MongoDB 연결 또는 조회 오류를 빈 목록이나 fixture로 대체하지 않는다.

### 뉴스 저장소 구조

- `news.mongo-schema.ts`: 컬렉션명과 MongoDB 문서 타입을 공유한다.
- `news.pagination.ts`: 공개 목록 검색어·page·pageSize와 기존 목록 limit, 관리자
  page를 각각 정규화한다.
- `news.mongo-repository.ts`: 공개 뉴스 목록에서 서버 검색, `countDocuments` 전체
  결과 수 조회와 `skip`·`limit` 페이지네이션을 수행하며 상세 읽기도 담당한다.
- `news.admin-repository.ts`: 관리자 전용 뉴스 목록·상세 읽기를 담당한다.

공개 뉴스에서 `/news/notices`와 `/news/activities`는 정적 분류 route이고, 게시물
상세는 `/news/[slug]`를 사용한다. 따라서 `notices`, `activities`는 게시물 slug
예약어이며 관리자 작성·수정 검증에서 차단한다. 새로운 정적 뉴스 하위 route를
추가할 때는 예약어 목록도 함께 갱신한다.

자료공개는 뉴스 category에 포함하지 않으며, 문서 메타데이터와 첨부파일을 위한
별도 repository 및 관리자 관리 구조로 구현할 예정이다.

## 8. 관리자 뉴스 초안 작성

- 작성 화면은 `/admin/news/new`, 작성 API는 `POST /api/admin/news`를 사용한다.
- API는 동일 출처와 관리자 세션을 차례로 검사하고, JSON 요청을 64KiB로 제한한 뒤
  서버에서 모든 입력을 다시 검증한다. 성공은 201, 중복 slug는 unique 인덱스의
  duplicate key 오류를 기준으로 409를 반환한다.
- 초안 생성 상태는 서버가 다음과 같이 강제하며 사용자가 게시·승인 상태를 지정할 수
  없다.

```text
publicationStatus=draft
approvalStatus=pending
publishedAt=null
deletedAt=null
createdAt=updatedAt
```

- 새 게시물은 자동 공개되지 않으며 공개 금지 정보는 초안 DB에도 저장하지 않는다.
- 본문은 HTML 변환 없이 일반 텍스트 문단 배열로 저장한다.
- `contentSafetyConfirmed`는 저장 전 확인 절차일 뿐 DB 필드가 아니다.

### 뉴스 저장소 구조 추가

- `news.admin-validation.ts`: 브라우저와 서버가 공유하는 초안 입력 검증을 담당한다.
- `news.admin-repository.ts`: 관리자 목록 조회와 MongoDB 초안 생성을 담당한다.

## 9. 관리자 뉴스 상세와 초안 수정

- 상세 경로는 `/admin/news/[id]`, 수정 경로는 `/admin/news/[id]/edit`, 수정 API는
  `PATCH /api/admin/news/[id]`이며 변경 가능한 slug 대신 MongoDB ObjectId를 사용한다.
- 수정은 `publicationStatus=draft`, `approvalStatus`가 `pending` 또는 `rejected`,
  `publishedAt=null`, `deletedAt`이 없거나 `null`인
  게시물에만 허용한다. 수정 가능 필드는 `category`, `slug`, `title`, `summary`,
  `body`, `updatedAt`이다. `publicationStatus`, `approvalStatus`, `publishedAt`,
  `createdAt`, `deletedAt`은 변경하지 않는다.
- form이 로드한 `updatedAt`을 `expectedUpdatedAt`으로 전달하고 MongoDB 원자적
  update filter에서 일치를 확인한다. 먼저 저장된 변경으로 값이 불일치하면
  `409 edit_conflict`를 반환한다. 수정 slug 중복은 unique 인덱스 오류에 따라
  `409 slug_conflict`, 수정 불가 상태는 `409 not_editable`로 구분한다.
- 작성·수정 API는 `application/json` 미디어 타입을 정확히 비교한다. 작성 API는
  세션 DB 조회 오류도 JSON 503으로 처리하고, 공통 form은 비JSON 또는 파싱할 수
  없는 서버 응답을 네트워크 요청 실패와 구분한다.

## 10. 관리자 뉴스 검토 요청

- 검토 요청 API는 `POST /api/admin/news/[id]/review`를 사용한다. 활성 `admin`
  세션은 검토 요청할 수 있으며 현재 관리자 역할은 `admin` 하나뿐이다.
- 검토 요청은 내용 작성이 완료된 초안을 검토 대기 상태로 옮기고 일반 내용 수정을
  잠그는 절차다. 독립적인 승인이나 직무 분리를 의미하지 않으며 작성자·검토자·
  승인자 구분은 아직 구현하지 않았다.
- 삭제되지 않았고 `draft`, `pending` 또는 `rejected`, `publishedAt=null`이며 `updatedAt`이 form이
  읽은 값과 일치하는 게시물만 다음과 같이 전환한다.

```text
draft + pending + publishedAt=null
→
review + pending + publishedAt=null

draft + rejected + publishedAt=null
→
review + pending + publishedAt=null
```

- MongoDB `findOneAndUpdate` 하나로 원자적으로 전환하며 변경 필드는
  `publicationStatus`, `approvalStatus`, `updatedAt`뿐이다. `updatedAt`은 서버 시각과 기존 값보다
  1ms 큰 시각 중 더 큰 값으로 갱신한다.
- `publishedAt`, `createdAt`, `deletedAt`, `slug`, `category`,
  `title`, `summary`, `body`는 검토 요청으로 변경하지 않는다.
- 문서 없음·삭제 상태는 `not_found`, 요청할 수 없는 상태는 `not_requestable`,
  먼저 발생한 수정은 `edit_conflict`로 구분하며 조건을 완화해 자동 재시도하지 않는다.
- 검토 중 게시물은 `review + pending + publishedAt=null`이므로 기존 공개 조건을
  충족하지 않고, 상세 화면과 직접 수정 화면 모두 내용 수정 form을 제공하지 않는다.

## 11. 관리자 뉴스 검토 승인과 반려

- 활성 `admin` 하나가 검토 요청·승인·반려를 수행할 수 있다. 이는 독립 승인이나
  직무 분리를 의미하지 않으며 역할 분리와 담당자 기록은 아직 구현하지 않았다.
- 승인은 다음과 같이 검토 완료 상태만 기록하며 게시하거나 공개하지 않는다. 승인 후
  내용 수정은 허용하지 않는다.

```text
review + pending + publishedAt=null
→ review + approved + publishedAt=null
```

- 반려는 다음과 같이 수정 가능한 초안으로 되돌린다. 수정 저장만으로 `rejected`가
  해제되지 않으며 재검토 요청할 때만 `pending`으로 복귀한다.

```text
review + pending + publishedAt=null
→ draft + rejected + publishedAt=null

draft + rejected + publishedAt=null
→ review + pending + publishedAt=null
```

- 결정은 `expectedUpdatedAt`을 확인하는 MongoDB `findOneAndUpdate` 하나로 원자적으로
  처리한다. 오래된 화면은 `edit_conflict`, 이미 결정된 상태는 `not_decidable`로
  구분하며 자동 재시도하지 않는다.
- 반려 사유는 현재 저장하지 않으며 결정자 기록과 함께 감사 기록 모델에서 후속
  설계한다.

## 12. 관리자 뉴스 즉시 게시

- 활성 `admin` 세션은 승인 완료 게시물을 게시할 수 있다. 독립된 게시자 역할은 없고
  게시자 정보나 담당자 기록을 저장하지 않으므로 직무 분리를 의미하지 않는다.
- 게시 조건은 삭제되지 않은 `review + approved + publishedAt=null` 게시물이며,
  `updatedAt`가 form이 읽은 값과 일치해야 한다.
- 상태 전환은 `review + approved + publishedAt=null → published + approved +
publishedAt=<server time>`이다. 서버가 만든 같은 시각을 `publishedAt`과
  `updatedAt`에 기록한다.
- 하나의 `findOneAndUpdate`가 `publicationStatus`, `publishedAt`, `updatedAt`만
  변경한다. `approvalStatus`, `createdAt`, `deletedAt`, `slug`, `category`, `title`,
  `summary`, `body`는 변경하지 않는다.
- 게시 후 기존 공개 조건인 `published + approved`, 현재 이하의 `publishedAt`,
  미삭제 조건을 만족하므로 dynamic 공개 목록과 상세의 다음 요청부터 노출된다.
- 예약 게시와 게시일 입력은 제공하지 않는다.

## 13. 향후 관리자 방향

### 게시 상태 변경

- 게시 중단은 `published + approved + publishedAt=Date → review + approved +
publishedAt=null`로 전환한다. `publicationStatus`, `publishedAt`, `updatedAt`만
  변경하므로 즉시 비공개되고 승인은 유지되며 기존 게시 기능으로 재게시할 수 있다.
  이전 게시 시각은 현재 문서에서 보존하지 않는다.
- 보관은 `published + approved + publishedAt=Date → archived + approved +
publishedAt=기존 Date`로 전환한다. `publicationStatus`, `updatedAt`만 변경해
  즉시 비공개하되 기존 게시일은 유지하며 현재는 복구·재게시할 수 없다.
- 두 전환 모두 삭제되지 않은 `published+approved` 문서와 설정된 `publishedAt`,
  일치하는 `expectedUpdatedAt`을 filter에서 확인하고 `findOneAndUpdate` 하나로
  처리한다. 오래된 화면은 `edit_conflict`, 이미 상태가 변경된 문서는
  `not_manageable`이며 자동 재시도하지 않는다.
- 현재 활성 `admin`은 게시 중단과 보관을 수행할 수 있다. 독립된 게시 관리자 역할과
  담당자 기록은 없으며 이는 직무 분리를 의미하지 않는다.

아래 항목은 구현된 기능이 아니라 향후 진행 순서다.

완료: 관리자 인증과 권한, 관리자 공통 레이아웃, 관리자 뉴스 목록 조회,
관리자 뉴스 초안 작성, 관리자 뉴스 상세 조회, 관리자 뉴스 초안 수정,
동시 수정 충돌·수정 slug 중복·수정 불가 상태 처리, 관리자 뉴스 검토 요청,
`draft → review` 원자적 상태 전환, 검토 요청 충돌 감지와 내용 수정 잠금,
검토 승인·반려, 반려 후 수정과 재검토 요청, 승인 게시물 즉시 게시,
서버 게시 시각 기록, 게시 충돌 감지와 공개 뉴스 목록·상세 연결, 공개 게시물
게시 중단·보관, 게시 중단 후 재게시, 보관 후 공개·수정·재게시 차단,
`updatedAt` 기반 게시 상태 변경 충돌 감지

### 뉴스 감사 기록

- 관리자 뉴스 변경은 append-only `news_audit_events` 컬렉션에 `draft_created`,
  `draft_updated`, `review_requested`, `review_approved`, `review_rejected`,
  `published`, `unpublished`, `archived` action으로 기록한다. 애플리케이션은 감사
  이벤트의 insert만 제공하며 수정·삭제 기능과 TTL은 제공하지 않는다.
- 뉴스 변경과 감사 이벤트 insert는 하나의 MongoDB 트랜잭션으로 처리하며 둘 중
  하나라도 실패하면 둘 다 확정하지 않는다.
- 감사 주체에는 관리자 ObjectId, 변경 당시 `displayName`, 역할만 기록한다. 관리자
  이메일, 세션 토큰, IP, User-Agent, 비밀번호는 저장하지 않는다.
- `before`와 `after`에는 slug, category, title, 게시 상태, 승인 상태, 게시일만
  기록한다. summary와 body는 `changedFields`에 변경 여부만 기록하고 전체 콘텐츠
  버전은 다음 수정 이력 작업에서 별도 모델로 설계한다.
- 감사 기록은 기능 적용 이후 성공한 변경부터 생성한다. 기존 과거 이력을 추정하거나
  backfill하지 않으며 가상 관리자를 만들지 않는다.

1. 게시물별 감사 기록 조회 화면
2. 콘텐츠 수정 버전과 전·후 비교
3. 역할·게시자 정책
4. 삭제·복구
5. 이미지와 첨부파일

## 14. 도깨비테니스 참고 범위

공개 영역과 관리자 영역의 분리, 목록과 상세 경로의 분리, DB 연결 중앙화,
공개 상태와 비공개 상태의 분리, 목록과 상세 조회 책임의 분리라는 구조적 원칙만
참고했다. 댓글, 좋아요, 조회수, 신고, 일반 사용자 게시, 비밀글, 중고거래와
커뮤니티 기능은 포함하지 않는다.

## 프로그램 콘텐츠 저장과 공개

프로그램은 뉴스와 분리된 `program_posts` 컬렉션과 repository를 사용한다. 공개 목록과 상세는 `SHALOM_CONTENT_SOURCE=mongodb`일 때만 MongoDB에서 조회하며, `fixture`와 `empty`에서는 준비 상태를 표시한다. 공개 조건은 승인 완료, 게시 상태, 유효한 게시 시각과 비삭제 상태를 모두 충족하는 것이다.

관리 흐름은 초안 → 검토 요청 → 승인 또는 반려 → 게시 → 게시 중단 또는 보관 순서다. 수정과 모든 상태 전이는 `expectedUpdatedAt`을 이용한 optimistic locking을 적용하고, 변경 및 `program_audit_events` 감사 이벤트 삽입을 같은 transaction에서 처리한다. 이 단계에는 프로그램 이미지와 활동사진 연결 기능이 없다.

## 활동사진 비공개 관리 기반

활동사진 binary는 Supabase Storage의 private bucket `shalom-gallery-private`에 저장하고, MongoDB에는 `gallery_items` 메타데이터·상태·bucket·object path와 `gallery_audit_events` 감사 기록만 저장한다. server client는 `SHALOM_SUPABASE_URL`, `SHALOM_SUPABASE_SECRET_KEY`, `SHALOM_SUPABASE_GALLERY_PRIVATE_BUCKET`을 사용하는 서버 전용 구성이며 실제 비밀 값은 문서에 기록하지 않는다.

브라우저에서 긴 변 1920px 이하, quality 0.82의 WebP로 변환한 뒤 서버가 MIME, RIFF/WEBP magic bytes, 실제 용량·크기와 SHA-256을 다시 검증한다. Storage 업로드 뒤 MongoDB metadata와 audit를 transaction으로 저장하며 실패하면 업로드 object를 보상 삭제한다. public bucket, 공개 URL과 공개 갤러리 연결은 후속 단계다.

## 활동사진 공개 미디어 경로

공개 승인된 WebP도 Supabase private bucket에 한 번만 저장한다. 서버 공개 미디어 API가 MongoDB의 게시·승인 상태, 게시 시각, 동의 준비 상태, 철회 여부와 Asia/Seoul 기준 게시 시작·종료일을 매 요청 확인한 뒤 private Storage에서 다운로드해 전달한다. public bucket, `getPublicUrl()`, `createSignedUrl()`은 사용하지 않으며 철회와 게시 중단을 다음 요청부터 반영하도록 `Cache-Control: no-store`를 적용한다.

## 자료공개 PDF 저장 구조

PDF binary는 Supabase private Storage에 `shalom-house/transparency/<ObjectId>/document.pdf` 경로의 단일 원본으로 저장하며 최대 3MB, `application/pdf`, `%PDF-` magic bytes와 SHA-256을 서버에서 검증한다. MongoDB의 `transparency_documents`와 `transparency_audit_events`에는 메타데이터·초안 → 검토 → 승인·반려 → 게시 상태와 감사만 저장한다. 개인정보 검토 완료와 최종본, 미보관·미삭제가 검토 요청 및 게시의 필수 조건이다. 공개 목록 repository와 공개 PDF API는 게시·승인·게시 시각·준비 조건을 확인하며, PDF API는 매 요청마다 조건을 다시 검사한 뒤 private object를 `Cache-Control: no-store`로 전달한다. 게시 중단 시 object는 삭제하지 않지만 다음 요청부터 404로 처리한다. public URL과 signed URL은 생성하지 않으며 공개 반환값과 화면에 Storage·감사·검토 내부 정보를 포함하지 않는다. MongoDB transaction 실패 시 최초 업로드 object를 보상 삭제한다.

## 관리자 역할 기반 권한 적용

관리자 역할은 `admin`, `editor`, `reviewer`, `publisher`로 구분한다. `admin`은 전체 권한, `editor`는 초안 작성·수정·보관·검토 요청, `reviewer`는 승인·반려 및 활동사진 동의 철회, `publisher`는 게시·게시 중단 및 활동사진 동의 철회 권한을 가진다. 모든 쓰기 API는 중앙 권한 매트릭스를 통해 권한을 서버에서 강제하고, UI의 버튼 숨김은 보조 수단으로만 사용한다. 기존 `admin` 계정의 동작은 유지한다.

## 관리자 소프트 삭제와 복구

뉴스, 프로그램, 활동사진, 자료공개 삭제는 MongoDB 문서의 `deletedAt`을 기록하는 소프트 삭제이며 영구 삭제는 지원하지 않는다. 게시 중 콘텐츠도 삭제 즉시 공개 상태가 해제된다. 활동사진 이미지와 자료공개 PDF의 Supabase Storage object는 삭제하지 않고 복구 시 그대로 재사용한다. 복구는 이전 게시 상태를 되살리지 않고 항상 `draft`·`pending` 상태로 전환하며, 검토·승인·게시 절차를 다시 거쳐야 한다. 삭제와 복구는 시스템 관리자만 수행하며 `expectedUpdatedAt` 기반 optimistic locking을 적용하고 상태 변경과 감사 이벤트를 같은 MongoDB transaction에 기록한다.

## 시스템 관리자 일반 콘텐츠 바로 게시

- 시스템 관리자는 공지사항·활동소식·프로그램 초안을 확인 checkbox로 재확인한 뒤 바로 게시할 수 있다.
- 바로 게시는 승인과 게시를 하나의 MongoDB transaction에서 처리하고 감사 기록을 남기며, UI 노출과 별도로 API가 `content.direct_publish` 권한을 강제한다.
- `editor`·`reviewer`·`publisher`의 검토 요청·승인/반려·게시 역할 분리 절차는 그대로 유지한다.
- 공개 동의가 필요한 활동사진과 개인정보·최종본 확인이 필요한 자료공개 PDF는 바로 게시 대상이 아니다.
- 내부 `news` 도메인과 경로는 유지하고 관리자 표시명만 `소식 관리`를 사용한다.

## 공식 콘텐츠 CMS 1차

시설개요와 원장 인사말은 MongoDB에서 관리하며 시스템 관리자만 수정할 수 있다. 문서가 없으면 기존 코드 기본 콘텐츠를 유지하지만 DB 장애는 기본 콘텐츠로 위장하지 않는다. 저장은 즉시 공개 페이지에 반영되고 optimistic locking을 적용하며 콘텐츠와 감사 이벤트를 같은 transaction에 기록한다. 공개 페이지의 편집 링크는 권한 있는 관리자에게만 보인다. 원장 이름은 명시적으로 공개를 설정한 경우에만 표시한다. 주민·입소자 개별 정보는 CMS 대상이 아니며 직원·생활공간 관리는 후속 단계다.

## 직원 소개 저장 구조

`staff_profiles`와 `staff_audit_events` collection을 분리하고 생성·수정을 동일 MongoDB transaction으로 처리한다. `updatedAt` 기반 optimistic locking을 사용하며 공개 repository는 공개 상태와 이름 공개 확인 조건을 runtime 검증한 최소 projection만 반환한다. 손상 문서는 개별 제외하지만 MongoDB 장애는 전파한다. 공개 페이지에는 권한 기반 관리자 편집 링크가 있으며 직원 사진과 생활공간 CMS는 후속 단계이고 입소자 프로필은 구현하지 않는다.

## 생활공간 저장 구조

생활공간은 `facility_spaces`, 감사 이력은 `facility_space_audit_events` collection에 저장한다. 수정은 `updatedAt` 기반 optimistic locking을 적용하고, 공간 저장과 감사 이벤트 생성을 동일 MongoDB transaction에서 처리한다. 공개 repository는 유효한 `published` 문서만 표시 순서대로 반환하며 내부 상태·날짜·감사·관리자 필드는 공개하지 않는다. 공개 페이지는 권한이 있는 관리자에게 관리 편집 링크를 제공한다.

## 공통 연락처 문서

`contact-information`은 기존 `site_content_documents_key_unique` 인덱스와 collection을 재사용한다. 찾아오시는 길, 문의하기, 푸터는 공통 repository를 조회한다. 외부 지도 URL과 `tel:` URL은 저장하지 않고 검증된 주소와 전화로 서버 렌더링 시 생성한다. Instagram URL은 HTTPS의 `instagram.com` 또는 `www.instagram.com`만 허용한다. optimistic locking 및 감사 이벤트의 동일 transaction 원칙을 유지한다.

## 후원 안내 공식 콘텐츠 구조

`donation-guidance`는 새 collection이나 인덱스 없이 기존 `site_content_documents`, `site_content_audit_events`, `site_content_documents_key_unique`를 재사용한다. 공개 repository는 후원 안내 문서를 runtime 검증하고 문서 부재 시 코드 기본값을 반환하지만 MongoDB 연결 장애는 전파한다. 공개 후원 페이지는 fixture를 직접 읽지 않으며, 후원 문구는 후원 안내 CMS에서 대표 전화는 연락처 CMS에서 각각 조회한다. 관리자 저장은 `expectedUpdatedAt` optimistic locking을 유지하고 문서 저장과 감사 이벤트 삽입을 같은 MongoDB transaction에서 처리한다. 계좌번호·은행명·예금주, 온라인 결제와 영수증 자동 발급은 데이터 모델과 공개 UI에 포함하지 않는다.

# 문의 저장 구조

`inquiries`, `inquiry_audit_events`, `inquiry_submission_limits` collection을 사용한다. 공개 접수번호는 unique index, 문의 및 감사 기록의 `deleteAfter`와 rate limit의 `expiresAt`은 TTL index를 사용한다. 관리자 수정과 감사 이벤트는 동일 transaction에 저장하고 `updatedAt` optimistic locking을 적용한다. 원본 IP 대신 짧은 window의 hash key만 저장한다.

## 후원 관리 저장 구조

`donors`, `donations`, `donor_audit_events`, `donation_audit_events`를 기존 collection과 분리한다. 후원금 생성 시 active 후원자를 서버에서 다시 검증하고 참조번호·표시 이름·유형 snapshot을 저장하며 익명 후원은 `donorId: null`로 저장한다. 생성·수정은 MongoDB transaction 안에서 도메인 문서와 개인정보를 최소화한 감사 이벤트를 함께 기록한다. 수정은 `updatedAt` 기반 optimistic locking을 사용한다. `confirmed` 이후 후원자·날짜·금액·방식·목적은 불변이고 `voided` 기록은 복구하지 않는다. 확정 합계는 유효한 `confirmed` 문서만 포함한다. 법정 보유기간을 가정하지 않으며 실제 삭제나 TTL index를 두지 않는다.

## 소식 미디어 저장 구조
- `news_posts`는 `coverGalleryItemId` 참조와 선택적 PDF metadata만 보유한다. 기존 필드 부재 문서와 호환하며 새 collection 또는 index를 만들지 않는다.
- PDF는 `SHALOM_SUPABASE_DOCUMENTS_PRIVATE_BUCKET`의 `shalom-house/news/<newsId>/attachments/<assetId>.pdf`에 저장하고 공개·관리자 다운로드 route가 현재 MongoDB 참조를 확인한 뒤 전달한다.
- 미디어 변경과 감사 이벤트는 optimistic locking을 적용한 동일 MongoDB transaction에서 기록한다. 업로드 뒤 DB 실패 시 새 object를 보상 삭제하고, 교체·제거 성공 뒤 이전 object 삭제 실패는 안전한 식별 정보만 기록해 후속 정리 대상으로 남긴다.
- 감사 snapshot에는 대표 참조와 PDF 존재 여부·파일명·label·크기·MIME만 포함하고 bucket, objectPath, PDF 본문은 제외한다. OCR, 내용 분석 및 다중 첨부는 범위 밖이다.

## 프로그램 미디어 저장 경계
- `program_posts`의 `coverGalleryItemId`는 `gallery_items` ObjectId만 보관하고 이미지 Storage 정보를 복제하지 않는다. `attachment`는 private documents bucket의 PDF metadata를 보관하며 필드가 없는 기존 문서도 지원한다.
- PDF objectPath는 `shalom-house/programs/<programId>/attachments/<assetId>.pdf`로 제한한다. 공개 및 관리자 다운로드는 애플리케이션 route를 통하며 Supabase 원본 URL과 signed URL을 사용하지 않는다.
- 변경은 `updatedAt` optimistic locking과 `program_audit_events`의 동일 MongoDB transaction을 사용한다. 업로드 실패 보상 삭제와 교체 후 이전 object 삭제를 응답 전에 기다리되, 이전 object 삭제 실패는 성공한 DB 참조를 유지한다.

## 관리자 계정 관리 동시성

계정 수정은 `updatedAt` optimistic locking을 사용한다. 역할·상태 변경 transaction은 `admin_user_management_state`의 `active-admin-guard` singleton 문서를 먼저 갱신하여 마지막 active admin 검사를 직렬화한다. 계정 생성·변경·세션 해제와 해당 감사 이벤트는 동일 transaction에서 처리하며, 감사 snapshot은 이메일·표시 이름·역할·상태만 포함한다.
