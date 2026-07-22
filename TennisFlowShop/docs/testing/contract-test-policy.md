# 계약 테스트 정책

## Core (병합 차단)

Core 계약은 실제 실행 결과로 인증·권한·CSRF, 비회원 접근 토큰, 결제·주문·재고·포인트,
상태 전이, 공개 후기 노출 정책, API 상태/오류 코드와 캐시 정합성을 검증한다. 이 영역은
보안·권한·결제·주문·재고를 포함하므로 advisory로 낮추지 않는다.

## Advisory (비차단)

변수명, helper명, 줄바꿈, 코드 순서, Tailwind 클래스, 정확한 JSX/UI 문구처럼 동일한 동작의
리팩터링에도 깨지는 검사는 `test:contract:advisory`에 둔다. 실패는 GitHub Actions warning과
summary로 남기되 병합을 차단하지 않는다. 중요한 UI 결과는 문자열 검사가 아니라 렌더링
테스트로 승격한다.

새 계약 테스트는 추가 시 core/advisory 분류와 이유를 명시한다. exact source string 검사는
운영 행위를 보장하지 않으므로 core의 근거로 사용하지 않는다.

현재 분류는 실행 manifest로 추적한다. `run-contract-tests.mjs`는 핵심 계약과 실행 가능한
후기 캐시 검증을, `run-advisory-contract-tests.mjs`는 `display-policy`, `review-domain`,
`review-api-policy`, `review-management-context` 및 UI 중심 계약을 실행한다. 특히
`review-summary-cache`의 공개 집계·캐시 갱신 fixture 검증은 core에 남기고, 과거
`body.rating !== undefined || body.status || body.visibility` 소스 문자열 assertion은
moderationStatus 정규화 이후의 구현 형태를 고정하므로 제거했다.
