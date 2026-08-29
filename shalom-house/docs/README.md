# 샬롬의 집 문서 안내

## 문서 권한

문서와 구현이 충돌할 때는 `현재 사용자의 작업 지시 → AGENTS.md → 이 문서가 지정한 기준 문서 → 실제 구현 코드 → 과거 감사·QA·작업 기록` 순서로 판단한다. 기존 UI는 보존 대상이 아니라 검토 대상이며, 기준과 충돌하면 작업 목적에 따라 변경 여부를 판단한다. 과거 QA 통과는 현재 UI의 디자인 품질을 보증하지 않고 접근성 정적 검사 통과도 시각 품질이나 실제 사용성 통과를 뜻하지 않는다. 확정되지 않은 기관 정보는 추측하지 않는다.

### 장기 기준 문서

- [`requirements.md`](./requirements.md): 제품 범위와 품질 우선순위
- [`information-architecture.md`](./information-architecture.md): 사용자 과업, 메뉴와 정보 배치
- [`design-system.md`](./design-system.md): 시각·컴포넌트 판단 기준
- [`page-patterns.md`](./page-patterns.md): 페이지 유형별 레이아웃
- [`content-governance.md`](./content-governance.md): 콘텐츠 상태, 개인정보와 승인
- [`accessibility.md`](./accessibility.md): 장기 접근성 기준과 검증 방법

각 규칙의 최종 소유 문서는 위 설명에 따른다.

### 특정 작업용 문서

- [`technical/content-platform-architecture.md`](./technical/content-platform-architecture.md): 뉴스·CMS 기술 구조
- [`operations/official-content-intake.md`](./operations/official-content-intake.md): 공식 콘텐츠 수집과 승인

### 참고 기록

- [`audits/**`](./audits/): 날짜별 감사·QA 기록

감사 기록은 당시 구현과 실행 범위를 설명할 뿐, 현재 구현을 보존하도록 강제하지 않는다.

## 작업 유형별 필독 문서

| 작업 유형 | 필독 문서 |
| --- | --- |
| 공개 UI | requirements, information-architecture, design-system, page-patterns, accessibility |
| 공개 콘텐츠 | requirements, content-governance, operations/official-content-intake |
| 뉴스·CMS | technical/content-platform-architecture, content-governance |
| 관리자 기능 | requirements, technical/content-platform-architecture, accessibility |
| QA | page-patterns, design-system, accessibility, 해당 작업 요구사항 |

## 문서 유지 원칙

- 같은 규칙을 여러 문서에 반복하지 않고 최종 소유 문서에서 관리한다.
- 구현 변경 시 관련 기준 문서를 함께 갱신한다.
- 일회성 결과를 기준 문서에 섞지 않는다.
- 과거 감사 문서는 날짜별 참고 기록으로만 유지한다.
