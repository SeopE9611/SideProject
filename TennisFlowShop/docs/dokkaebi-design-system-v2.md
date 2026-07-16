# Dokkaebi Design System V2 전략

## 1. 디자인 콘셉트

- **Dokkaebi Tennis Lab**: 라켓 케어, 플레이 데이터, 서비스 추천을 실험실처럼 정밀하게 보여주는 브랜드 경험입니다.
- **Premium Tennis Tech**: 기존 Premium Monotone의 차분한 아이보리 기반 위에 딥 블랙 표면과 라임 신호를 더해 기술적이고 선명한 인상을 만듭니다.
- **아이보리/블랙/라임**: 아이보리는 기본 표면, 블랙은 가치 설명·Hero 역상 섹션, 라임은 브랜드 신호와 핵심 CTA에 제한적으로 사용합니다.

## 2. 토큰 의미

- `primary`는 기존 주요 인터랙션과 일반 CTA의 기준 토큰입니다. 기존 화면의 기본 버튼과 주요 액션 안정성을 유지합니다.
- `brand-highlight`는 Dokkaebi Design System V2 전용 브랜드 강조 토큰입니다. 채움 CTA, stroke/progress, inverse surface 위 숫자·시그널에 제한적으로 사용하며 모든 CTA를 대체하지 않습니다.
- `brand-highlight-muted`는 옅은 브랜드 표면, 선택 상태의 soft background, feature icon background에 사용합니다.
- `brand-highlight-ink`는 라이트/중립 표면 위 브랜드 텍스트·아이콘, `brand-highlight-muted` 위 전경, 작은 화살표와 kicker에 사용합니다.
- `brand-highlight`는 `success`가 아닙니다. 저장 완료, 정상 처리, 안전 상태 같은 상태 의미는 반드시 `success`를 사용합니다.
- `surface-inverse`는 딥 블랙형 Hero, 가치 설명 섹션, 역상 카드처럼 명확한 마케팅 대비가 필요한 영역에만 사용합니다.
- `outline-text`는 Hero 제목의 외곽선 표현을 위한 토큰이며 본문, 폼, 버튼 텍스트에는 사용하지 않습니다.

## 3. 적용 강도

- 홈/소개: 강함. Hero, 역상 섹션, 라임 CTA를 가장 적극적으로 사용할 수 있습니다.
- 라켓 케어/마이페이지 허브: 중간~강함. 상태 카드와 핵심 안내에는 사용할 수 있으나 실제 상태색은 분리합니다.
- 상품: 중간. 프로모션이나 기능 강조에 제한적으로 사용합니다.
- 체크아웃/관리자: 약함. 결제 안정성, 업무 효율, 정보 위계를 우선하며 마케팅 레이아웃을 강제하지 않습니다.

## 4. 사용 예시

- Hero: `font-brand-display`, `text-ui-display`, `text-brand-outline`, `Button`의 `highlight` variant를 조합합니다.
- 상태 카드: `Card`의 `feature` variant로 라켓 케어 핵심 상태를 담되, 상태 의미는 `success`/`warning`/`destructive` 토큰으로 표시합니다.
- 역상 가치 설명 섹션: 섹션 표면은 `bg-surface-inverse`, 텍스트는 `text-surface-inverse-foreground`와 `text-surface-inverse-muted`를 사용합니다.
- 부유 정보 카드: `Card`의 `floating` variant로 D-day, 플레이 빈도, 텐션 정보 같은 보조 정보를 배치합니다.
- 브랜드 강조 Badge: 기능 안내, NEW, 라켓 케어 기능 라벨에는 `Badge`의 `signal` 또는 `signal_solid` variant를 사용합니다.

## 5. 금지 사항

- 모든 CTA를 라임으로 만들지 않습니다.
- 상태색을 라임으로 대체하지 않습니다.
- 모든 화면에 outline text를 사용하지 않습니다.
- 체크아웃과 관리자에 마케팅 레이아웃을 강제하지 않습니다.
- raw lime/black/white 클래스 또는 컴포넌트 내부 hex 값을 사용하지 않습니다.

## 6. 반응형 원칙

- 모바일 360px을 우선 기준으로 검토합니다.
- Hero는 좁은 화면에서 1열로 전환합니다.
- 부유 카드는 모바일에서 절대 배치 대신 일반 문서 흐름으로 이동합니다.
- CTA 그룹은 모바일에서 1열을 기본으로 합니다.
- 긴 한국어 문구는 줄바꿈을 허용하고, 의미가 잘리지 않도록 `break-keep`만 과도하게 강제하지 않습니다.

## 7. 타이포그래피 렌더링 정책

- `font-brand-display`는 40px 이상 Hero/Display 전용으로 사용합니다. 대형 상태 점수 숫자에는 사용할 수 있지만, `letter-spacing: -0.04em` 특성 때문에 카드 제목, 버튼, 폼, 본문에는 사용하지 않습니다.
- `font-brand-heading`은 20px 이상의 짧은 브랜드 섹션 제목에 사용합니다. `letter-spacing: -0.015em`을 적용하며, 긴 본문이나 라켓명·날짜·D-day 같은 데이터값에는 사용하지 않습니다.
- 기본 본문 서체인 Spoqa Han Sans Neo는 19px 이하 카드 제목, 본문, 버튼, Badge, 입력 폼, 라켓명, 날짜, D-day 등 실사용 데이터에 사용합니다. 작은 한글 문장과 정보값은 기본 서체에서 `font-weight: 700` 수준으로 위계를 만듭니다.
- `text-brand-outline`은 40px 이상의 Hero 한 줄 또는 짧은 구절에만 허용합니다. 전체 제목에 광범위하게 적용하지 않고, 버튼·본문·카드 제목에는 사용하지 않습니다. Stroke는 `clamp(1px, 0.025em, 2px)` 범위로 제한합니다.
- 작은 글자에 `font-brand-display`를 사용하거나 본문에 과도한 negative tracking을 적용하지 않습니다. font smoothing 해킹, transform을 이용한 텍스트 렌더링 보정, 스크린샷 축소본만 기준으로 한 선명도 판정은 금지합니다.

## 8. 단계별 적용 로드맵

- PR 1 기반: 토큰, Tailwind 매핑, primitive variant, 정책 문서만 준비합니다.
- PR 2 라켓 케어: 라켓 케어 페이지에 Hero, 상태 카드, 부유 정보 카드 패턴을 적용합니다.
- PR 3 홈: 홈 Hero와 주요 마케팅 섹션에 역상 표면과 라임 CTA를 적용합니다.
- PR 4 / Phase 4A: 마이페이지 디자인 시스템 기반
  - DashboardSectionPanel
  - 공용 surface
  - radius/shadow
  - 접근성 연결
- PR 4 / Phase 4B: 마이페이지 체감형 UX/UI
  - compact dashboard hero
  - racket care + activity bento
  - mobile navigation rail
  - segmented order scope
  - transaction flow card
  - next action hierarchy
- 이후 상품/서비스/체크아웃/관리자: 화면 성격에 맞춰 적용 강도를 조절합니다.

## Phase 5 색상·업무 액션 규칙

- 업무형 Hero에서는 라임 CTA 대신 inverse CTA를 사용할 수 있으며, 라임은 큰 수치와 작은 signal에 집중할 수 있습니다.
- 업무 리스트에서 반복되는 필수 처리 액션은 `highlight_soft` 같은 soft brand action을 사용하고, default primary와 filled highlight를 목록 전체에 반복하지 않습니다.
- 후기 작성, 추천 확인처럼 선택적인 활동은 warning이 아니며 `secondary` 또는 `outline` 계열로 표현합니다.

## Phase 6 / V2.1 Interaction Foundation

SSOT: `docs/dokkaebi-v2-interaction-responsive-policy.md`

- `IdentityBadge`로 identity와 status 의미 체계를 분리한다.
- `ResponsiveActionGroup`으로 transaction action 배치를 표준화한다.
- `StickyAside`로 fixed Header 하단 sticky offset을 표준화한다.
- destination navigation은 모바일 hidden scroll을 금지한다.
- segmented filter navigation은 5개 이하 항목을 equal-width grid로 표시한다.
- Home/Racket Care/Mypage CTA는 canonical Button recipe를 사용한다.
- Mypage를 V2.1 reference implementation으로 유지한다.

## Phase 7A / V2.2 Commerce Discovery Foundation

Commerce Discovery는 중간 강도의 V2 적용 영역이다. 결과 패널, 툴바, 활성 필터, 필터 패널 shell, 카드 frame, 가격, 평점, skeleton을 공용 문법으로 맞추되 상품 재고·스트링 성능·라켓 컨디션·구매/대여 판정은 각 도메인 컴포넌트에 남긴다.
