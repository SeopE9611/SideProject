# 교체 서비스 QA 실행 우선순위 + 테스트 데이터 준비 가이드 (6단계-B)

## 문서 목적
- `docs/checkout-stringing-qa-checklist.md`의 1~9 시나리오를 **바로 실행 가능한 순서**로 재정렬한다.
- QA 담당자가 실행 전에 준비해야 하는 테스트 데이터 조건(필드 기준)을 표준화한다.
- 실패 발생 시 첫 추적 파일을 빠르게 찾을 수 있도록 시나리오별 우선 점검 파일을 지정한다.

## 1) QA 실행 우선순위 (위험도/중요도 기준)

> 원칙: 결제/접수 무결성 → 슬롯 차단/우회 방지 → 사용자 노출 분기 → 운영 확인 순으로 점검한다.

| 우선순위 | 시나리오 | 우선 점검 이유 |
|---|---|---|
| P0-1 | 통합 제출(스트링+서비스) | 결제 직후 신청서 자동 연결의 핵심 경로. 실패 시 주문-신청 연결 전체 신뢰도가 무너짐 |
| P0-2 | 통합 제출(라켓+스트링+서비스) | 슬롯 계산(`total/used/remaining`)의 기준 시나리오. 추가 신청/차단 로직의 전제가 됨 |
| P0-3 | 슬롯 소진 직접 진입 방어 | `/services/apply` 우회 진입 시 과접수·중복접수 방지 핵심 |
| P1-1 | 마이페이지 CTA 분기 | 회원 사용자의 주 경로. 잘못된 CTA 노출은 재신청/오접수 유발 |
| P1-2 | 비회원 주문조회 CTA 분기 | 비회원 경로에서 상태 오인/잘못된 신청 유도 방지 |
| P1-3 | 추가 신청 | `remainingSlots > 0`에서만 허용되어야 하며 누적 사용량 동기화 검증 필요 |
| P1-4 | legacy fallback 주문 | 기존 데이터 호환성 보장. 운영 중 과거 주문 처리 안정성 확인 |
| P2-1 | 일반 주문(서비스 미포함) | 비대상 주문에서 교체서비스 UI/API가 노출되지 않는지 회귀 확인 |
| P2-2 | 관리자 연결 상태 확인 | 운영 화면 참조 무결성 점검. 사용자 경로 안정화 후 최종 확인 |

---

## 2) 테스트 데이터 준비표

### 2-1. 공통 필드 체크셋
- `shippingInfo.withStringService`
- `orders.stringingApplicationId`
- `orders.isStringServiceApplied`
- `stringService.totalSlots / usedSlots / remainingSlots`
- 회원/비회원 여부(로그인 상태, 주문조회 조건)
- `orderId`, `rentalId` 유무

### 2-2. 시나리오별 데이터 조건

| 시나리오 | withStringService | stringingApplicationId | isStringServiceApplied | 슬롯 필드(total/used/remaining) | 사용자 유형 | ID 조건 |
|---|---|---|---|---|---|---|
| 일반 주문(서비스 미포함) | `false` | `null` 또는 미설정 | `false` 또는 미설정 | 미노출 또는 0 기반 | 회원/비회원 모두 | `orderId` 필수, `rentalId` 무관 |
| 통합 제출(스트링+서비스) | `true` | 결제 직후 생성 ID 존재 | `true` | 최소 `total>=1`, 제출 후 `used>=1` | 회원 우선(비회원 조회도 준비) | `orderId` 필수 |
| 통합 제출(라켓+스트링+서비스) | `true` | 존재(대표 연결) | `true` | `remaining = max(total-used,0)` 충족 | 회원 | `orderId` 필수 |
| 마이페이지 CTA 분기 | `true/false` 혼합 세트 | 있음/없음 케이스 분리 | `true/false` 케이스 분리 | `remaining >0`, `=0` 각각 필요 | 회원 | 서로 다른 `orderId` 3건 이상 |
| 비회원 주문조회 CTA 분기 | `true/false` 혼합 세트 | 있음/없음 케이스 분리 | `true/false` 케이스 분리 | 필요 시 `remaining` 포함 응답 확인 | 비회원 | 비회원 주문조회 가능한 `orderId` |
| 추가 신청 | `true` | 기존 ID 존재 또는 과거 이력 존재 | `true` | `remaining > 0` 필수 | 회원 | `orderId` 필수 |
| 슬롯 소진 직접 진입 방어 | `true` | 있음/없음 모두 가능(핵심은 소진) | 보통 `true` | `remaining <= 0` 필수 | 회원(직접 URL 진입) | `orderId` 필수 |
| legacy fallback 주문 | `true` | 없음(핵심) | `true` 권장(또는 대상 판별 가능 상태) | 데이터 이관 상태에 따라 상이 | 회원 우선 | 구주문 `orderId` 필수 |
| 관리자 연결 상태 확인 | `true` 중심 + 비교군 | 연결건 ID 존재 + 미연결건 | 혼합 | 슬롯값이 주문/신청 상세에서 일치 | 관리자 | `orderId` + `applicationId` |

---

## 3) 권장 실행 순서 (실행 동선)

1. **사용자 checkout 실행**
   - P0-1(스트링+서비스) → P0-2(라켓+스트링+서비스) 순서로 결제/제출.
2. **success/주문 완료 상태 확인**
   - 주문 응답 및 성공 페이지에서 `stringingApplicationId`, 서비스 적용 여부 확인.
3. **마이페이지 확인**
   - 주문 목록/상세에서 CTA 분기(신청서 보기/추가 신청/완료) 점검.
4. **비회원 조회 확인**
   - 동일 주문에 대해 결과/상세에서 CTA 분기 일치 여부 점검.
5. **추가 신청 및 차단 경로 확인**
   - `remaining > 0` 추가 신청 성공 후, `remaining <= 0` 직접 진입 차단 검증.
6. **legacy fallback 확인**
   - 구주문에서 `/services/apply?orderId=...` 진입/작성 가능 여부 확인.
7. **관리자 화면 확인**
   - 주문 상세 ↔ 신청 상세 상호 링크, 슬롯/상태 일치 최종 검증.
8. **회귀 확인**
   - 마지막에 일반 주문(서비스 미포함)으로 교체서비스 미노출 재확인.

---

## 4) 실패 시 우선 점검 파일 (시나리오별)

| 시나리오 | 1차 점검 | 2차 점검 | 3차 점검 |
|---|---|---|---|
| 일반 주문(서비스 미포함) | `app/features/orders/api/handlers.ts` | `app/mypage/tabs/OrderList.tsx` | `app/order-lookup/results/page.tsx`, `app/order-lookup/details/[id]/page.tsx` |
| 통합 제출(스트링+서비스) | `app/features/orders/api/handlers.ts` | `app/features/stringing-applications/api/submit-core.ts` | `app/mypage/tabs/OrderList.tsx`, `app/mypage/orders/_components/OrderDetailClient.tsx` |
| 통합 제출(라켓+스트링+서비스) | `app/api/orders/[id]/route.ts` | `app/features/stringing-applications/hooks/useCheckoutStringingServiceAdapter.ts` | `app/mypage/orders/_components/OrderDetailClient.tsx` |
| 마이페이지 CTA 분기 | `app/mypage/tabs/OrderList.tsx` | `app/mypage/orders/_components/OrderDetailClient.tsx` | `app/api/orders/[id]/route.ts` |
| 비회원 주문조회 CTA 분기 | `app/order-lookup/results/page.tsx` | `app/order-lookup/details/[id]/page.tsx` | `app/api/guest-orders/lookup/route.ts`, `app/api/guest-orders/[id]/route.ts` |
| 추가 신청 | `app/services/apply/page.tsx` | `app/features/stringing-applications/api/handlers.ts` | `app/features/stringing-applications/api/submit-core.ts` |
| 슬롯 소진 직접 진입 방어 | `app/services/apply/page.tsx` | `app/api/orders/[id]/route.ts` | `app/features/stringing-applications/components/apply-shared/MountingInfoSection.tsx` |
| legacy fallback 주문 | `app/features/stringing-applications/api/handlers.ts` | `app/features/stringing-applications/api/submit-core.ts` | `app/services/apply/page.tsx` |
| 관리자 연결 상태 확인 | `app/features/orders/components/OrderDetailClient.tsx` | `app/features/stringing-applications/components/StringingApplicationDetailClient.tsx` | `app/features/orders/components/OrdersClient.tsx` |

---

## 5) 실행 체크 로그 템플릿 (권장)
- 실행 일시:
- 실행자:
- 대상 환경:
- 시나리오 ID:
- 사용 주문 ID/신청서 ID:
- 확인 필드 스냅샷:
  - `withStringService`:
  - `stringingApplicationId`:
  - `isStringServiceApplied`:
  - `total/used/remaining`:
- UI 결과:
- 실패 여부/오류 메시지:
- 우선 점검 파일 추적 결과:

