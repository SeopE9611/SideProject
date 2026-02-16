# Community/Boards 첨부 URL 검증 정책

## 적용 범위
- `POST /api/community/posts`
- `PATCH /api/community/posts/[id]`
- `POST /api/boards` (첨부 URL 필터링 시 동일 정책 함수 사용)

## URL 허용 정책
공통 유틸(`lib/boards-community-url-policy.ts`)에서 아래 정책을 강제한다.

1. **스킴:** `https`만 허용
   - `javascript:`, `data:`, `vbscript:`, `file:` 등은 모두 차단
   - `http:`도 차단
2. **호스트:** 화이트리스트 기반
   - `cwzpxxahtayoyqqskmnt.supabase.co`
3. **경로 Prefix:** 화이트리스트 기반
   - `/storage/v1/object/public/tennis-images/`

## 비허용 URL 처리 방식

### Community API (`/api/community/posts*`)
- 정책: **요청 거부(Reject)**
- 동작: 이미지(`images`) 또는 첨부(`attachments[].url`) 중 하나라도 비허용 URL이면 요청을 실패 처리한다.

#### 에러 응답
- HTTP Status: `400`
- `error`: `invalid_attachment_url`
- `message`: 정책 안내 문구
- `details`: 실패한 필드 경로(`path`), 실패 사유(`message`), 원본 값(`value`)

예시:

```json
{
  "ok": false,
  "error": "invalid_attachment_url",
  "message": "허용되지 않은 첨부 URL입니다. HTTPS + 허용 호스트/경로 정책을 확인해 주세요.",
  "details": [
    {
      "path": ["attachments", 0, "url"],
      "message": "허용되지 않은 URL(invalid_scheme)",
      "value": "javascript:alert(1)"
    }
  ]
}
```

### Boards API (`POST /api/boards`)
- 정책: 기존 동작 유지(**필터 제거**)
- 동작: 비허용 URL 첨부는 저장 목록에서 제거하고 나머지 유효 첨부만 저장한다.
- 단, 검증 로직 자체는 community와 동일한 공통 유틸을 사용한다.

