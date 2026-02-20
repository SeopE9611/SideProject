# 라이트/다크 의미 일관성 체크리스트

## 목적
- 라이트/다크 모두에서 **동일 역할(본문/보조/상태/CTA)**의 의미가 유지되는지 페이지 단위로 확인한다.
- 직접 `dark:*` 보정보다 `bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground` 같은 의미 토큰과 공통 UI variant를 우선 사용한다.

## 공통 점검 기준
- 본문 텍스트: `text-foreground`
- 보조 텍스트: `text-muted-foreground`
- 기본 표면: `bg-background`
- 카드/패널 표면: `bg-card`
- 상태 강조(성공/경고/에러): `Badge` variant (`success`, `warning`, `danger`)
- CTA: `Button` variant (`default`, `accent`, `destructive`, `muted`)

## 페이지별 체크리스트

### 1) Cart (`app/cart`)
- [ ] 카드/패널 배경이 `Card` variant(`outline`/`muted`)로 통일되어 있는가?
- [ ] 위시리스트 액션 버튼이 `Button` variant + 최소 className 확장으로 표현되는가?
- [ ] 상태 메시지(보조 안내/에러 안내)가 `text-muted-foreground`/`text-destructive` 기반으로 통일되는가?

### 2) Board (`app/board`)
- [ ] 게시글 본문/제목 대비가 라이트/다크에서 동일한 정보 계층을 보이는가?
- [ ] 태그/상태 뱃지가 개별 `dark:*` 없이 `Badge` variant로 표현되는가?
- [ ] 목록 hover/선택 배경이 의미 토큰(`bg-muted`, `bg-accent`) 중심인가?

### 3) Services (`app/services`)
- [ ] 신청/결제 CTA가 페이지 전반에서 동일한 `Button` variant를 사용하는가?
- [ ] 요약 카드/정보 카드가 `bg-card` 또는 `Card` variant로 일관적인가?
- [ ] 경고/검증 문구의 색 의미(성공/경고/에러)가 라이트/다크에서 뒤바뀌지 않는가?

### 4) Mypage (`app/mypage`)
- [ ] 탭/리스트의 본문·보조 텍스트가 각각 `text-foreground`/`text-muted-foreground`로 유지되는가?
- [ ] 상태 뱃지와 액션 버튼이 컴포넌트 variant 우선으로 표현되는가?
- [ ] skeleton/placeholder 배경이 모드별로 의미가 동일한가?

### 5) Admin (`app/admin`)
- [ ] 데이터 테이블 헤더/본문/보조 텍스트 대비가 라이트/다크 모두 충분한가?
- [ ] 위험 액션(삭제/차단)이 `destructive` 계열 variant로 일관적인가?
- [ ] 필터/패널/모달 배경의 의미가 페이지 전체에서 일관적인가?

## 최종 재검토 규칙
1. `dark:*`가 있어도 **동일 토큰의 중복 표기**(`bg-muted dark:bg-muted`)라면 제거한다.
2. 동일한 보정이 2회 이상 반복되면 먼저 `Card`/`Button`/`Badge` variant로 승격한다.
3. 승격 후에도 남는 `dark:*`는 아래에 이유를 기록한다.

## dark 전용 클래스 유지 사유 기록
- 현재 없음.
