# 관리자 운영통합센터 검색 인덱스 전략(3차)

## 목적
- 범위: `/admin/operations`의 현재 검색 신뢰성 고도화 3차.
- 이번 단계 핵심:
  1) **explain 기반 검증 경로 마련**
  2) **email 계열 인덱스 우선순위 판단 근거화**
- 비범위: 검색 엔진 리라이트(Elasticsearch/Atlas Search/full-text 전면 도입), 대규모 인덱스 마이그레이션.

## 컬렉션별 검색 핵심 필드

### 1) `orders`
- 식별자/연결: `_id`, `stringingApplicationId`
- 고객: `customer.name`, `customer.email`, `userSnapshot.name`, `userSnapshot.email`, `guestInfo.name`, `guestInfo.email`
- 표시 문자열(주문 제목 원본): `items.title`, `items.productName`, `items.name`

### 2) `rental_orders`
- 식별자/연결: `_id`, `stringingApplicationId`, `userId`
- 고객: `guest.name`, `guest.email`
- 표시 문자열: `brand`, `model`
- 보강 경로: 회원 검색 시 `users.name/email -> users._id -> rental_orders.userId` 조인형 후보 추출

### 3) `stringing_applications`
- 식별자/연결: `_id`, `stringingApplicationId`, `orderId`, `rentalId`
- 고객: `customer.name`, `customer.email`, `userSnapshot.name`, `userSnapshot.email`, `guestName`, `guestEmail`
- 결제 연결 텍스트: `paymentSource` (`order:*`, `rental:*`)

## 인덱스 후보(우선순위)

### A. exact / prefix 중심(우선)
- `orders.stringingApplicationId` (정확/접두 검색)
- `rental_orders.stringingApplicationId` (정확/접두 검색)
- `stringing_applications.stringingApplicationId` (정확/접두 검색)
- `stringing_applications.orderId`, `stringing_applications.rentalId` (연결 ID 검색)
- `rental_orders.userId` (users 검색 결과 조인 가속)

### B. 이메일 중심(운영 검색 체감 개선 후보)
- `orders.customer.email`, `orders.userSnapshot.email`, `orders.guestInfo.email`
- `rental_orders.guest.email`
- `stringing_applications.customer.email`, `stringing_applications.userSnapshot.email`, `stringing_applications.guestEmail`
- `users.email`

## 3차 적용/판단 결과

| 구분 | 상태 | 근거 |
| --- | --- | --- |
| linked id / stringingApplicationId 계열 인덱스 | 적용 완료(유지) | 이미 런타임 ensure/check 범위에 포함되어 있으며 exact/prefix 경로와 정합 |
| explain 실행 경로 | 적용 완료(신규) | `scripts/db/explain-admin-operations-search.mjs`로 users prelookup + 3개 컬렉션 후보 쿼리 `executionStats` 확인 가능 |
| email 계열 신규 인덱스 | **보류** | 현재 email 검색 주 경로가 `contains`(대소문자 무시 regex) 중심이라 단순 인덱스 추가만으로 효율 보장 어려움. 운영 데이터 explain 결과 기반 우선순위 선별이 선행되어야 안전 |

## email 검색 경로 분해(코드 기준)

1) `orders`
- 직접 email 검색: `customer.email`, `userSnapshot.email`, `guestInfo.email`에 `qRegex`(contains, `/q/i`) 적용
- exact/prefix 전용 email 쿼리 없음

2) `rental_orders`
- 직접 email 검색: `guest.email`에 `qRegex`(contains)
- 추가 경로: `users`에서 `name/email`을 `qRegex`로 선조회한 뒤 `_id`를 `rental_orders.userId` 조건으로 확장

3) `stringing_applications`
- 직접 email 검색: `customer.email`, `userSnapshot.email`, `guestEmail`에 `qRegex`(contains)
- exact/prefix 전용 email 쿼리 없음

4) `users`
- 선조회 전용: `name/email`에 `qRegex`(contains)
- 현재 프로젝트 런타임 인덱스에서 `users.email` unique 인덱스는 이미 보장됨

정리:
- 현재 email 검색의 기본 형태는 **contains**이며, 일부 식별자 필드에만 exact/prefix가 결합됨.
- 따라서 email 인덱스는 "필드가 있으니 일괄 추가"가 아니라 explain 결과 기반으로 선별해야 함.

## explain 기반 검증 절차(신규)

### 1) 실행
```bash
npm run db:explain-admin-operations-search -- <query>
# 옵션: --fetch-limit=200 (기본 200, 최대 5000)
```

예시:
```bash
npm run db:explain-admin-operations-search -- kim@example.com
npm run db:explain-admin-operations-search -- 67c8f2f2b7...
npm run db:explain-admin-operations-search -- sa-2026-0001
```

### 2) 스크립트가 확인하는 쿼리 범위
- `users` 선조회(`name/email` contains)
- `orders` 후보 쿼리
- `rental_orders` 후보 쿼리(+ users 선조회 결과의 `userId` 경유)
- `stringing_applications` 후보 쿼리

### 3) 출력에서 봐야 할 핵심
- `winningStages`: 실행계획 stage 흐름
- `indexUsed`: IXSCAN 유무(YES/NO)
- `keysExamined / docsExamined / nReturned`: 선택도/효율 확인

판독 가이드:
- `indexUsed=NO` + `docsExamined` 큼: COLLSCAN 가능성 높음
- `indexUsed=YES`여도 `docsExamined >> nReturned`: 인덱스는 탔지만 선택도 낮을 수 있음

### 4) 검색어별 점검 권장
- email 검색어: `kim@example.com`
  - users 선조회 및 orders/rentals/apps의 email contains 경로가 실제로 어떤 stage를 타는지 확인
- linked id / stringingApplicationId 검색어: `sa-...`, `app-...`, ObjectId
  - 이미 적용된 식별자 인덱스가 실제 winning plan에서 선택되는지 확인
- order/rental 연결 id 검색어: 주문/대여 `_id` 또는 연결 id
  - `stringing_applications.orderId/rentalId` 인덱스 경로 확인

## email 인덱스 우선순위 판단(이번 결론)

### 결론: 이번 PR에서는 신규 email 인덱스 **보류(B안)**

보류 이유(구체):
1) 현재 코드의 email 검색이 exact/prefix보다 contains 비중이 높아, 단순 B-Tree 인덱스 추가 시 체감 개선이 제한될 수 있음.
2) 컬렉션별 email 필드가 다중 경로(`customer.email`, `userSnapshot.email`, `guest*`)로 분산되어 있어 일괄 생성은 쓰기 비용 대비 효율이 불명확함.
3) `users.email`은 이미 unique 인덱스로 보장되므로, 우선순위는 users 외 컬렉션의 실제 병목 필드 식별에 맞추는 것이 안전함.
4) 운영 데이터 기준 explain(실측) 없이 추가하면 "인덱스는 늘었지만 핵심 병목은 그대로"인 상태가 될 위험이 있음.

### 다음 우선 검토 후보(운영 explain 수집 후)
1) `orders.customer.email` (실검색 빈도/선택도 높을 때)
2) `rental_orders.guest.email`
3) `stringing_applications.customer.email`

※ 단, 위 후보도 "contains 위주"라면 효과가 제한될 수 있으므로, 먼저 실제 검색어 분포(exact/prefix 비율)를 확인한 뒤 결정.

## 현재 한계(문자열/contains 검색)
- `contains` 성격의 폭넓은 문자열 검색(예: 자유 title 검색)은 인덱스로 완전 해결이 어렵고 컬렉션별 필드 편차가 큼.
- 이번 단계에서는 DB 후보 추출을 exact/prefix + email/name 중심으로 유지하고, 일부 파생 표시 문자열은 메모리 안전망으로 유지.

## 왜 full-text / 별도 검색 인프라를 이번에 도입하지 않았는가
- 이번 PR 목표는 운영 안정성 중심의 "검색 고도화 3차(explain 검증 경로 + email 인덱스 우선순위 판단)"이며, 기존 KPI/그룹/페이지네이션 구조를 유지해야 함.
- full-text/Atlas Search 도입은 스키마·랭킹·운영비용·모니터링까지 포함한 별도 프로젝트 성격이므로 현재 범위를 초과함.
