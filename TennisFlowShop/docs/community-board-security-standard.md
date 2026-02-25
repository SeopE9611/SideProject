# 게시판/커뮤니티 Mutating API 보안 표준

## 1) Mutating API 목록

### 커뮤니티
- `POST /api/community/posts`
- `PATCH /api/community/posts/:id`
- `DELETE /api/community/posts/:id`
- `POST /api/community/posts/:id/comments`
- `PATCH /api/community/comments/:id`
- `DELETE /api/community/comments/:id`
- `POST /api/community/posts/:id/like`
- `POST /api/community/posts/:id/report`
- `POST /api/community/comments/:id/report`
- `POST /api/community/posts/:id/view`

### 게시판
- `POST /api/boards`
- `PATCH /api/boards/:id`
- `DELETE /api/boards/:id`
- `POST /api/boards/:id/answer`
- `PATCH /api/boards/:id/answer`
- `DELETE /api/boards/:id/answer`

---

## 2) CSRF 보호 표준

모든 mutating API는 `verifyCommunityCsrf()` 공통 헬퍼를 사용해 아래 3단계를 동일하게 검증한다.

1. **Same-site 정책 검사 (`Sec-Fetch-Site`)**
   - 허용: `same-origin`, `same-site`
   - 거부: `cross-site` 및 기타 비허용 값

2. **Origin/Referer 검증**
   - `Host`, `NEXT_PUBLIC_SITE_URL`, `NEXTAUTH_URL` 기반 allowlist와 비교
   - 비허용 origin/referer는 403으로 거부

3. **CSRF 토큰(Double Submit Cookie) 검증**
   - 헤더: `x-community-csrf-token`
   - 쿠키: `communityCsrfToken`
   - 두 값이 모두 존재하고 일치해야 통과

> 정책 요약: **Same-site + Origin/Referer + 토큰**을 모두 공통 로직으로 강제한다.

---

## 3) 신고/좋아요/조회수 Rate Limit 공통 정책

`enforceCommunityRateLimit()` 헬퍼를 사용하며, 사용자/클라이언트 IP를 각각 검사한다.

- 신고(`community_report`)
  - 사용자: 분당 5회
  - IP: 분당 20회
- 좋아요(`community_like`)
  - 사용자: 분당 60회
  - IP: 분당 120회
- 조회수(`community_view`)
  - 사용자: 분당 120회
  - IP: 분당 240회

초과 시 429 반환, `Retry-After` 헤더를 함께 제공한다.

---

## 4) 실패 응답 코드 표준

### CSRF
- `403 csrf_invalid_fetch_site`
- `403 csrf_invalid_origin`
- `403 csrf_invalid_referer`
- `403 csrf_missing_token`
- `403 csrf_token_mismatch`

응답 본문 공통 필드:

```json
{
  "ok": false,
  "error": "csrf_token_mismatch",
  "security": {
    "code": "csrf_token_mismatch",
    "category": "csrf"
  }
}
```

### Rate Limit
- `429 too_many_requests`

응답 본문 공통 필드:

```json
{
  "ok": false,
  "error": "too_many_requests",
  "security": {
    "code": "rate_limited",
    "category": "rate_limit",
    "routeId": "community_like",
    "scope": "user",
    "retryAfterSec": 17
  }
}
```

---

## 5) 운영 로그 필드 표준

CSRF/Rate limit 실패 로그에는 아래 필드를 포함한다.

- 공통
  - `msg`
  - `status`
  - `durationMs`
  - `method`, `path`, `ip`, `ua` (`reqMeta`)
- CSRF
  - `extra.reason` (예: `csrf_invalid_origin`)
- Rate limit
  - `extra.scope` (`user` 또는 `ip`)
  - `extra.userId` 또는 `extra.reporterUserId` (가능할 때)

운영팀은 위 필드를 기준으로 경보/탐지 규칙을 통일한다.
