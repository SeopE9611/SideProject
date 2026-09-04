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

## UI 작업 절차와 완료 기준

- 디자인 개선 요청에서는 타이포그래피, 대표색, 화면 구성의 변경 전후를 먼저 제시한다. 대표 화면의 시각 방향을 다루지 않은 채 관리자 기능이나 배포 검수로 작업 중심을 옮기지 않는다. 기능 검사 통과를 디자인 개선 완료로 보고하지 않는다.
- 작업할 코드 버전, 배포 URL과 실제 확인한 화면을 구분한다. 버전이 다르면 배포 화면의 문제를 로컬 코드의 문제로 단정하지 않는다.
- 주요 사용자 과업, 사용할 콘텐츠, 부족한 콘텐츠와 첫 화면의 정보 순서를 정한 뒤 구현한다.
- 참고 사이트는 적용할 요소와 이유를 명시한다. 프로젝트의 목표 구조와 기준 화면을 판단 근거로 사용한다.
- 대표 화면은 홈, 소식 목록, 찾아오시는 길이다. 대표 화면에서 해결한 패턴을 같은 유형에 확장하며 모든 페이지를 한 번에 재설계하지 않는다.
- 콘텐츠 양별 구성과 시각 판정은 `docs/page-patterns.md`, 시각 언어는 `docs/design-system.md`를 따른다.
- 구현 전후를 같은 화면 크기에서 비교한다. 기능, 접근성, 시각 품질을 각각 판단하고 발견한 문제를 수정한 뒤 해당 화면을 다시 확인한다.
- 시각 검수를 못 했으면 코드 작업 결과와 미검증 범위를 보고한다. 정적 검사나 자체 점수만으로 디자인 완료를 선언하지 않는다.
- 수동 브라우저 점검과 캡처는 자동 E2E 실행 허가를 뜻하지 않는다. 아래 검증 명령 제한을 유지한다.

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
