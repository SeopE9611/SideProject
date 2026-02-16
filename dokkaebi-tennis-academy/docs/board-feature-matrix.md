# 게시판 기능 매트릭스

## 기준 파일
- `app/api/community/*`
- `app/api/boards/*`
- `lib/types/community.ts`
- `lib/types/board.ts`
- `lib/boards.queries.ts`

## 기능 매트릭스

| 도메인/기능 | 조회 | 작성 | 수정 | 삭제 | 신고 | 답변 | 비밀글 | 첨부 | 조회수 | 검색 |
|---|---|---|---|---|---|---|---|---|---|---|
| Community (`free/market/gear`) | O (`/api/community/posts`, `/api/community/posts/[id]`) | O (`POST /api/community/posts`) | O (`PATCH /api/community/posts/[id]`) | O (`DELETE /api/community/posts/[id]`) | O (`/report`) | X | X | O (`images`, `attachments`) | O (`/view`, `views`) | O (`q`, `searchType`) |
| Boards Notice (`notice`) | O (`GET /api/boards?type=notice`, `/api/boards/[id]`) | O (admin, `POST /api/boards`) | O (`PATCH /api/boards/[id]`) | O (`DELETE /api/boards/[id]`) | X | X | X | O (`attachments`) | O (`/api/boards/[id]/view`, `viewCount`) | O (`q`, `field`, `category`) |
| Boards QnA (`qna`) | O (`GET /api/boards?type=qna`, `/api/boards/[id]`) | O (`POST /api/boards`) | O (`PATCH /api/boards/[id]`) | O (`DELETE /api/boards/[id]`) | X | O (`/api/boards/[id]/answer`) | O (`isSecret`) | O (`attachments`) | O (`/api/boards/[id]/view`, `viewCount`) | O (`q`, `field`, `category`, `answer`) |

## API 수렴 방향
- 표준 네임스페이스: `/api/boards`
- 표준 kind: `free | market | gear | notice | qna`
- 레거시 네임스페이스(`/api/community/*`)는 마이그레이션 기간 동안 호환 레이어로 유지

## DB 컬렉션/Repository 전략 결정
- **결정:** 이중 컬렉션 유지 + 공통 Repository 계층
  - `board_posts`: notice/qna
  - `community_posts`: free/market/gear
- 이유:
  1. 기존 인덱스/운영 데이터 구조를 즉시 깨지 않음
  2. 마이그레이션 기간 동안 점진 이관 가능
  3. `lib/board.repository.ts`로 조회/식별 공통화 가능

## BoardListClient ↔ 서버 쿼리 계약 (Community)

| 쿼리 키 | BoardListClient 전송 조건 | `/api/boards` (`kind=free\|market\|gear`) 허용/동작 | `/api/community/posts` 허용/동작 |
|---|---|---|---|
| `kind` | 항상 전송 (`config.boardType`) | 필수 분기 키. `free/market/gear`일 때 community 조회 경로 사용 | 사용 안 함 |
| `type` | 항상 전송 (`config.boardType`) | community 분기에서는 무시(호환용) | 게시판 타입 필터로 사용 (`free/market/gear`) |
| `page` | 항상 전송 (기본 1) | 1 이상 정수로 보정, 기본 1 | 1 이상 정수로 보정, 기본 1 |
| `limit` | 항상 전송 (고정 10) | 1~50으로 clamp, 기본 10 | 1~50으로 clamp, 기본 10 |
| `sort` | 항상 전송 (`latest/views/likes`, 기본 latest) | `latest/views/likes/hot` 허용, 그 외 `latest` | `latest/views/likes/hot` 허용, 그 외 `latest` |
| `q` | 검색어가 있을 때만 전송 | 검색어 필터 적용 (`searchType`과 결합), 최대 100자 | 검색어 필터 적용 (`searchType`과 결합), 최대 100자 |
| `searchType` | 검색어가 있을 때 전송 (`title/author/title_content`) | `title/author/title_content` 허용, 기본 `title_content` | `title/author/title_content` 허용, 기본 `title_content` |
| `authorId` | 작성자 게시글 보기 화면에서 전송 | ObjectId 유효 시 작성자 필터 적용 | ObjectId 유효 시 작성자 필터 적용 |
| `category` | 카테고리 선택 시 전송 (`all`은 미전송) | Community 카테고리 값만 필터 적용 | Community 카테고리 값만 필터 적용 |
| `brand` | 브랜드 카테고리 + 브랜드 선택 시 전송 | brand exact match 필터 적용 | brand exact match 필터 적용 |
| `keyword`, `query` | BoardListClient는 미전송(레거시 호환) | `q`가 없을 때 대체 검색어 alias로 허용 | 미허용 |
