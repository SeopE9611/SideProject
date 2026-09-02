# 디자인 시스템

## 브랜드 방향

시각 방향의 비중은 **Institutional Portal 60 / Welfare Warmth 25 / Editorial 15**로 유지한다. 공공기관 포털의 명확한 과업 구조를 중심에 두고, 웜 뉴트럴 표면과 생활 콘텐츠로 복지기관의 온기를 더하며, 편집적 표현은 정보 위계를 돕는 범위로 제한한다.

- 공공기관의 명확성과 복지기관의 존중·따뜻함을 함께 전달한다.
- 장식보다 기관 신뢰와 사용자 과업, 실제 정보를 우선하고 감정적인 후원 유도를 하지 않는다.
- 일반 감성 문구 대신 승인된 시설 정보와 실제 생활·관계를 구체적으로 설명한다.
- 기존 UI는 보존 대상이 아니라 검토 대상이며, 같은 대형 히어로를 모든 페이지에 반복하지 않는다.

## 토큰 단일 출처와 상태

디자인 토큰의 실제 값은 `src/app/globals.css`를 단일 출처로 사용한다. 이 문서는 토큰의 의미, 허용 용도와 폐기 방향을 정의한다. Markdown과 CSS 값이 충돌하면 실제 값은 `globals.css`에서 확인하며, 토큰 값을 바꾸는 UI 작업은 이 문서와 `globals.css`를 함께 갱신한다.

컴포넌트에 임의 HEX, RGB, HSL, OKLCH 값을 직접 추가하지 않는다. Tailwind arbitrary value는 기존 토큰으로 표현할 수 없는 명확한 이유가 있고 검토 범위가 기록된 경우에만 사용한다.

- **유지**: 새 UI에서도 계속 사용하는 의미 기반 토큰이다.
- **제한 사용**: 지정된 상태나 컴포넌트에서만 사용한다.
- **점진적 폐기 검토**: 기존 랜딩페이지와 강하게 결합된 홈·히어로 토큰이다.

### 현재 토큰 분류표

여러 토큰을 묶은 행의 현재 값은 토큰 표기 순서와 같다. `--shadow-card`의 실제 값은 두 줄 선언이므로 CSS에서 확인한다.

| 분류                     | 토큰                                                                                                                                                    | 현재 값                                                                                  | 허용 용도                                      | 상태             |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------- | ---------------- |
| 기본 배경과 표면         | `--color-background`, `--color-surface`, `--color-surface-subtle`                                                                                       | `#f7f4ed`, `#ffffff`, `#eef2ee`                                                          | 페이지 배경, 기본·보조 표면                    | 유지             |
| 텍스트                   | `--color-foreground`, `--color-muted-foreground`                                                                                                        | `#202f35`, `#58655f`                                                                     | 본문과 보조 정보                               | 유지             |
| 경계                     | `--color-border`, `--color-border-strong`                                                                                                               | `#d7ddd7`, `#6f7d76`                                                                     | 구분선과 강한 경계                             | 유지             |
| 주요색                   | `--color-primary`, `--color-primary-hover`, `--color-primary-soft`, `--color-primary-foreground`                                                        | `#245246`, `#193f36`, `#e6efea`, `#ffffff`                                               | 브랜드, 주요 행동과 그 상태                    | 유지             |
| 강조색                   | `--color-accent`, `--color-accent-hover`, `--color-accent-soft`                                                                                         | `#a95336`, `#874027`, `#f4e9e3`                                                          | 제한적 강조와 상태                             | 제한 사용        |
| 상태색                   | `--color-success`, `--color-success-soft`, `--color-warning`, `--color-warning-soft`, `--color-danger`, `--color-danger-soft`                           | `#2f6b4f`, `#eaf4ee`, `#7a520f`, `#fff4d9`, `#a23b3b`, `#fbecec`                         | 성공·경고·오류의 텍스트와 표면                 | 제한 사용        |
| 어두운 표면              | `--color-on-dark`, `--color-sun-soft`                                                                                                                   | `#ffffff`, `#ead39b`                                                                     | 의미 기반 어두운 표면의 전경과 제한적 강조     | 제한 사용        |
| 홈·히어로 전용 기존 토큰 | `--color-hero-forest`, `--color-hero-clay`, `--color-hero-night`, `--color-hero-on-dark`, `--color-hero-muted`, `--color-hero-mist`, `--color-hero-sun` | `#1f493f`, `#85452f`, `#19363a`, `#ffffff`, `#edf3ef`, `#d9e5df`, `#ead39b`              | 현재 `PageHero` 등 기존 호출부 호환            | 점진적 폐기 검토 |
| 홈·히어로 전용 기존 토큰 | `--color-home-cream`, `--color-home-ink`, `--color-home-sun`, `--color-home-coral`, `--color-home-sky`, `--color-home-lilac`                            | `#f1ece2`, `#183b3b`, `#e6d7aa`, `#d9a08c`, `#b9d2c8`, `#c9c5cf`                         | 현재 `HomeHero`와 공개 페이지 기존 호출부 호환 | 점진적 폐기 검토 |
| 포커스                   | `--color-focus-ring`                                                                                                                                    | `#a95336`                                                                                | `focus-visible` 표시                           | 유지             |
| 타이포그래피             | `--text-hero`, `--text-hero-lg`, `--text-display`, `--text-display-lg`                                                                                  | `2.625rem`, `4.5rem`, `2.5rem`, `3.5rem`                                                 | 대표·디스플레이 제목                           | 제한 사용        |
| 타이포그래피             | `--text-title`, `--text-heading`, `--text-body`, `--text-small`                                                                                         | `2rem`, `1.5rem`, `1.0625rem`, `0.9375rem`                                               | 제목, 본문, 보조 정보                          | 유지             |
| 컨테이너                 | `--container-site`, `--container-content`                                                                                                               | `80rem`, `46rem`                                                                         | 전체 사이트 폭과 읽기 폭                       | 유지             |
| 간격                     | `--spacing-page`, `--spacing-page-wide`, `--spacing-section`, `--spacing-section-wide`                                                                  | `1.25rem`, `3rem`, `5rem`, `7rem`                                                        | 페이지 좌우와 섹션 간격                        | 유지             |
| 모서리                   | `--radius-control`, `--radius-card`, `--radius-panel`                                                                                                   | `0.5rem`, `0.875rem`, `1.25rem`                                                          | 컨트롤, 기능 카드, 강조 패널                   | 제한 사용        |
| 그림자                   | `--shadow-card`, `--shadow-nav`, `--shadow-elevated`                                                                                                    | CSS의 다중 그림자, `0 8px 24px rgb(32 47 53 / 0.07)`, `0 22px 54px rgb(24 59 59 / 0.14)` | 필요한 카드·내비게이션·부유 표면               | 제한 사용        |
| 모션                     | `--ease-standard`, `--motion-duration-fast`, `--motion-duration-standard`                                                                               | `cubic-bezier(0.2, 0, 0, 1)`, `150ms`, `240ms`                                           | 상태 전환과 짧은 피드백                        | 유지             |
| 모션                     | `--motion-duration-hero`                                                                                                                                | `520ms`                                                                                  | 기존 히어로 모션 호환                          | 점진적 폐기 검토 |

`home-*`, `hero-*` 토큰과 `--motion-duration-hero`는 현재 `HomeHero`, `PageHero` 및 공개 페이지가 사용하므로 당장은 유지한다. 새 페이지에서 무분별하게 확장하지 않고 UI 개편 때 의미 기반 토큰으로 교체할지 검토한다. 삭제는 실제 호출부를 제거한 뒤 별도 작업으로 진행한다.

### 배경과 표면 사용 규칙

- `--color-background`는 기존 코드 호환을 위해 유지하며 전역 캔버스 또는 제한된 중립 배경에 사용한다. 모든 섹션의 기본 배경으로 반복하지 않는다.
- 공지 목록, 본문, 상세 콘텐츠와 기관 정보 영역은 기본 콘텐츠 표면인 `--color-surface`를 우선한다.
- 웜·크림 배경은 생활 이야기와 참여 안내처럼 지정된 일부 섹션에만 사용하며 페이지 전체를 웜 아이보리로 채우지 않는다.
- 어두운 배경은 핵심 CTA 또는 중요 안내 한 곳에 제한적으로 사용하고 페이지마다 대형 어두운 패널을 반복하지 않는다. 홈과 소식 페이지에는 어두운 인용문 패널을 사용하지 않는다.

## 타이포그래피

현재 상한은 홈 대표 제목 `64px`, 일반 페이지 제목 `48px`, 목록·검색 페이지 제목 `40px`, 본문 `16~18px`, 보조 정보 `14~16px`다. 역할은 다음처럼 구분한다.

| 역할                  | 사용 기준                                                                    |
| --------------------- | ---------------------------------------------------------------------------- |
| 홈 대표 제목          | 사이트 입구의 단일 `h1`; 대형 표현은 한 화면에서 반복하지 않음               |
| 일반 페이지 제목      | 페이지 목적을 설명하는 단일 `h1`; 홈보다 낮은 위계                           |
| 목록·검색 페이지 제목 | 검색·분류 도구와 결과가 우선 보이도록 절제한 `h1`                            |
| 섹션 제목             | 주요 모듈을 구분하는 `h2`; 필요할 때 `text-display` 계열 사용                |
| 카드·목록 제목        | 항목 이름을 나타내는 `h3` 또는 문맥상 제목; `text-title`·`text-heading` 사용 |
| 본문                  | 설명과 상세 콘텐츠; `text-body`와 읽기 폭 사용                               |
| 보조 정보             | 부연 설명·도움말; 본문보다 낮되 읽을 수 있는 대비 유지                       |
| 메타데이터            | 날짜·분류·파일 정보; `text-small`을 기본으로 관계를 명확히 함                |
| 버튼과 링크           | 동작 또는 목적이 드러나는 짧은 문구; 크기보다 의미를 우선함                  |

글자 크기만으로 제목 단계를 정하지 않는다. `h1`부터 `h3`의 문서 구조와 시각 크기는 독립적으로 관리한다. 본문은 `--container-content` 등으로 한 줄이 지나치게 길어지지 않게 한다. 한국어에는 `word-break: keep-all`과 `overflow-wrap: break-word`를 함께 사용하며 URL, 파일명과 공백 없는 문자열도 레이아웃 밖으로 넘치지 않아야 한다.

## 그리드와 반응형

- **모바일**: 단일 열이 기본이며 정보 순서와 DOM 순서를 일치시킨다. 가로 카드 나열을 강제하지 않고 기능 링크의 최소 대상 크기를 확보하며 이미지·텍스트 좌우 분할은 세로 구조로 바꾼다.
- **태블릿**: 콘텐츠 목적에 따라 1열 또는 2열을 선택한다. 탐색 카드와 소식 목록의 정보 밀도를 유지하고 데스크톱을 단순 축소하지 않는다.
- **데스크톱**: 12열 안에서 페이지 유형별 열 비율을 사용한다. 본문 읽기 폭을 제한하고 여백을 콘텐츠 부재의 대체 수단으로 쓰지 않는다.

실제 시각 검증 viewport는 `320px`, `390px`, `768px`, `1024px`, `1440px`다. 페이지 유형별 구조는 [`page-patterns.md`](./page-patterns.md), 접근성과 대상 크기는 [`accessibility.md`](./accessibility.md)를 따른다.

## 간격과 밀도

현재 spacing 토큰과 기존 spacing 시스템 안에서 페이지 시작, 일반 섹션, 기능 섹션, 목록 내부 간격을 구분한다. 모든 섹션에 같은 상하 간격을 반복하거나 빈 콘텐츠를 큰 여백으로 채우지 않는다. 정보량이 섹션 높이를 자연스럽게 결정해야 하며 고정 높이로 본문을 자르지 않는다. `min-height`는 목적이 명확한 히어로·상태 영역에만 사용한다.

### Media Absence Rule

공식 media가 없으면 큰 placeholder를 공개 화면의 focal point로 사용하지 않는다. Hero와 생활 영역은 text, service, information 중심의 완성된 fallback composition으로 전환한다.

### Density Rule

콘텐츠 양이 적으면 section도 compact해야 한다. 큰 빈 표면과 과도한 여백을 디자인 품질로 오해하지 않으며, 실제 정보량이 높이를 결정하게 한다.

### Wireframe Smell

grid placeholder, thin lines, tiny labels, numbered navigation, large empty surfaces가 동시에 반복되면 visual defect로 판정한다. 선과 번호를 줄이고 배경, 타이포그래피, 정보 우선순위로 구조를 전달한다.

## 표면과 카드

### 기본 콘텐츠 영역

본문, 공지 목록, 소개 문장, 문서 목록과 상세 콘텐츠에 사용한다. 흰색 또는 중립 배경에서 그림자 대신 제목, 여백과 구분선으로 계층을 만든다.

### 기능 카드

실제로 이동 가능한 독립 기능, 프로그램·지원 영역, 연락처·방문 정보와 활동 콘텐츠에만 명확한 테두리, 작은 모서리와 일관된 내부 간격을 사용한다. 짧은 설명 하나, 같은 내용의 반복 장식 또는 빈 공간을 채우기 위한 카드는 금지한다.

### 강조 패널

중요 공지, 참여 CTA, 긴급하지 않은 핵심 안내와 대표 문의 경로에 페이지당 최대 1개를 기본으로 사용한다. 장식용으로 반복하지 않는다.

## 버튼과 링크

외형이 아니라 실제 동작 의미로 선택한다. 링크는 경로·문서로 이동하고 버튼은 현재 맥락의 동작을 실행한다.

| 패턴             | 목적과 텍스트                                      | 상태와 표시                                                                                           |
| ---------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Primary action   | 페이지의 단일 우선 행동; 동사와 대상을 명확히 작성 | hover·active에 의미 토큰을 쓰고 `focus-visible`을 보존한다. 실행 불가 시 비활성 이유를 함께 제공한다. |
| Secondary action | 우선순위가 낮은 보조 행동                          | Primary와 시각 위계를 구분하되 동일한 focus·active 기준을 적용한다.                                   |
| Text link        | 본문 안의 관련 페이지 이동                         | hover에서도 밑줄 등 링크 단서를 유지하고 현재 페이지면 `aria-current`를 검토한다.                     |
| Navigation link  | 전역·지역 탐색                                     | 목적지 이름을 쓰고 hover, focus-visible, active/현재 위치를 색상 외에도 구분한다.                     |
| Download link    | 파일 다운로드                                      | 문서명과 형식·크기를 알리고 아이콘은 장식이면 `aria-hidden`; 다운로드 불가는 이유를 표시한다.         |
| External link    | 외부 사이트 또는 새 창 이동                        | 목적지를 쓰고 새 창이면 사전 안내한다. 화살표 아이콘은 중복 낭독되지 않게 처리한다.                   |
| Telephone link   | 승인된 번호로 전화 연결                            | 화면에 읽을 수 있는 번호·용도를 제공하고 `tel:` 동작을 예측 가능하게 한다.                            |

모든 패턴은 hover만으로 정보를 전달하지 않고 `focus-visible`과 active 피드백을 제공한다. 비활성 링크처럼 보이는 가짜 링크를 만들지 않으며 disabled 버튼은 오류 원인을 숨기는 수단으로 쓰지 않는다. 새 창·다운로드 표시는 텍스트로 사전 안내하고 아이콘과 화살표가 같은 이름을 중복 낭독하지 않도록 장식이면 `aria-hidden="true"`를 사용한다.

## 이미지 패턴

| 유형                  | 권장 비율                           | 표시와 크롭 검토                                                               |
| --------------------- | ----------------------------------- | ------------------------------------------------------------------------------ |
| 홈 대표 이미지        | `3:2` 또는 `4:3`                    | 영역을 채울 때 `object-fit: cover`; 핵심 맥락이 잘리지 않는지 전 viewport 확인 |
| 활동 카드 이미지      | `4:3`                               | 같은 목록은 비율을 통일하고 활동 도구·공간의 초점 보존                         |
| 생활 기록 이미지      | `3:2` 또는 원본 맥락에 맞는 비율    | 기록 의미가 크롭으로 바뀌지 않게 하고 필요하면 `contain` 검토                  |
| 시설 공간 이미지      | `3:2` 또는 `4:3`                    | 공간 구조와 접근 정보가 잘리지 않게 크롭 위치 확인                             |
| 목록 썸네일           | 한 목록에서 동일한 `4:3` 또는 `3:2` | `cover` 기본, 이미지 없는 항목과 정렬·대체 상태 검증                           |
| 지도 또는 위치 이미지 | 제공 원본 비율                      | 표식·경로가 잘리면 `contain`; 확대·외부 지도 경로와 실제 위치 여부를 명시      |

최종은 공개 승인된 실제 사진을 우선한다. 개발 placeholder는 중앙 fixture 정책을 따르며 실제 사진처럼 설명하지 않는다. 실제 이미지가 없을 때 인용문 패널이나 실제 사진처럼 보이는 추상 그래픽으로 대체하지 않고 데이터 상태와 대체 텍스트에서 fixture placeholder임을 구분한다. 이미지 정보·대체 텍스트 기준은 [`accessibility.md`](./accessibility.md), 상태·승인은 [`content-governance.md`](./content-governance.md)가 소유한다.

### 공식 이미지가 없는 상태

- 실제 사진처럼 보이는 가짜 시설 일러스트나 집, 나무, 가구와 인물을 단순 도형으로 묘사한 대표 placeholder를 만들지 않는다.
- 공식 이미지가 없으면 실제 시설의 외관·공간·활동을 묘사하지 않는 중립적인 미디어 상태 영역과 명시적인 준비 중 문구를 사용한다.
- placeholder에서는 이미지 영역의 비율, 텍스트 정렬과 반응형만 검증하고 승인 사진을 확보한 뒤 `official` 이미지로 교체한다.

## 공통 컴포넌트와 모션

기관 헤더·내비게이션, 브레드크럼과 소형 페이지 헤더, 홈 인트로, 공지 목록·활동 카드, 지원 영역, 문서 목록·절차, 연락·방문 패널과 푸터를 역할과 과업 기준으로 공유한다. 기존 `PageHero`를 모든 페이지의 필수 패턴으로 정의하지 않으며 `HomeHero`도 홈에 반복 적용할 일반 패턴이 아니다.

hover는 상호작용 요소에만 사용한다. 자동 재생 캐러셀, 배경 영상과 패럴랙스를 사용하지 않으며 모션을 제거해도 정보와 기능이 유지되어야 한다.
# Design V3 공개 UI 방향

## Visual Direction과 Institutional Trust

공개 화면은 `Institutional`, `Editorial`, `Calm`, `Trustworthy`, `Human`을 지향한다. 기관명·시설 유형·주소·연락·공지·활동·프로그램·공개자료·방문 경로를 장식보다 먼저 제시하고, 흰 정보 surface와 neutral canvas를 중심으로 deep forest primary와 소량의 clay accent를 쓴다.

## Editorial Composition과 Component Diversity

정보 성격에 따라 다음 composition archetype을 선택한다.

- A. Institutional Intro: 기관 정체성과 대표 행동을 담는 비대칭 도입부
- B. Quick Action Rail: 구분선과 번호로 구성한 업무 탐색
- C. Dense Notice List: feature 항목과 스캔 가능한 행 목록
- D. Editorial Media Feature: 승인 이미지 또는 명시적 fixture를 중심으로 한 생활 기록
- E. Program/Service Split: media와 구조화된 서비스 링크의 분할
- F. Transparency / Document List: 문서 상태와 공개 경로를 명확히 하는 공식 목록
- G. Participation CTA Band: 한정된 dark surface 위 참여 행동 위계
- H. Contact Utility Block: 주소·전화·방문 행동의 실용 정보 블록

홈은 최소 5종을 사용하며 연속된 3개 이상의 섹션에 같은 layout 문법을 쓰지 않는다.

## Photography & Media

실제 승인 이미지만 기관 사진으로 표시한다. 승인 이미지가 없으면 fixture임을 데이터에서 구분하고, 실제 이미지와 같은 비율을 유지하되 사람이나 시설 사진으로 오해할 묘사를 만들지 않는다. 교체 시 layout이 이동하지 않아야 한다.

## Anti-AI UI Patterns

동일한 rounded card grid, 모든 제목의 eyebrow, 의미 없는 아이콘·통계·후기, 과도한 pill·gradient·shadow, `제목 → 설명 → 화살표`의 기계적 반복을 피한다. 목록은 목록으로, 문서는 문서로, 생활 콘텐츠는 media/editorial module로 표현한다.

## Density & Rhythm

첫 화면 이후 실제 업무와 최신 정보가 즉시 이어져야 한다. split, dense list, information band, action rail의 밀도를 의도적으로 달리하며 콘텐츠 부족을 큰 빈 여백으로 감추지 않는다.

## Visual Quality Validation

typecheck는 시각 완료 조건이 아니다. `visual-quality-gate.md`에 따라 320, 390, 768, 1024, 1440 viewport와 keyboard/focus 상태를 실제 화면에서 확인한다. 미확인 항목은 PASS로 기록하지 않는다.

## Legacy Token Retirement

새 공개 UI는 `background`, `surface`, `surface-subtle`, `foreground`, `muted-foreground`, `border`, `border-strong`, `primary`, `primary-hover`, `primary-soft`, `accent`, `accent-soft`, `on-dark`, `focus-ring`을 우선한다. `home-*`, `hero-*` 토큰은 기존 하위 페이지 호환 영역으로 격리하고 새 호출을 추가하지 않으며 호출부가 사라진 뒤 제거한다.

## Home Macro Composition Rule

홈은 작은 landing section의 연속이 아니라 소수의 큰 information region으로 구성한다. 기관 소개와 주요 업무, 뉴스와 생활 정보, 참여와 신뢰·연락처럼 사용자의 과업 관계를 기준으로 묶으며 색상 교대만으로 영역을 구분하지 않는다.

- **Card budget**: Home content의 shadow content card는 `0`, large rounded content container는 최대 `2`다.
- **Background budget**: Home main macro surface는 최대 `3`개 background zone을 사용한다.
- **Eyebrow budget**: decorative eyebrow는 Home 전체에서 최대 `2`개다. 주소·전화 같은 semantic label은 제외한다.
- **No Incremental Redesign**: design reset task에서 기존 JSX section 순서를 유지한 채 색, radius, typography만 변경한 결과는 완료로 인정하지 않는다.
