# Dokkaebi Design System V2.1 — Interaction & Responsive Policy

## Button 역할

- `highlight`: 홈·라켓 케어 등 마케팅/탐색 페이지의 page-level 핵심 CTA. 한 section에 반복 사용하지 않는다.
- `inverse`: `surface-inverse` Hero 내부 핵심 CTA. 검은 표면 위 아이보리 버튼이다.
- `highlight_soft`: 리스트에 반복되는 필수 처리 명령. 운송장 등록, 확정, 수령 확인 등에 사용하며 filled lime을 반복하지 않는다.
- `secondary`: 후기 작성, 선택 활동, 낮은 우선순위 기능.
- `outline`: 상세 보기, 보조 이동, 이전/취소가 아닌 일반 secondary navigation.
- `destructive`: 삭제, 탈퇴, 취소 확정 등 실제 위험 행동.

## 버튼 한 줄 정책

Transaction command는 label을 한 줄로 유지하고 `whitespace-nowrap`을 사용한다. 줄바꿈으로 공간 문제를 해결하지 않으며, 공간이 부족하면 primary action을 독립된 full-width 행으로 이동한다. 필요하면 화면 label을 짧게 하고 `aria-label` 또는 `title`에 전체 의미를 제공한다.

Transaction command: 운송장 등록, 운송장 수정, 구매 확정, 수령 확인, 교체서비스 신청, 교체서비스 확정, 후기 작성, 상세 보기.

설명형 마케팅 CTA나 매우 긴 선택 문구에서만 제한적으로 wrap을 허용한다.

## Action group

모바일:

```text
[Primary action                         ]
[Detail action                    ][…]
```

Primary가 없을 때:

```text
[Detail action                    ][…]
```

더보기 action이 없을 때:

```text
[Detail action                         ]
```

데스크톱 action column도 동일한 문법을 사용하되 column 폭을 충분히 확보한다.

## Navigation 종류

### Destination navigation

페이지의 최상위 목적지는 모든 항목이 한눈에 보여야 한다. 모바일 hidden horizontal scroll은 금지하고 grid 또는 wrap을 사용한다. 예: 마이페이지 거래/클래스/찜/리뷰/문의/패키지/포인트.

### Segmented filter navigation

5개 이하 scope·filter는 모바일에서도 모두 표시한다. short label을 허용하고 equal-width grid를 우선한다. 예: 전체/확인/주문/서비스/대여.

### Category rail

브랜드·카테고리처럼 항목 수가 많은 경우만 horizontal scroll을 허용한다. 좌우 fade 또는 chevron 등 스크롤 단서를 제공하고, scrollbar를 숨겼다면 단서가 필수이며 active item은 자동 노출한다.

## Sticky aside

`top = var(--header-h) + 16px`, `max-height = 100svh - header height - 32px`, `overflow-y = auto`, `overscroll = contain`을 사용한다. 화면별로 `top-8`, `top-20`, `top-24`를 임의 지정하지 않는다.

## Identity와 status 구분

Identity는 `admin`, `kakao`, `naver`, `email`로 분리한다. Workflow status는 `success`, `warning`, `info`, `danger`, `neutral` 의미로만 사용한다. 카카오를 warning, 네이버를 success로 표현하지 않는다.

## 반응형 구간

- 360~575px: mobile. 정보·action 1열 중심. 모든 top destination을 compact grid로 표시.
- 576~767px: large mobile / small tablet. 7개 destination 1행 가능. Hero는 콘텐츠 폭을 확인해 1열 또는 2열.
- 768~1199px: tablet / compact desktop. Hero와 overview 2열. desktop sidebar는 아직 숨길 수 있음. mobile-style navigation을 단순 확대하지 않음.
- 1200px 이상: wide desktop. sidebar + main content.
