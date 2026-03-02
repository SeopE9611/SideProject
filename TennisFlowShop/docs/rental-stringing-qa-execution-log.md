# 라켓 대여 + 교체서비스 통합 Step 6 QA 실행 로그 (실전용)

## 0) 범위 및 제외

- 본 문서는 **라켓 대여 + 교체서비스 통합 플로우만** 검증한다.
- 현재 프로젝트에서 라켓 대여 단독 플로우는 제공하지 않으므로, 대여 단독 시나리오는 본 문서에서 제외한다.
- 대상 분기:
  1. 입력 부족 → legacy fallback (`createStringingApplicationFromRental`)
  2. 입력 충분 → 신규 통합 제출 (`submitStringingApplicationCore`)
  3. success/handoff 분기
  4. 마이페이지 목록/상세 CTA 분기
  5. 신청서 보기 링크 이동
  6. 중복 생성 여부
  7. 기존 데이터 회귀 영향

---

## 1) 테스트 준비사항

### 1-1. 계정/권한

- [ ] 회원 테스트 계정 1개 이상 (로그인 가능)
- [ ] 관리자 계정 1개 (DB/관리자 화면 점검용, 선택)
- [ ] 비회원 시나리오는 이번 범위에서 제외 (회원 기반 대여+교체서비스만 검증)

### 1-2. 데이터 준비

- [ ] 대여 가능한 라켓 1개 이상 (`used_rackets` 재고 유효)
- [ ] 스트링 상품 1개 이상 (`products`, `name/price/mountingFee` 확인)
- [ ] 테스트용 배송지/연락처/환급계좌 정보
- [ ] 포인트 사용 테스트를 원하면 100P 단위로 사용 가능한 계정 준비

### 1-3. 사전 확인 체크

- [ ] 체크아웃에서 `stringingApplicationInput` 전송이 가능한 UI 상태인지 확인
- [ ] success 페이지 query(`withService`, `stringingSubmitted`, `stringingApplicationId`) 확인 가능
- [ ] 마이페이지에서 `stringingApplicationId`, `withStringService`, `isStringServiceApplied` 기반 CTA가 보이는지 확인 가능

---

## 2) 핵심 시나리오 체크리스트

> 아래 8개 시나리오는 **실행 순서대로 테스트하면** fallback/통합/회귀를 한 번에 점검할 수 있다.

### 시나리오 1. 라켓 대여 + 교체서비스 (입력 부족 → legacy fallback)

- 목적: checkout에서 교체서비스를 선택했지만 통합 입력 최소요건이 부족할 때 fallback이 유지되는지 확인
- 기대 핵심:
  - `/api/rentals` 응답의 `stringingSubmitted !== true`
  - success에서 handoff 화면 노출 (`withService=1`, `stringingSubmitted!=1`)
  - 신청서는 생성되며, 이후 `/services/apply?rentalId=...` 진입 가능

### 시나리오 2. 라켓 대여 + 교체서비스 (입력 충분 → 신규 통합 제출)

- 목적: 입력 충족 시 `submitStringingApplicationCore` 경로로 통합 접수되는지 확인
- 기대 핵심:
  - `/api/rentals` 응답의 `stringingSubmitted === true`
  - success query에 `stringingSubmitted=1`, `stringingApplicationId` 포함
  - success에서 handoff 없이 “통합 접수 완료” 안내 노출

### 시나리오 3. success / handoff 분기 확인

- 목적: 동일 대여 타입에서 query 값에 따른 분기 UI가 정확히 나뉘는지 확인
- 기대 핵심:
  - `withService=1 && stringingSubmitted!=1` → handoff
  - `withService=1 && stringingSubmitted=1` → 일반 success + 통합 접수 안내

### 시나리오 4. 마이페이지 목록 CTA 분기

- 목적: 목록 카드에서 `stringingApplicationId` 유무/`withStringService` 값에 따라 CTA가 정확한지 확인
- 기대 핵심:
  - `stringingApplicationId` 있음 → “신청서 보기”
  - ID 없음 + `withStringService=true` → “교체 신청하기”

### 시나리오 5. 마이페이지 상세 CTA 분기

- 목적: 상세에서도 목록과 동일한 분기 기준이 유지되는지 확인
- 기대 핵심:
  - 신청서 ID 있으면 “신청서 보기”
  - ID 없고 교체서비스 포함이면 “교체 신청하기”

### 시나리오 6. 신청서 보기 링크 이동

- 목적: 목록/상세의 신청서 보기 버튼이 동일 규칙으로 올바른 탭/ID로 이동하는지 확인
- 기대 핵심:
  - `/mypage?tab=applications&applicationId=...` 로 이동
  - 대상 신청서가 실제 대여건과 연결되어 조회 가능

### 시나리오 7. 중복 생성 여부

- 목적: 동일 대여건에서 신청서가 중복 생성되지 않는지 확인
- 기대 핵심:
  - 통합 제출 성공 케이스에서 handoff 재진입/새로고침으로 신규 신청서가 추가 생성되지 않음
  - fallback 케이스에서도 의도치 않은 다중 생성이 없음

### 시나리오 8. 기존 데이터 회귀 영향

- 목적: 이미 존재하는 과거 대여 데이터(신청서 ID 없거나 필드 누락)에서 CTA 회귀가 없는지 확인
- 기대 핵심:
  - 구형 데이터도 목록/상세에서 오동작 없이 분기
  - 신규 필드 추가로 인해 기존 조회/렌더 실패가 없음

---

## 3) 시나리오별 실행 로그 템플릿

아래 템플릿을 **시나리오마다 1개씩 복사**해서 사용하세요.

```md
## [시나리오 N] 제목
- 사전 조건:
  -
- 실행 단계:
  1.
  2.
  3.
- 기대 결과:
  -
- 실제 결과:
  -
- 통과/실패: (PASS / FAIL)
- 비고:
  -
```

---

## 4) 실전 기록 시 권장 로그 포인트

- 네트워크
  - [ ] `POST /api/rentals` 응답 본문 저장 (`id`, `stringingApplicationId`, `stringingSubmitted`)
  - [ ] success 진입 URL query 스크린샷/텍스트 기록
- 화면
  - [ ] success가 handoff인지 통합완료 안내인지 기록
  - [ ] 마이페이지 목록/상세의 CTA 문구 기록
- 데이터
  - [ ] 같은 rentalId 기준 stringing application 생성 수 기록
  - [ ] 신규/기존 대여 데이터 각각의 CTA 동작 기록

---

## 5) 최종 회귀 점검 요약

### 5-1. 현재 가장 중요한 분기

1. `stringingApplicationInput` 최소요건 충족 여부에 따른 **submit-core vs fallback 분기**
2. success query(`stringingSubmitted`)에 따른 **handoff 노출 여부 분기**
3. 마이페이지에서 `stringingApplicationId`/`withStringService` 기반 **CTA 분기**

### 5-2. Regression 위험이 높은 케이스

1. 통합 제출 성공인데도 success에서 handoff가 다시 뜨는 케이스
2. fallback 케이스에서 신청서 ID 누락으로 목록/상세 CTA가 비정상 노출되는 케이스
3. 기존 대여 데이터(구형 필드)에서 `withStringService` 계산이 어긋나 CTA가 사라지는 케이스

### 5-3. 오늘 바로 테스트할 우선순위 3개

1. **입력 충분 통합 제출**: `stringingSubmitted=1` + handoff 미노출 + 신청서 보기 연결
2. **입력 부족 fallback**: handoff 노출 + apply 이동 + 신청서 생성 확인
3. **마이페이지 목록/상세 CTA 분기**: 신청서 있음/없음 각각 버튼 검증

### 5-4. 내일 해도 되는 후순위 테스트 3개

1. success 페이지 새로고침/뒤로가기 반복 동작 점검
2. 포인트 사용 조합(0P/일부/최대)에서 분기 영향 재확인
3. 과거 데이터 샘플 다건(상태별 pending/paid/out/returned) 회귀 스팟 체크
