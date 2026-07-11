# Dokkaebi Design System V2 전략

## 1. 디자인 콘셉트

- **Dokkaebi Tennis Lab**: 라켓 케어, 플레이 데이터, 서비스 추천을 실험실처럼 정밀하게 보여주는 브랜드 경험입니다.
- **Premium Tennis Tech**: 기존 Premium Monotone의 차분한 아이보리 기반 위에 딥 블랙 표면과 라임 신호를 더해 기술적이고 선명한 인상을 만듭니다.
- **아이보리/블랙/라임**: 아이보리는 기본 표면, 블랙은 가치 설명·Hero 역상 섹션, 라임은 브랜드 신호와 핵심 CTA에 제한적으로 사용합니다.

## 2. 토큰 의미

- `primary`는 기존 주요 인터랙션과 일반 CTA의 기준 토큰입니다. 기존 화면의 기본 버튼과 주요 액션 안정성을 유지합니다.
- `brand-highlight`는 Dokkaebi Design System V2 전용 브랜드 강조 토큰입니다. Hero의 강한 CTA, NEW/기능 안내, 브랜드 시그널에 사용하며 모든 CTA를 대체하지 않습니다.
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

## 7. 단계별 적용 로드맵

- PR 1 기반: 토큰, Tailwind 매핑, primitive variant, 정책 문서만 준비합니다.
- PR 2 라켓 케어: 라켓 케어 페이지에 Hero, 상태 카드, 부유 정보 카드 패턴을 적용합니다.
- PR 3 홈: 홈 Hero와 주요 마케팅 섹션에 역상 표면과 라임 CTA를 적용합니다.
- 이후 상품/서비스/마이페이지/체크아웃/관리자: 화면 성격에 맞춰 적용 강도를 조절합니다.
