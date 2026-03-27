# 관리자 운영통합센터 검색 인덱스 전략(5차)

## 목적
- 범위: `/admin/operations` 검색 고도화 5차.
- 이번 단계 핵심:
  1) **실개발/스테이징 DB explain 수집 절차 고정**
  2) **email 계열 인덱스 적용/보류 최종 판단 기준 명문화**
- 비범위: 검색엔진 리라이트(Atlas Search / full-text / 외부 검색엔진), 대규모 인덱스 일괄 생성.

## 실제 확인한 코드 기준 현재 상태

### 1) explain 스크립트 입력/출력
- 파일: `scripts/db/explain-admin-operations-search.mjs`
- 입력
  - 필수: `MONGODB_URI`
  - 선택: `MONGODB_DB` (기본 `tennis_academy`)
  - CLI: `<query>` + `--fetch-limit=...` (기본 200, 최대 5000)
- 출력 핵심
  - `collection`(섹션 라벨), `winningStages`, `indexUsed`, `keyPattern`, `keysExamined`, `docsExamined`, `nReturned`

### 2) email 검색 분기(운영 API 코드)
- 파일: `app/api/admin/operations/lib/operationsGetHandler.ts`
- 공통: `@` 포함 + 기본 패턴 검증 시 email 모드로 분기.
- email 모드: `exact(searchEmailLower/email) -> prefix(^normalized) -> contains fallback` 순서.
- 컬렉션별 email 필드
  - `orders`: `customer.email`, `userSnapshot.email`, `guestInfo.email`
  - `rental_orders`: `guest.email` + `users(name/email) -> users._id -> rental_orders.userId` 우회 경로
  - `stringing_applications`: `customer.email`, `userSnapshot.email`, `guestEmail`
- 식별자 계열은 exact/prefix 병행
  - `_id`, `stringingApplicationId`, `orderId`, `rentalId`, `userId`

### 3) 런타임 ensure/check 기준 인덱스
- 신규(5차):
  - `orders.searchEmailLower`
  - `stringing_applications.searchEmailLower`
- 파일: `scripts/db/ensure-runtime-indexes.mjs`, `scripts/db/check-runtime-indexes.mjs`
- 이미 보장됨
  - `orders.stringingApplicationId`
  - `rental_orders.stringingApplicationId`
  - `stringing_applications.stringingApplicationId/orderId/rentalId`
  - `users.email` unique
- 아직 보장 안 됨(현재 코드상)
  - `orders.customer.email`, `orders.userSnapshot.email`, `orders.guestInfo.email`
  - `rental_orders.guest.email`
  - `stringing_applications.customer.email`, `stringing_applications.userSnapshot.email`, `stringing_applications.guestEmail`

## 대표 검색어 세트(PII 마스킹 규칙 포함)

> 실제 email 원문은 문서/PR에 기록하지 않고 `u***@d***.com` 형태로 마스킹한다.

1) email exact(2~3개)
- `u***@d***.com`
- `m***@g***.com`
- `k***@n***.co.kr`

2) email prefix(1~2개)
- `u***@`
- `m***`

3) linked id / stringingApplicationId(1~2개)
- `sa-2026-00***`
- `67c8***************` (ObjectId prefix)

4) rental userId 연계 확인(1개 이상)
- `67b1***************` (user ObjectId 또는 해당 회원 email 마스킹값)


## 현재 작업 환경 실행 상태(2026-03-27 UTC)
- 본 작업 컨테이너에는 `MONGODB_URI` / `MONGODB_DB`가 주입되어 있지 않아, 스크립트 단독 실행 시 즉시 종료됨.
- 확인 명령:
  - `npm run db:explain-admin-operations-search -- sample@example.com`
  - 출력: `[explain-admin-operations-search] MONGODB_URI 환경 변수가 필요합니다.`
- 따라서 실개발/스테이징 DB 수치 수집은 **동일 스크립트를 비밀값 주입 환경에서 바로 재실행**하도록 절차를 문서화했다.

## 실제 DB explain 실행 절차

### 개발 DB
```bash
export MONGODB_URI='***'
export MONGODB_DB='tennis_academy_dev' # 환경에 맞게 조정
npm run db:explain-admin-operations-search -- 'u***@d***.com' --fetch-limit=4000
```

### 스테이징 DB
```bash
export MONGODB_URI='***'
export MONGODB_DB='tennis_academy_stg' # 환경에 맞게 조정
npm run db:explain-admin-operations-search -- 'sa-2026-00***' --fetch-limit=4000
```

## 결과 정리 템플릿(반드시 수치 포함)

| 검색어 유형 | 컬렉션 | winningStages | indexUsed | keyPattern | keysExamined | docsExamined | nReturned | 해석 |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | --- |
| email exact | users |  |  |  |  |  |  |  |
| email exact | orders |  |  |  |  |  |  |  |
| email prefix | orders |  |  |  |  |  |  |  |
| linked id | stringing_applications |  |  |  |  |  |  |  |
| rental userId path | rental_orders |  |  |  |  |  |  |  |

판단시 최소 확인:
- `docsExamined / nReturned`
- `keysExamined / nReturned`
- `indexUsed=YES`여도 선택도 악화(`docsExamined >> nReturned`) 여부

## email 인덱스 적용/보류 최종 판단 가이드

### A안(적용)
- 특정 email 필드에서 아래가 반복 확인될 때만 최소 적용:
  - `nReturned` 대비 `docsExamined`가 매우 크고,
  - 검색 패턴이 contains가 아니라 exact/prefix 비율이 높으며,
  - 기존 쓰기부담 대비 효과가 명확할 때.

### B안(보류)
- 아래 중 하나라도 강하면 보류:
  - contains 중심이라 B-Tree 단일 인덱스 효과 불확실
  - 컬렉션별 email 경로가 분산되어 우선순위 불명확
  - 실DB explain 실측이 아직 누락

## 5차 결론(현재 저장소 기준)
- **결론: 혼합(A+B)**
- 근거:
  1) `orders`/`stringing_applications`는 `searchEmailLower` + 단일 인덱스로 exact/prefix 경로를 확보(A안).
  2) `rental_orders`/`users`는 email 저장 경로·write path 분산 이슈로 이번 단계는 보수적으로 보류(B안).
  3) contains는 제거하지 않고 email 모드의 마지막 fallback으로 유지.

## 이번 단계에서 하지 않은 것
- full-text/Atlas Search 도입
- 대량 email 인덱스 일괄 생성
- 운영 API 로직 구조 변경(KPI, groups, summary, pagination)

## 다음 우선순위
1) 개발/스테이징 DB에서 위 대표 검색어 세트 explain 수치 수집(마스킹 포함).
2) 병목이 명확한 1~2개 email 필드만 후보 축소.
3) 최소 인덱스 적용 후 동일 검색어 재-explain으로 개선폭 비교.
