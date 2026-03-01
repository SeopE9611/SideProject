# 교체 서비스 통합 결제/접수 최종 QA 시나리오 체크리스트 (6단계-A)

## 문서 목적
- 체크아웃에서 교체 서비스가 통합 접수되는 현재 구조를 기준으로, 릴리스 전 반드시 수동/통합 QA에서 확인해야 하는 시나리오를 정리한다.
- 본 문서는 **기능 변경 없이 QA 기준만 명문화**한다.

## 공통 확인 규칙
- 공통 서버 확인 대상 필드
  - `orders.isStringServiceApplied`
  - `orders.stringingApplicationId`
  - 주문 상세 API의 `stringService.totalSlots / usedSlots / remainingSlots`
  - `stringing_applications.status` (예: draft, received, 검토 중 등)
- 공통 화면 확인 포인트
  - 주문 목록/상세/비회원 조회에서 CTA가 중복 노출되지 않는지
  - 신청 완료 상태에서 잘못된 "신규 신청" CTA가 노출되지 않는지
  - 추가 신청 가능 상태(`remainingSlots > 0`)에서만 `/services/apply?orderId=...`가 유효한지

---

## 시나리오 1) 스트링 단품 구매 (서비스 미포함)

### 준비 데이터 조건
- 장바구니: 스트링 상품만 포함
- 결제 파라미터: `shippingInfo.withStringService = false`
- 주문 생성 이후 `stringingApplicationInput` 미전달

### 진입 URL
- `/cart` → `/checkout`
- 주문 후 확인: `/mypage?tab=orders&orderId={orderId}`

### 기대 UI (문구/CTA/배지)
- 주문 목록/상세에서 교체서비스 관련 CTA(신청/신청서 보기/완료) 미노출
- 비회원 조회 결과/상세에서도 교체서비스 CTA 미노출

### 기대 서버 결과
- `orders.isStringServiceApplied`는 `false` 또는 미설정
- `orders.stringingApplicationId`는 `null` 또는 미설정
- 연결 신청서(`stringing_applications`) 신규 생성 없음

### 실패 시 의심 지점 (관련 파일)
- `app/features/orders/api/handlers.ts` (주문 생성 시 서비스 포함 분기)
- `app/mypage/tabs/OrderList.tsx` (목록 CTA 노출 조건)
- `app/order-lookup/results/page.tsx`, `app/order-lookup/details/[id]/page.tsx` (비회원 CTA 분기)

---

## 시나리오 2) 스트링 + 교체서비스 (통합 제출)  ⭐핵심 상세

### 준비 데이터 조건
- 장바구니: 스트링 상품 1개 이상
- 결제 파라미터: `shippingInfo.withStringService = true`
- 통합 접수 payload에 `stringingApplicationInput` 포함 (또는 자동 생성 fallback 경로)

### 진입 URL
- `/checkout` (결제)
- 검증 화면: `/mypage?tab=orders&orderId={orderId}`, `/mypage?tab=applications&applicationId={appId}`
- 관리자 검증: `/admin/orders/{orderId}`, `/admin/applications/stringing/{appId}`

### 기대 UI (문구/CTA/배지)
- 마이페이지 주문 카드/상세에서 "신청서 연결됨" 또는 신청 상세 진입 CTA가 노출
- 동일 주문에서 "신규 교체 신청" CTA가 즉시 재노출되지 않음(연결 상태 우선)
- 관리자 주문 상세에서 연결 문서 카드로 신청서 이동 가능

### 기대 서버 결과
- 주문 생성 응답에 `stringingApplicationId` 반환
- `orders.isStringServiceApplied = true`
- `orders.stringingApplicationId = {생성된 신청서 ID}`
- 신청서가 `stringing_applications`에 생성되고 상태가 진행 가능 상태(예: `received`/`검토 중`)

### 실패 시 의심 지점 (관련 파일)
- `app/features/orders/api/handlers.ts` (통합 생성/자동 생성/주문 필드 업데이트)
- `app/features/stringing-applications/api/submit-core.ts` (주문 필드 동기화)
- `app/mypage/tabs/OrderList.tsx`, `app/mypage/orders/_components/OrderDetailClient.tsx` (연결/완료 UI 분기)

---

## 시나리오 3) 라켓 + 스트링 + 교체서비스 (통합 제출)  ⭐핵심 상세

### 준비 데이터 조건
- 장바구니: 라켓 + 스트링 동시 포함
- 교체 서비스 대상(`serviceTargetIds`)이 스트링/장착 대상 수량과 일치하도록 선택
- 결제 파라미터: `shippingInfo.withStringService = true`

### 진입 URL
- `/checkout`
- 검증 화면: `/mypage?tab=orders&orderId={orderId}` → 필요 시 `/services/apply?orderId={orderId}`

### 기대 UI (문구/CTA/배지)
- 주문 상세에서 슬롯 정보가 정상 계산되어 노출
  - 총 대상 수(`totalSlots`), 사용 수(`usedSlots`), 남은 수(`remainingSlots`)
- 이미 일부 접수 후 남은 슬롯이 있으면 "추가 신청" 안내가 노출
- 남은 슬롯이 0이면 완료/조회 중심 안내로 전환

### 기대 서버 결과
- 주문 상세 API 기준 `stringService.totalSlots/usedSlots/remainingSlots` 계산 정합
- 신청서 접수 건수(라켓 라인 수)와 `usedSlots`가 동기화
- `remainingSlots = max(totalSlots - usedSlots, 0)` 유지

### 실패 시 의심 지점 (관련 파일)
- `app/api/orders/[id]/route.ts` (슬롯 계산 및 주문 상세 응답)
- `app/features/stringing-applications/hooks/useCheckoutStringingServiceAdapter.ts` (체크아웃 대상/수량 프리뷰)
- `app/mypage/orders/_components/OrderDetailClient.tsx` (슬롯 기반 문구/CTA 분기)

---

## 시나리오 4) 비회원 주문조회 결과/상세에서 CTA 분기

### 준비 데이터 조건
- 케이스 A: `withStringService=true`, `stringingApplicationId` 없음, `isStringServiceApplied=false`
- 케이스 B: `withStringService=true`, `stringingApplicationId` 있음(또는 `isStringServiceApplied=true`)
- 케이스 C: `withStringService=false`

### 진입 URL
- 결과: `/order-lookup/results?name=...&email=...`
- 상세: `/order-lookup/details/{orderId}`

### 기대 UI (문구/CTA/배지)
- A: "스트링 장착 신청" CTA 노출 (`/services/apply?orderId=...`)
- B: "교체 서비스 접수 완료"(툴팁/안내) 노출, 신청 CTA 숨김
- C: 교체서비스 영역 자체 미노출

### 기대 서버 결과
- 조회 API가 `withStringService`, `isStringServiceApplied`, `stringingApplicationId`를 정확히 반환
- 화면 분기와 필드값이 1:1 대응

### 실패 시 의심 지점 (관련 파일)
- `app/order-lookup/results/page.tsx`
- `app/order-lookup/details/[id]/page.tsx`
- `app/api/guest-orders/lookup/route.ts`, `app/api/guest-orders/[id]/route.ts`

---

## 시나리오 5) 마이페이지 주문목록/상세에서 CTA 분기(신청 보기/추가 신청/완료)

### 준비 데이터 조건
- 케이스 A: 신청서 연결 있음(`stringingApplicationId` 존재)
- 케이스 B: 신청 이력 있음 + 남은 슬롯 있음(`isStringServiceApplied=true`, `remainingSlots>0`)
- 케이스 C: 남은 슬롯 없음(`remainingSlots<=0`)

### 진입 URL
- 목록: `/mypage?tab=orders`
- 상세: `/mypage?tab=orders&orderId={orderId}`

### 기대 UI (문구/CTA/배지)
- A: "신청서 보기" 우선 노출
- B: "스트링 장착 서비스 추가 신청하기" 노출
- C: 완료 안내 + 신청 상세 확인 유도(신규 신청 CTA 비활성/미노출)

### 기대 서버 결과
- 주문 상세 API의 `stringingApplications` 목록/대표 ID/슬롯 값이 UI 분기와 일치

### 실패 시 의심 지점 (관련 파일)
- `app/mypage/tabs/OrderList.tsx`
- `app/mypage/orders/_components/OrderDetailClient.tsx`
- `app/api/orders/[id]/route.ts`

---

## 시나리오 6) 추가 신청 (남은 슬롯 > 0)

### 준비 데이터 조건
- 기존 주문: `withStringService=true`
- `stringService.remainingSlots > 0`
- 최소 1건 이상 기존 신청 이력(부분 사용) 존재 권장

### 진입 URL
- `/services/apply?orderId={orderId}`

### 기대 UI (문구/CTA/배지)
- 상단 배너에 "이미 일부 접수가 완료된 주문" + "남은 대상에 한해 추가 신청" 안내
- 신청서 작성/제출 진행 가능

### 기대 서버 결과
- 제출 성공 시 신규 신청서 생성 또는 진행중 draft 재사용 정책 준수
- 누적 사용량 기준으로 `usedSlots` 증가, `remainingSlots` 감소
- 주문의 연결 상태 필드(`isStringServiceApplied`, `stringingApplicationId`) 유효 유지

### 실패 시 의심 지점 (관련 파일)
- `app/services/apply/page.tsx` (배너/검증/제출)
- `app/features/stringing-applications/api/handlers.ts` (draft 재사용/생성)
- `app/features/stringing-applications/api/submit-core.ts` (주문 필드 동기화)

---

## 시나리오 7) 슬롯 소진(remainingSlots <= 0) 상태에서 /services/apply 직접 진입 방어  ⭐핵심 상세

### 준비 데이터 조건
- 주문에 교체서비스 이력이 있어 `usedSlots >= totalSlots`
- 주문 상세 기준 `remainingSlots <= 0`

### 진입 URL
- `/services/apply?orderId={orderId}` 직접 진입

### 기대 UI (문구/CTA/배지)
- 진입 배너에서 "신청 가능 대상 모두 사용" 안내
- "주문 상세에서 확인" 유도만 노출
- 제출 버튼 경로에서 에러 토스트로 차단(추가 신청 불가)

### 기대 서버 결과
- by-order 조회/초안 생성 흐름이 불필요하게 신규 진행 상태 신청을 만들지 않음
- 주문 필드(`isStringServiceApplied/stringingApplicationId`)는 기존 상태 유지

### 실패 시 의심 지점 (관련 파일)
- `app/services/apply/page.tsx` (`isOrderSlotBlocked` 분기, 제출 차단)
- `app/api/orders/[id]/route.ts` (remainingSlots 계산 오류 여부)
- `app/features/stringing-applications/components/apply-shared/MountingInfoSection.tsx` (슬롯 기반 입력 잠금/해제)

---

## 시나리오 8) legacy/fallback 주문(서비스 포함 + stringingApplicationId 없음)에서 /services/apply 신청 가능

### 준비 데이터 조건
- 구주문/이행중 데이터: `shippingInfo.withStringService=true`
- `stringingApplicationId` 없음
- `isStringServiceApplied=true` 또는 서비스 대상 판단이 가능한 주문

### 진입 URL
- `/services/apply?orderId={orderId}`

### 기대 UI (문구/CTA/배지)
- 신청 페이지 진입 가능(서비스 대상 주문으로 인식)
- 기존 진행중 신청이 있으면 재사용, 없으면 draft 생성 후 작성 가능

### 기대 서버 결과
- by-order/draft API에서 대상 주문으로 허용
- 신규/재사용 신청서가 주문과 연결되어 추적 가능
- 최종 제출 시 주문에 연결 ID가 정상 보정됨

### 실패 시 의심 지점 (관련 파일)
- `app/features/stringing-applications/api/handlers.ts` (`withStringService || isStringServiceApplied` 허용 분기)
- `app/features/stringing-applications/api/submit-core.ts`
- `app/services/apply/page.tsx`

---

## 시나리오 9) 관리자 주문 상세/신청 상세에서 연결 상태 확인 포인트

### 준비 데이터 조건
- 주문+신청 연결 건 1개 이상
- 비교용으로 미연결/legacy 건도 1개 준비

### 진입 URL
- 주문 상세: `/admin/orders/{orderId}`
- 신청 상세: `/admin/applications/stringing/{applicationId}`

### 기대 UI (문구/CTA/배지)
- 주문 상세: 연결 문서 카드에서 신청서 링크/슬롯(총/사용/남은) 정보 확인 가능
- 신청 상세: 연결 주문 링크와 연결 컨텍스트 가이드 노출
- 연결 주문 취소 요청 상태가 신청 상세 경고 문구와 일관

### 기대 서버 결과
- 주문 ↔ 신청 상호 참조가 끊기지 않음
- 운영 액션(배송 등록/취소 처리) 시 연결 문맥 우선 라우팅 정책 유지

### 실패 시 의심 지점 (관련 파일)
- `app/features/orders/components/OrderDetailClient.tsx`
- `app/features/stringing-applications/components/StringingApplicationDetailClient.tsx`
- `app/features/orders/components/OrdersClient.tsx` (연결 시 신청서 배송등록으로 리다이렉트)

---

## 실행 체크리스트(요약)
- [ ] 시나리오 1~9를 스테이징 DB 기준으로 최소 1회씩 재현
- [ ] 각 시나리오별 UI 캡처 + 주문/신청 핵심 필드 스냅샷 저장
- [ ] 실패 케이스 발생 시 "의심 지점" 파일 순서대로 역추적
- [ ] 릴리스 전, 시나리오 2/3/7(핵심 상세) 재검증
