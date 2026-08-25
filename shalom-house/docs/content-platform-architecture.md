# 뉴스 콘텐츠 플랫폼 아키텍처

## 1. 현재 단계

공개 뉴스 읽기 기반에 더해 MongoDB 관리자 계정, scrypt 비밀번호 해시,
MongoDB 세션, 로그인 제한, 관리자 로그인·로그아웃, 관리자 보호 레이아웃과
대시보드, 뉴스 관리 준비 경로를 제공한다. 콘텐츠 쓰기 기능은 아직 구현하지 않았다.

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

## 7. 향후 관리자 방향

아래 항목은 구현된 기능이 아니라 향후 진행 순서다.

완료: 관리자 인증과 권한, 관리자 공통 레이아웃

1. 뉴스 목록 관리
2. 작성·수정
3. 검토 요청
4. 최종 승인
5. 공개·비공개·보관
6. 수정 이력과 감사 기록
7. 이미지와 첨부파일

## 8. 도깨비테니스 참고 범위

공개 영역과 관리자 영역의 분리, 목록과 상세 경로의 분리, DB 연결 중앙화,
공개 상태와 비공개 상태의 분리, 목록과 상세 조회 책임의 분리라는 구조적 원칙만
참고했다. 댓글, 좋아요, 조회수, 신고, 일반 사용자 게시, 비밀글, 중고거래와
커뮤니티 기능은 포함하지 않는다.
