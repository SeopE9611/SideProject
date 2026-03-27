# 관리자 운영통합센터 검색 인덱스 전략(2차)

## 목적
- 범위: `/admin/operations`의 현재 검색 신뢰성 고도화 2차.
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

### B. 이메일 중심(운영 검색 체감 개선)
- `orders.customer.email`, `orders.userSnapshot.email`, `orders.guestInfo.email`
- `rental_orders.guest.email`
- `stringing_applications.customer.email`, `stringing_applications.userSnapshot.email`, `stringing_applications.guestEmail`
- `users.email`

## 2차 적용 판단 결과

### 1) 이번 PR에서 적용 완료(최소/안전)
- `orders.stringingApplicationId`
- `rental_orders.stringingApplicationId`
- `stringing_applications.stringingApplicationId`
- `stringing_applications.orderId`
- `stringing_applications.rentalId`

적용 이유:
- 모두 운영통합센터 검색에서 이미 exact/prefix 경로로 사용 중인 식별자성 필드다.
- contains 전용 최적화가 아니라, 현재 쿼리 전략과 직접 대응되는 최소 인덱스만 반영했다.
- 프로젝트 관례(`lib/*indexes.ts` + `scripts/db/ensure-runtime-indexes.mjs` + `scripts/db/check-runtime-indexes.mjs`)에 맞춰 동기화했다.

### 2) 이번 PR에서 보류
- email 계열 인덱스 묶음 (`orders.customer.email`, `orders.userSnapshot.email`, `orders.guestInfo.email`, `rental_orders.guest.email`, `stringing_applications.*.email`, `users.email` 외 추가 분기)

보류 이유:
- `users.email`은 이미 유니크 인덱스가 존재한다.
- 나머지는 컬렉션별 데이터 품질/중복도/실제 실행계획(`explain`)을 운영 데이터 기준으로 검증한 뒤 단계적으로 넣는 편이 안전하다.
- 이번 단계 목표는 “최소 exact/prefix 식별자 인덱스”라서 범위를 의도적으로 제한한다.

### 3) 후속 검토(운영 확인 후)
- email exact/prefix 쿼리의 실제 히트 분포와 explain 결과를 수집해, 고효율 필드만 개별 인덱스 추가.
- title/자유문자열 contains는 인덱스로 무리해서 해결하지 않고, 필요 시 별도 검색 인프라(Atlas Search/full-text) 프로젝트로 분리.

## 현재 한계(문자열/contains 검색)
- `contains` 성격의 폭넓은 문자열 검색(예: 자유 title 검색)은 인덱스로 완전 해결이 어렵고 컬렉션별 필드 편차가 큼.
- 이번 단계에서는 DB 후보 추출을 exact/prefix + email/name 중심으로 강화하고, 일부 파생 표시 문자열은 메모리 안전망으로 유지.

## 왜 full-text / 별도 검색 인프라를 이번에 도입하지 않았는가
- 이번 PR 목표는 운영 안정성 중심의 “검색 고도화 2차(메모리 안전망 재점검 + 최소 인덱스 적용 가능성 검토)”이며, 기존 KPI/그룹/페이지네이션 구조를 유지해야 함.
- full-text/Atlas Search 도입은 스키마·랭킹·운영비용·모니터링까지 포함한 별도 프로젝트 성격이므로 현재 범위를 초과함.
