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
- `news.pagination.ts`: 공개 목록 limit와 관리자 page를 정규화한다.
- `news.mongo-repository.ts`: 공개 뉴스 목록과 상세 읽기만 담당한다.
- `news.admin-repository.ts`: 관리자 전용 뉴스 목록·상세 읽기를 담당한다.

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

1. 수정 이력과 감사 기록
2. 역할·게시자 정책
3. 삭제·복구
4. 이미지와 첨부파일

## 14. 도깨비테니스 참고 범위

공개 영역과 관리자 영역의 분리, 목록과 상세 경로의 분리, DB 연결 중앙화,
공개 상태와 비공개 상태의 분리, 목록과 상세 조회 책임의 분리라는 구조적 원칙만
참고했다. 댓글, 좋아요, 조회수, 신고, 일반 사용자 게시, 비밀글, 중고거래와
커뮤니티 기능은 포함하지 않는다.
