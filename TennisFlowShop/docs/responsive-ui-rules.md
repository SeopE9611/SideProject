# 반응형 UI 사용 규칙

## 1. 목적과 기본 원칙

- 모든 UI는 **모바일 360px~430px을 먼저 고려**한다.
- 데스크탑에서 한 줄로 예쁜 CTA라도 모바일에서 잘리거나 카드 폭을 밀면 실패로 본다.
- 긴 한글 버튼은 줄바꿈 가능성을 기본으로 본다.
- 모바일에서는 1열을 기본으로 하고, `sm`/`bp-sm` 이상에서만 2열 또는 가로 배치를 허용한다.
- 주요 CTA에는 `truncate`를 쓰지 않고, `whitespace-nowrap`도 무조건 강제하지 않는다.
- 여러 액션이 붙는 카드 footer와 필터·폼은 모바일 1열을 기본으로 한다.
- 관리자 화면도 모바일·태블릿에서 핵심 업무를 확인하고 처리할 수 있어야 한다.
- 화면별 예외 class를 늘리기 전에 기존 `Button`의 `wrap` variant 등 공통 UI가 제공하는 기능을 확인한다.

## 2. Button 규칙

- 긴 한글 CTA에는 `wrap="responsive"`를 우선 사용한다.
- 정말 짧고 고정된 버튼만 `wrap` 기본값을 허용한다.
- 주요 CTA에는 `truncate` 또는 직접 지정한 `whitespace-nowrap`를 사용하지 않는다.
- 모바일에서 버튼이 2개 이상이면 기본 1열로 배치하고, `sm`/`bp-sm` 이상에서 2열 또는 `flex`로 전환한다.
- 아이콘은 `shrink-0`으로 유지하고 텍스트는 줄바꿈 가능하게 처리한다. 공통 `Button` 내부 아이콘에는 이미 `shrink-0`이 적용되어 있다.
- `h-9`/`h-10` 같은 고정 높이에 긴 문구를 넣지 않는다.
- 호출부에서 `h-auto`/`min-h-*`를 반복하기보다 `Button`의 `wrap` variant를 활용한다.

잘못된 예:

```tsx
<Button className="h-10 whitespace-nowrap">교체서비스와 함께 선택</Button>
```

권장 예:

```tsx
<Button wrap="responsive" className="w-full sm:w-auto">
  교체서비스와 함께 선택
</Button>
```

## 3. Card 규칙

- 카드 하단 액션은 모바일 1열을 기본으로 하고, `sm`/`bp-sm` 이상에서 `flex` 또는 2열을 허용한다.
- 상태 배지·제목·가격·CTA를 한 줄에 과밀 배치하지 않는다.
- 제목과 배지가 충돌하면 모바일에서는 배지를 별도 줄로 분리한다.
- 카드 안의 핵심 정보는 `상태 → 대상/상품명 → 금액/날짜 → 지금 해야 할 일 → CTA` 순서로 제공한다.
- 주요 화면의 카드 제목에는 `truncate`를 남용하지 않는다.
- `line-clamp`는 전체 의미가 즉시 필요하지 않은 보조 설명에만 제한적으로 사용한다.

권장 패턴:

```tsx
<div className="grid grid-cols-1 gap-2 bp-sm:flex bp-sm:flex-wrap">...</div>
```

## 4. Form / Input / Select 규칙

- 모바일 폼은 1열을 기본으로 하고 `sm` 이상에서 2열을 허용한다.
- `grid-cols-2`를 모바일 기본값으로 쓰지 않는다.
- 가격·횟수·날짜·시간 입력도 모바일에서는 세로 배치한다.
- 긴 값이 들어갈 수 있는 `SelectTrigger`에는 `w-full min-w-0 text-left`를 권장한다.
- 필터가 많으면 gap과 설명 문구의 밀도를 줄이되 목록 접근성을 해치지 않는지 확인한다.
- 유효성 메시지와 도움말이 입력칸을 밀어내거나 인접 필드와 충돌하지 않는지 확인한다.

잘못된 예:

```tsx
<div className="grid grid-cols-2 gap-4">
```

권장 예:

```tsx
<div className="grid gap-4 sm:grid-cols-2">
```

## 5. Badge / Status 규칙

- 긴 Badge에 `truncate`/`nowrap`을 무조건 적용하지 않는다.
- 상태 Badge가 카드 폭을 밀면 별도 줄로 배치한다.
- 모바일에서 Badge가 여러 개면 우선순위가 높은 상태만 상단에 노출한다.
- 레거시·주의·확인 필요·긴급 같은 운영 상태는 의미가 잘리지 않아야 한다.
- Badge는 꾸밈이 아니라 상태 전달 요소로 보고, 색상뿐 아니라 텍스트로 의미를 전달한다.
- 공통 `Badge`의 `wrap="normal"`을 우선 검토하고, 호출부 class가 필요하면 아래처럼 제한한다.

권장 예:

```tsx
<Badge className="max-w-full whitespace-normal break-keep text-xs">확인이 필요한 레거시 신청</Badge>
```

## 6. 관리자 화면 규칙

- 관리자 화면도 모바일·태블릿에서 확인할 수 있어야 한다.
- Operations·대시보드·목록은 모바일에서 핵심 업무가 먼저 보여야 한다.
- 관리자 업무 카드의 정보 순서는 `긴급/상태 → 대상 → 지금 해야 할 일 → 날짜/금액 → 상세 보기/처리 액션`으로 구성한다.
- 필터는 모바일 1열을 기본으로 한다.
- 긴 Select 값에는 `w-full min-w-0 text-left`를 사용한다.
- 레거시 안내 문구는 필터 사이의 좁은 칸에 끼우지 말고 별도 행으로 배치한다.
- 테이블은 데스크탑에서 유지할 수 있지만 모바일 fallback/card가 있는지 확인한다.
- 가로 스크롤만으로 모바일 대응이 끝났다고 보지 않는다.

## 7. 금지 패턴

- 주요 CTA에 `truncate`
- 주요 CTA에 `whitespace-nowrap` 강제
- 모바일 기본 `grid-cols-2`
- 모바일 카드 footer에 버튼 2~3개 가로 강제
- 긴 `SelectTrigger`에 기본 폭만 사용
- 상태 Badge 여러 개를 모바일 한 줄에 몰아넣기
- 관리자 필터를 모바일에서 지나치게 긴 2열/3열로 구성
- 공통 컴포넌트보다 호출부에서 제각각 `h-auto`/`min-h-*`를 남발하기

## 8. 실제 적용된 사례

- `/services` CTA: `wrap="responsive"`와 모바일 `w-full` 적용
- `ProductCard` 주요 CTA: `wrap="responsive"` 적용
- `ProductCard`: 주요 CTA의 수동 `h-auto`/`min-h-10` class 제거
- 관리자 패키지 설정 폼: `grid gap-4 sm:grid-cols-2` 적용
- 마이페이지 카드 액션: 모바일 `grid-cols-1`, `bp-sm` 이상 `flex` 적용
- Operations `SelectTrigger`: `w-full min-w-0 text-left` 적용
- 레거시 안내 문구: `leading-relaxed`와 반응형 `col-span`으로 별도 행 배치

## 9. 변경 전 점검 체크리스트

- 360px~430px에서 주요 CTA의 전체 의미가 보이는가?
- 버튼 2개 이상, 카드 footer, 폼, 필터가 모바일 1열에서 시작하는가?
- 긴 Select 값과 상태 Badge가 부모 폭을 밀지 않는가?
- 제목·상태·가격·CTA가 한 줄에 과밀하지 않은가?
- 관리자 화면에서 긴급 상태와 지금 해야 할 일이 먼저 보이는가?
- `truncate`, `whitespace-nowrap`, 고정 높이, 모바일 `grid-cols-2`를 쓴 이유가 명확한가?

## V2.1 transaction command 예외

자세한 SSOT는 `docs/dokkaebi-v2-interaction-responsive-policy.md`를 따른다.

- Transaction command는 한 줄을 유지하고 버튼 자체 줄바꿈을 금지한다.
- 공간이 부족하면 primary action을 full-width 행으로 이동한다.
- Marketing/descriptive CTA는 매우 긴 경우에만 `wrap="responsive"`를 허용한다.
