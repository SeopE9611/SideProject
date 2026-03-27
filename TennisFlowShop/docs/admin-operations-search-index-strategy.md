# 관리자 운영통합센터 검색 인덱스 전략(1차)

## 목적
- 범위: `/admin/operations`의 현재 검색 신뢰성 고도화 1차.
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

## 현재 한계(문자열/contains 검색)
- `contains` 성격의 폭넓은 문자열 검색(예: 자유 title 검색)은 인덱스로 완전 해결이 어렵고 컬렉션별 필드 편차가 큼.
- 이번 단계에서는 DB 후보 추출을 exact/prefix + email/name 중심으로 강화하고, 일부 파생 표시 문자열은 메모리 안전망으로 유지.

## 왜 full-text / 별도 검색 인프라를 이번에 도입하지 않았는가
- 이번 PR 목표는 운영 안정성 중심의 “최소 안전 고도화 1차”이며, 기존 KPI/그룹/페이지네이션 구조를 유지해야 함.
- full-text/Atlas Search 도입은 스키마·랭킹·운영비용·모니터링까지 포함한 별도 프로젝트 성격이므로 현재 범위를 초과함.
