<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# 샬롬의 집 프로젝트 규칙

## 규칙 우선순위

1. 현재 사용자의 작업 지시
2. 이 `AGENTS.md`
3. `docs/README.md`가 지정한 기준 문서
4. 실제 구현
5. 과거 감사·QA·작업 기록

기존 UI는 보존 대상이 아니라 목표에 비추어 검토할 대상이다. 기준 문서와 코드가 충돌하면 코드를 무조건 유지하지 말고 작업 목적에 따라 검토한다. 과거 QA 통과나 접근성 정적 검사 통과는 디자인 품질, 시각 품질 또는 실제 사용성을 보증하지 않는다. 확정되지 않은 기관 정보는 추측하지 않는다.

## 작업 전 조사

- 대상 페이지와 공통 컴포넌트의 import 및 호출 관계를 확인한다.
- 관련 기준 문서와 작업별 문서를 확인한다.
- 실제 배포 화면이나 사용자가 제공한 캡처를 확인한다.
- 현재 구현과 목표 구조를 구분한다.
- 확인되지 않은 파일, 함수, 콘텐츠를 추측하지 않는다.

## 제품 우선순위

1. 기관 신뢰
2. 정보 탐색과 사용자 과업
3. 접근성
4. 실제 생활과 활동 기록
5. 장식과 모션

## 금지 패턴

- 모든 페이지에 동일한 대형 히어로를 반복하지 않는다.
- `라벨 → 거대한 제목 → 설명 → 화살표 링크` 패턴을 반복하지 않는다.
- 어느 복지기관에도 적용할 수 있는 일반적인 감성 문구를 만들지 않는다.
- 화면을 채우기 위한 의미 없는 숫자, 아이콘, 카드를 만들지 않는다.
- 확인되지 않은 통계, 연혁, 계좌, 프로그램, 모집 상태를 작성하지 않는다.
- 스톡 인물이나 AI 인물을 실제 거주인처럼 표현하지 않는다.
- 시각 검증을 실행하지 않고 UI 검증을 통과했다고 기록하지 않는다.
- 기존 구현을 문서보다 우선해 무조건 보존하지 않는다.

## 작업 범위 통제

- 필요한 최소 파일만 수정하고 관련 없는 리팩터링을 하지 않는다.
- 새 패키지를 설치하거나 의존성을 변경하지 않는다.
- 범위 밖 문제는 임의로 수정하지 않고 확인 사항에 기록한다.
- 감사·보고 목적의 Markdown 문서를 임의로 만들지 않는다.
- 사용자가 요청한 문서만 생성한다.

## 공개 UI 디자인 작업

### 기존 UI 비보존 원칙

“최소 수정”은 기존 시각 구조를 보존하라는 뜻이 아니다. UI 리디자인의 최소 범위는 해당 사용자 경험을 완성하는 데 필요한 공개 UI 범위 안에서만 작업한다는 뜻이다. 잘못된 UI를 유지한 채 `className` 몇 개만 수정하는 것을 최소 수정으로 판단하지 않는다.

### Visual First Workflow

1. 실제 코드와 데이터 계약 확인
2. 현재 화면 구조 분석
3. 관련 page pattern 확인
4. 목표 wireframe 작성
5. implementation
6. viewport 시각 검증
7. typecheck/diff 검증

### 완료 금지

시각 작업은 화면을 직접 확인하지 않고 `디자인 완료`, `UI QA 완료`, `반응형 완료`라고 보고하지 않는다. 브라우저 또는 preview 도구가 없는 환경에서는 `시각 검증 미실행`으로 명확히 보고한다.

## 기본 검증 명령

- `pnpm typecheck`
- `grep`
- `rg`
- `find`
- `git diff`
- `git diff --check`

사용자가 명시적으로 요청하지 않으면 `pnpm lint`, `pnpm build`, 전체 테스트, E2E, Cypress, Playwright를 실행하지 않는다.

## 결과 보고 형식

- 실제 수정 파일
- 파일별 수정 내용
- 실행 명령과 결과
- 실행하지 않은 검증
- 남은 위험
- 확인 필요 사항
