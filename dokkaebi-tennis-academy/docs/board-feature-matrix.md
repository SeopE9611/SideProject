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

