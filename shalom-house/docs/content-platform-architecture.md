# 뉴스 콘텐츠 플랫폼 아키텍처

## 1. 현재 단계

공개 뉴스 읽기 기반에 더해 MongoDB 관리자 계정, scrypt 비밀번호 해시,
MongoDB 세션, 로그인 제한, 관리자 로그인·로그아웃, 관리자 보호 레이아웃과
대시보드와 관리자 뉴스 목록 조회를 제공한다. 관리자 뉴스 목록의 분류·게시 상태·
승인 상태 필터, 페이지 이동과 현재 공개 여부 표시는 완료했으며 콘텐츠 쓰기 기능은
아직 구현하지 않았다. 작성, 수정, 검토 요청, 승인, 게시·보관, 삭제·복구는 후속
작업 범위다.

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
- `news.admin-repository.ts`: 관리자 전용 뉴스 목록 읽기를 담당한다.

## 8. 향후 관리자 방향

아래 항목은 구현된 기능이 아니라 향후 진행 순서다.

완료: 관리자 인증과 권한, 관리자 공통 레이아웃, 관리자 뉴스 목록 조회

1. 게시물 작성
2. 게시물 수정
3. 검토 요청
4. 최종 승인
5. 공개·비공개·보관
6. 수정 이력과 감사 기록
7. 이미지와 첨부파일

## 9. 도깨비테니스 참고 범위

공개 영역과 관리자 영역의 분리, 목록과 상세 경로의 분리, DB 연결 중앙화,
공개 상태와 비공개 상태의 분리, 목록과 상세 조회 책임의 분리라는 구조적 원칙만
참고했다. 댓글, 좋아요, 조회수, 신고, 일반 사용자 게시, 비밀글, 중고거래와
커뮤니티 기능은 포함하지 않는다.
