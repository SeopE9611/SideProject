# 관리자 운영 기준표 (Admin Ops Taxonomy)

> 목적: 관리자 화면에서 “무엇이 주문/신청서/대여인지”, “어떤 것을 매출로 집계하는지”를
> 코드보다 먼저 고정해 누락/오해/정산 오류를 막는다.

---

## 1) 관리자 화면에서 사용하는 3가지 축(반드시 고정)

### A. 거래 종류(kind)

- ORDER: 일반 주문(스트링/라켓/클래스/패키지 등)
- STRINGING_APPLICATION: 교체 서비스 신청서(단독 신청 또는 주문/대여 연결)
- RENTAL: 라켓 대여 주문

### B. 카테고리(category)

- 스트링
- 라켓
- 교체서비스
- 패키지
- 클래스

### C. 연결 관계(link)

- SINGLE: 단독(연결 없음)
- LINKED_TO_ORDER: 주문에 연결됨 (stringing_application → orderId)
- LINKED_TO_RENTAL: 대여에 연결됨 (rental → stringingApplicationId 등)

---

## 2) 현재 구현된 7개 플로우 → DB/연결키 매핑

> “관리자 화면에서 한 줄(row)로 무엇을 보여줄지” 정의할 때 반드시 참고.

### Flow 1) 스트링 단품 구매

- 생성 문서: orders
- 관리자 목록 노출: /admin/orders
- 연결: 없음 (SINGLE)

### Flow 2) 스트링 단품 구매 + 교체서비스 신청 (연결된 통합)

- 생성 문서: orders + stringing_applications
- 관리자 목록 노출: /admin/orders (통합 그룹으로 묶임)
- 연결키:
  - stringing_applications.orderId → orders.\_id

### Flow 3) 교체서비스 단일 신청

- 생성 문서: stringing_applications
- 관리자 목록 노출: /admin/orders (서비스 타입으로 노출)
- 연결: linkedOrderId = null (SINGLE)

### Flow 4) 라켓 단품 구매

- 생성 문서: orders
- 관리자 목록 노출: /admin/orders
- 연결: 없음 (SINGLE)

### Flow 5) 라켓 구매 + 스트링 선택 + 교체서비스 신청 (연결된 통합)

- 생성 문서: orders + stringing_applications
- 관리자 목록 노출: /admin/orders (통합 그룹)
- 연결키:
  - stringing_applications.orderId → orders.\_id

### Flow 6) 라켓 단품 대여

- 생성 문서: rental_orders (또는 rentals 컬렉션)
- 관리자 목록 노출: /admin/rentals
- 연결: 없음 (SINGLE)

### Flow 7) 라켓 단품 대여 + 스트링 선택 + 교체서비스 신청 (연결된 대여 통합)

- 생성 문서: rental_orders + (대여 기반 stringing_application 연결 정보)
- 관리자 목록 노출: /admin/rentals (대여 상세에서 신청서 CTA)
- 연결키(현재 상세 API 기준):
  - rental_orders.stringingApplicationId → stringing_applications.\_id

---

## 3) 정산(매출) 기준 — 반드시 문서로 먼저 고정(중요)

> “보기에는 통합인데 실제 매출 집계가 빠지는 사고”를 막기 위한 핵심 섹션.
> 아래 항목을 확정한 뒤에 통합 화면을 설계한다.

### A. 주문(ORDER) 매출 인식

- 매출 포함: 주문 totalPrice (또는 total)
- 환불/취소: 어떤 상태에서 제외하는가?
  - [ ] 취소요청(requested) 단계에서는 포함
  - [ ] 취소승인(approved) 되면 제외
  - [ ] 결제완료(confirmed/paid)만 포함

### B. 교체서비스 신청(STRINGING_APPLICATION) 매출 인식

- 매출 포함: 신청서 total (문서 저장값 우선)
- 단독 신청도 매출로 본다: [ ] YES / [ ] NO
- 환불/취소 기준: [ ] 주문과 동일 / [ ] 별도

### C. 대여(RENTAL) 매출 인식 (여기서부터 사고가 많이 난다)

- 대여료(fee)는 매출인가? [ ] YES / [ ] NO
- 보증금(deposit)은 매출인가? [ ] YES / [ ] NO (일반적으로 예치금 성격)
- 교체서비스 포함 대여의 매출은 어디로 넣는가?
  - [ ] 대여 매출에 포함(대여 화면에서 관리)
  - [ ] 신청서 매출로 분리(신청서/주문 쪽으로 이동)
  - [ ] 이원화(대여료는 대여, 교체서비스는 신청서)

---

## 4) 관리자 리스트(한 줄)에서 반드시 보여야 하는 필드(권장)

### 공통(필수)

거래종류(kind) 뱃지 (ORDER / 신청서 / RENTAL)

- 카테고리(category) 뱃지 (스트링/라켓/교체서비스/...)
- 연결(link) 뱃지 (단독/주문연결/대여연결)
- 고객(이름/이메일)
- 금액(총액) + 결제상태
- 현재 처리상태(주문상태)
- 생성일(또는 결제일)
- 다음 액션(상세로 이동, 배송 업데이트 등)

---

## 5) 변경 작업 원칙(안전장치)

- 기준표(본 문서) 확정 → UI 표시(뱃지/라벨) → 데이터 응답(필드 추가) → 통합 운영함 순으로 진행한다.
- 매출/정산 로직 변경은 “테스트 시나리오 체크리스트”와 함께 진행한다.


## 6) 알림 관리 라우팅 단일화 규칙

- 알림 관리의 단일 진입 경로는 **`/admin/notifications/outbox`** 로 고정한다.
- `/admin/notifications` 로 접근한 경우에는 query string을 유지한 채 `/admin/notifications/outbox` 로 리다이렉트한다.
- 관리자 메뉴 라벨은 실제 기능 의미와 동일하게 **“알림 발송함”** 으로 표기한다.
- 알림 상세(`/admin/notifications/outbox/[id]`)는 목록의 하위 경로로 간주하며, 상단 내비게이션/브레드크럼에서 목록→상세 관계를 동일하게 표시한다.


## 7) 운영 통합 센터 신호/결제 해석 정책 (2026-02)

- `주의`: 데이터 무결성/연결 오류일 때만 사용한다.
  - 예) 주문/대여/신청서 양방향 링크 누락, 존재하지 않는 문서 참조, 중복 연결
- `검수필요`: 오류는 아니지만 운영자 확인이 필요한 경우에 사용한다.
  - 예) 신청서 paymentStatus 미기재로 파생 결제상태 사용, packageApplied 적용, paymentSource=order:*

화면 UX 정렬 원칙:
- `주의만`: 실제 오류(무결성/연결 문제)만 조회
- `검수필요만`: 오류는 아니지만 정책 확인이 필요한 건만 조회
- `완전정상만`: 주의/검수필요 신호가 모두 없는 건만 조회
- 그룹 펼침의 `검수 사유` 섹션에서 reviewReasons를 즉시 확인
- `주의(오류)만 보기`가 켜진 경우 `warnFilter`는 `주의만`으로 정규화해 충돌 조합(`검수필요만/완전정상만`)을 허용하지 않는다.

URL 동기화 규칙:
- 현재 뷰 링크는 `q/kind/flow/integrated/warn(page onlyWarn)/warnFilter/warnSort/page`를 함께 보존한다.
- `전체 보기`는 프리셋 + 위험 신호 필터(`warnFilter`) + 위험 신호 정렬(`warnSort`)까지 기본값으로 초기화한다.


금액 표시/해석 원칙(운영 통합 센터):
- 메인 금액(큰 숫자)은 항상 **실제 청구/결제 기준 금액**이다.
  - 주문: 주문 결제/청구 금액
  - 신청서: 신청서 자체 청구 금액(주문 포함/패키지 차감이면 0원 가능)
  - 대여: 대여 청구 금액
- 메인 금액이 `0원`인 신청서는 반드시 이유를 함께 해석한다.
  - `주문결제포함` / `패키지차감` / `별도청구없음` / `확인필요`
- `serviceFeeBefore` 등 기준 금액은 **보조 정보**로만 사용한다.
  - 예) `0원 · 주문결제포함 · 기준금액 192,220원`

신청서 결제 라벨 우선순위:
1) paymentStatus 명시값 정규화
2) packageApplied=true → 패키지차감
3) paymentSource startsWith order: → 주문결제포함
4) servicePaid=true → 결제완료
5) totalPrice>0 또는 serviceAmount>0 → 결제대기
6) 그 외 → 확인필요

주문 결제 라벨은 `paymentStatus ?? paymentInfo.status` 폴백을 사용한다.
대여는 결제 필드가 없을 수 있으므로, 필드가 없는 문서는 결제 비교에서 제외하고 `검수필요` 사유를 남긴다.
