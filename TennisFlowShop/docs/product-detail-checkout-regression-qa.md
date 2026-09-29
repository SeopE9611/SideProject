# Product Detail → Checkout Regression QA

## 1. 목적

ProductDetailClient 리팩토링 후, 기능 변경 없이 기존 구매 플로우가 유지되는지 검증한다. 이번 문서는 코드 수정용이 아니라 QA 실행 기준이다.

## 2. 범위

### 포함 범위

- 상품 상세 페이지
- 색상/게이지/수량 선택
- 장바구니 담기
- 바로구매
- 교체서비스 포함 바로구매
- 로그인/비회원 redirect
- checkout `mode=buynow`
- checkout `withService=1`
- 배송비/장착비/포인트/최종 결제금액
- 무통장 주문 생성
- 나이스페이 prepare
- 서버 주문 생성 검증

### 제외 범위

- 관리자 주문 처리 UI
- 리뷰 작성 페이지 자체
- QnA 게시판 작성 페이지 자체
- 라켓 단독 상세 리팩토링
- 실결제 승인 이후 정산/환불

## 3. 핵심 코드 경계

| 파일                                   | QA에서 검증할 경계                                                                                                                                       |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ProductDetailClient.tsx`              | PDP 옵션 선택 상태, 수량 증감, 재고 차단, 장바구니 담기, 바로구매, 교체서비스 포함 바로구매, 로그인 redirect, checkout 이동 URL을 검증한다.              |
| `useProductDetailOptions.ts`           | 색상/게이지 후보 산출, 기본 선택, `variantInventories` 기반 재고, `effectiveStock`, `variantPurchaseBlocked` 계산을 검증한다.                            |
| `ProductDetailCartItem.utils.ts`       | PDP 선택값이 `CartItem`의 가격, 수량, 이미지, 재고, 게이지, 색상 payload로 정확히 변환되는지 검증한다.                                                   |
| `ProductDetailOptionPayload.utils.ts`  | 선택 색상/게이지 payload와 색상 이미지 fallback이 장바구니, 바로구매, 위시리스트 기준으로 유지되는지 검증한다.                                           |
| `ProductDetailCheckoutTarget.utils.ts` | 일반 바로구매와 교체서비스 포함 바로구매 checkout URL의 `mode=buynow`, `withService=1`, `mountingFee` query를 검증한다.                                  |
| `ProductDetailLoginTarget.utils.ts`    | 로그인 필요 시 `/login?next=`에 checkout 복귀 URL이 안전하게 encode되는지 검증한다.                                                                      |
| `buyNowStore.ts`                       | 단일 바로구매 item 보관 및 clear 흐름을 검증한다. persist가 아니므로 로그인 redirect/새로고침 중 item 유지 여부는 수동 검증 필요 항목이다.               |
| `pdpBundleStore.ts`                    | PDP 라켓+스트링 번들 item 보관 및 clear 흐름을 검증한다. persist가 아니므로 로그인 redirect/새로고침 중 bundle item 유지 여부는 수동 검증 필요 항목이다. |
| `cartStore.ts`                         | persist 기반 장바구니 저장, line key(`id`/`kind`/`selectedGauge`/`selectedColor`) 기준 병합, 재고 한도 clamp를 검증한다.                                 |
| `checkout/page.tsx`                    | `mode=buynow`, `source=cart-selection`, 일반 cart checkout, `withService=1`, mini API 로딩, 배송비/장착비/포인트/최종 금액 구성을 검증한다.              |
| `CheckoutButton.tsx`                   | 무통장 주문 생성 payload, `expectedPayableAmount`, `pointsToUse`, 금액 불일치 사용자 메시지를 검증한다.                                                  |
| `NiceCheckoutButton.tsx`               | 나이스페이 prepare payload와 화면 금액 일치, 0원 결제 전환, 비회원/환경 설정 차단을 검증한다.                                                            |
| `app/features/orders/api/handlers.ts`  | 서버 주문 생성 검증, guest/shipping 정보, variant 재고, 스트링 단품 정책, 번들 수량, 금액/포인트/배송비/서비스비 저장값을 검증한다.                      |
| `lib/payments/toss/checkout-quote.ts`  | 서버 기준 결제 quote의 상품가, 배송비, 장착비, 포인트, payable amount 산출을 검증한다.                                                                   |

## 4. PDP 옵션/재고 QA

| 케이스                                                      | 준비 조건                                                                | 사용자 동작                         | 기대 결과                                                                               | 실패 시 의심 파일                                                                                   |
| ----------------------------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 색상 없는 상품                                              | `colorInventories`와 `variantInventories`가 없거나 노출 색상이 없는 상품 | PDP 진입 후 수량 선택               | 색상 선택 UI 없이 구매 가능 조건이 계산된다. 대표 이미지는 상품 기본 이미지가 사용된다. | `ProductDetailClient.tsx`, `useProductDetailOptions.ts`, `ProductDetailCartItem.utils.ts`           |
| 색상 있는 상품                                              | 판매 가능한 색상 row가 있는 상품                                         | 색상 swatch 선택                    | 선택 색상 label/hex/image가 PDP와 payload에 반영된다.                                   | `ProductDetailClient.tsx`, `useProductDetailOptions.ts`, `ProductDetailOptionPayload.utils.ts`      |
| 색상 품절                                                   | 특정 색상의 재고가 0 또는 판매 불가                                      | 품절 색상 선택 또는 구매 클릭       | 품절 상태가 표시되고 구매/장바구니 진행이 차단된다.                                     | `ProductDetailClient.tsx`, `useProductDetailOptions.ts`                                             |
| `variantInventories` 있는 상품                              | 색상+게이지 조합별 재고가 있는 스트링 상품                               | 색상 선택 후 게이지 후보 확인       | 선택 색상에 해당하는 판매 가능 게이지 목록과 재고가 표시된다.                           | `useProductDetailOptions.ts`, `ProductDetailClient.tsx`                                             |
| 게이지 1개 자동 선택                                        | 판매 가능한 게이지가 1개인 상품                                          | PDP 진입 또는 색상 선택             | 게이지가 자동 선택되고 구매 버튼이 활성 조건을 만족한다.                                | `useProductDetailOptions.ts`, `ProductDetailClient.tsx`                                             |
| 게이지 여러 개 수동 선택                                    | 판매 가능한 게이지가 2개 이상인 상품                                     | 게이지 select에서 옵션 선택         | 선택 게이지가 payload, 장바구니 line key, checkout item에 반영된다.                     | `ProductDetailClient.tsx`, `ProductDetailOptionPayload.utils.ts`, `ProductDetailCartItem.utils.ts`  |
| 게이지 미선택 상태에서 구매 클릭                            | 게이지 필수 상품에서 선택값 제거 또는 초기 미선택 상태                   | 바로구매/장바구니 클릭              | 게이지 선택 안내가 표시되고 이동/저장이 발생하지 않는다.                                | `ProductDetailClient.tsx`, `useProductDetailOptions.ts`                                             |
| 수량 증가/감소                                              | 재고가 2개 이상인 상품                                                   | `+`/`-` 버튼 클릭                   | 수량은 1 이상 `effectiveStock` 이하로만 변경된다.                                       | `ProductDetailClient.tsx`, `useProductDetailOptions.ts`                                             |
| 수량이 `effectiveStock` 초과                                | 선택 조합 재고보다 큰 수량 시도                                          | 수량 증가 또는 구매 클릭            | 초과 수량은 clamp되거나 구매가 차단되고 재고 부족 메시지가 표시된다.                    | `useProductDetailOptions.ts`, `ProductDetailClient.tsx`, `ProductDetailCheckoutValidation.utils.ts` |
| 선택한 색상/게이지 조합 품절                                | `variantInventories`에서 해당 조합 stock 0                               | 해당 색상/게이지 선택 후 구매 클릭  | `variantPurchaseBlocked` 조건으로 구매/장바구니가 차단된다.                             | `useProductDetailOptions.ts`, `ProductDetailClient.tsx`                                             |
| 선택 색상 이미지가 대표 이미지/장바구니 이미지에 반영되는지 | 색상별 이미지 또는 variant colorImage가 있는 상품                        | 색상 선택 후 장바구니 담기/바로구매 | PDP 대표 이미지와 `CartItem.image`, `selectedColorImage`가 선택 색상 기준으로 표시된다. | `ProductDetailClient.tsx`, `ProductDetailCartItem.utils.ts`, `ProductDetailOptionPayload.utils.ts`  |

## 5. PDP → Cart QA

`cartStore`는 persist를 사용하므로 새로고침 후에도 장바구니 상태가 유지되어야 한다. 동일 라인 판정은 `id`/`kind`/`selectedGauge`/`selectedColor` 기준이며, 같은 상품이라도 색상 또는 게이지가 다르면 별도 라인으로 생성되어야 한다.

| 케이스                                                | 준비 조건                                        | 사용자 동작                        | 기대 결과                                            | 실패 시 의심 파일                                                           |
| ----------------------------------------------------- | ------------------------------------------------ | ---------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------- |
| 로그인 상태 장바구니 담기                             | 로그인 사용자, 판매 가능 상품                    | PDP에서 옵션 선택 후 장바구니 담기 | 장바구니에 item이 추가되고 persist 저장된다.         | `ProductDetailClient.tsx`, `ProductDetailCartItem.utils.ts`, `cartStore.ts` |
| 비로그인 + 비회원 주문 허용 상태 장바구니 담기        | 비로그인, 비회원 주문 허용 설정                  | 장바구니 담기                      | 로그인 강제 없이 장바구니에 item이 추가된다.         | `ProductDetailClient.tsx`, `cartStore.ts`                                   |
| 비로그인 + 비회원 주문 차단 상태 장바구니 담기        | 비로그인, 비회원 주문 차단 설정                  | 장바구니 담기                      | 로그인 안내 또는 `/login?next=` redirect가 동작한다. | `ProductDetailClient.tsx`, `ProductDetailLoginTarget.utils.ts`              |
| 동일 상품 + 동일 색상/게이지 추가 시 수량 증가        | 이미 같은 line key item이 장바구니에 있음        | 동일 옵션으로 다시 담기            | 새 라인이 아니라 기존 라인의 수량이 증가한다.        | `cartStore.ts`, `ProductDetailCartItem.utils.ts`                            |
| 동일 상품 + 다른 색상/게이지 추가 시 별도 라인 생성   | 같은 상품의 다른 색상 또는 게이지 선택 가능      | 다른 옵션으로 담기                 | 별도 장바구니 라인이 생성된다.                       | `cartStore.ts`, `ProductDetailOptionPayload.utils.ts`                       |
| 재고 한도 초과 시 차단                                | 장바구니 기존 수량이 재고 한도에 도달            | 같은 옵션 추가                     | 추가가 실패하고 재고 한도 메시지가 표시된다.         | `cartStore.ts`, `ProductDetailClient.tsx`                                   |
| 스트링 단품 판매 중단 상태에서 장착 신청용 toast 표시 | 스트링 단품 판매 정책 OFF, 장착 가능 스트링 상품 | 장바구니 담기 또는 구매 버튼 확인  | 단품 구매 대신 장착 신청 흐름 안내 toast가 표시된다. | `ProductDetailClient.tsx`                                                   |

## 6. PDP → BuyNow QA

| 케이스                                 | 준비 조건                              | 사용자 동작                               | 기대 결과                                                                                                   | 실패 시 의심 파일                                                                   |
| -------------------------------------- | -------------------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 일반 바로구매                          | 판매 가능 상품, 필수 옵션 선택         | 바로구매 클릭                             | `buyNowStore`에 item이 저장되고 `/checkout?mode=buynow`로 이동한다.                                         | `ProductDetailClient.tsx`, `ProductDetailCheckoutTarget.utils.ts`, `buyNowStore.ts` |
| 교체서비스 포함 바로구매               | 장착 가능 스트링 상품                  | 교체서비스 포함 바로구매 클릭             | item 저장 후 `mode=buynow&withService=1&mountingFee=...` query로 이동한다.                                  | `ProductDetailClient.tsx`, `ProductDetailCheckoutTarget.utils.ts`, `buyNowStore.ts` |
| `withService=1` query 유지             | 교체서비스 포함 flow                   | checkout 도착 후 URL 확인                 | checkout에서 `withService=1`이 유지되고 서비스 ON 초기화가 진행된다.                                        | `ProductDetailCheckoutTarget.utils.ts`, `checkout/page.tsx`                         |
| `mountingFee` query 유지               | 장착비가 있는 상품                     | 교체서비스 포함 checkout 진입             | URL에 `mountingFee`가 포함된다. 단, checkout 최종 계산은 mini API 기준 금액과 함께 확인한다.                | `ProductDetailCheckoutTarget.utils.ts`, `checkout/page.tsx`                         |
| 비로그인 + 비회원 주문 허용            | 비로그인, guest checkout 허용          | 바로구매 클릭                             | 로그인 없이 checkout 진입이 가능하다.                                                                       | `ProductDetailClient.tsx`, `checkout/page.tsx`                                      |
| 비로그인 + 비회원 주문 차단            | 비로그인, guest checkout 차단          | 바로구매 클릭                             | `/login?next=`로 이동하고 next에 checkout URL이 포함된다.                                                   | `ProductDetailClient.tsx`, `ProductDetailLoginTarget.utils.ts`, `checkout/page.tsx` |
| 로그인 후 checkout 복귀                | 비로그인 차단 상태에서 로그인 완료     | 로그인 완료 후 redirect 확인              | checkout으로 복귀하고 의도한 구매 flow가 이어지는지 확인한다.                                               | `ProductDetailLoginTarget.utils.ts`, `checkout/page.tsx`, `buyNowStore.ts`          |
| `buyNowStore` item 유지 여부 검증 필요 | `buyNowStore.ts`가 persist가 아닌 상태 | 바로구매 후 로그인 redirect 또는 새로고침 | item이 사라지는지 반드시 수동 QA로 기록한다. 이 문서에서는 수정안을 제시하지 않고 “검증 필요”로만 표시한다. | `buyNowStore.ts`, `ProductDetailClient.tsx`, `checkout/page.tsx`                    |

## 7. PDP Bundle QA

`pdpBundleStore.ts`도 persist가 아니므로 로그인 redirect/새로고침 시 bundle item 유지 여부를 반드시 검증 대상으로 기록한다.

| 케이스                                                     | 준비 조건                                | 사용자 동작                        | 기대 결과                                                                | 실패 시 의심 파일                                                                                 |
| ---------------------------------------------------------- | ---------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| 라켓 + 스트링 번들 checkout                                | 라켓 PDP에서 스트링 장착 조합 생성 가능  | 라켓과 스트링을 함께 checkout 진입 | 라켓 item과 스트링 item이 함께 orderItems로 구성된다.                    | `pdpBundleStore.ts`, `checkout/page.tsx`                                                          |
| `pdpBundleStore`가 persist가 아닌 점                       | bundle checkout 진입 전 item 저장        | 새로고침 또는 로그인 redirect      | bundle item 유지 여부를 수동 검증한다. 사라질 경우 QA 로그에 기록한다.   | `pdpBundleStore.ts`, `checkout/page.tsx`                                                          |
| `mode=buynow` + `withService=1` + `orderItems.length >= 2` | 라켓+스트링 bundle 구성                  | checkout URL과 orderItems 확인     | checkout이 bundle checkout으로 판단하고 장착비/수량 검증을 적용한다.     | `checkout/page.tsx`                                                                               |
| 라켓 수량과 스트링 수량 일치                               | 라켓 1개, 스트링 1개 또는 동일 수량 구성 | 주문 생성 시도                     | 수량이 같으면 진행되고 다르면 서버에서 `BUNDLE_QTY_MISMATCH`로 실패한다. | `checkout/page.tsx`, `app/features/orders/api/handlers.ts`, `lib/payments/toss/checkout-quote.ts` |
| 라켓 1종 + 장착 스트링 1종 제한                            | 라켓/스트링 여러 라인 구성 가능 상황     | bundle checkout 및 주문 생성 시도  | 라켓 1종 + 장착 스트링 1종 제한이 유지된다.                              | `checkout/page.tsx`, `app/features/orders/api/handlers.ts`                                        |

## 8. Checkout 진입/구성 QA

| 케이스                                                                           | 준비 조건                        | 사용자 동작                | 기대 결과                                                                | 실패 시 의심 파일                                          |
| -------------------------------------------------------------------------------- | -------------------------------- | -------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------- |
| `mode=buynow`                                                                    | PDP 바로구매 item 저장           | checkout 진입              | `buyNowItem` 또는 `pdpBundleItems` 기준으로 orderItems가 구성된다.       | `checkout/page.tsx`, `buyNowStore.ts`, `pdpBundleStore.ts` |
| `source=cart-selection`                                                          | 장바구니 선택 구매 flow          | 선택 상품 checkout 진입    | 선택 line key에 해당하는 cart item만 orderItems에 포함된다.              | `checkout/page.tsx`, `cartStore.ts`                        |
| 일반 cart checkout                                                               | 장바구니에 여러 item 존재        | 일반 checkout 진입         | 전체 cartItems가 orderItems로 구성된다.                                  | `checkout/page.tsx`, `cartStore.ts`                        |
| `withService=1` 진입 시 서비스 ON                                                | URL에 `withService=1`            | checkout 진입              | hydration 후 서비스 ON 상태가 적용된다.                                  | `checkout/page.tsx`                                        |
| `withService=1`이 아니면 서비스 OFF                                              | URL에 `withService=1` 없음       | checkout 진입              | 서비스 OFF가 기본으로 확정된다.                                          | `checkout/page.tsx`                                        |
| orderItems가 hydration 전 비어있을 때 오판하지 않는지                            | persist store hydration 전 상태  | checkout 최초 렌더 확인    | 빈 orderItems를 즉시 오류로 확정하지 않고 결정 가능한 상태까지 기다린다. | `checkout/page.tsx`                                        |
| `/api/products/[id]/mini` 로딩 중 구성 에러가 깜박이지 않는지                    | 장착비/배송비 mini API 로딩 발생 | checkout 진입 후 화면 관찰 | 로딩 중 구성 오류가 깜박이며 표시되지 않는다.                            | `checkout/page.tsx`                                        |
| mini API 실패 시 fallback 배송비/장착비 표시가 사용자를 혼란스럽게 만들지 않는지 | mini API 실패 상황 재현          | checkout 금액 영역 확인    | fallback 금액 표시와 오류 안내가 혼동을 만들지 않는지 수동 기록한다.     | `checkout/page.tsx`                                        |

## 9. 배송비/장착비/포인트/금액 QA

| 케이스                                         | 준비 조건                                 | 사용자 동작              | 기대 결과                                             | 실패 시 의심 파일                                                                                 |
| ---------------------------------------------- | ----------------------------------------- | ------------------------ | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 택배수령 배송비                                | 배송비가 있는 상품                        | 택배수령 선택            | 배송비가 최종 금액에 합산된다.                        | `checkout/page.tsx`, `CheckoutButton.tsx`, `app/features/orders/api/handlers.ts`                  |
| 방문수령 배송비 0원                            | 방문수령 가능 flow                        | 방문수령 선택            | 배송비가 0원으로 계산된다.                            | `checkout/page.tsx`, `app/features/orders/api/handlers.ts`, `lib/payments/toss/checkout-quote.ts` |
| 교체서비스 ON 장착비 합산                      | 장착 가능 상품, `withStringService` ON    | checkout 금액 확인       | 장착비가 서비스비로 합산된다.                         | `checkout/page.tsx`, `app/features/orders/api/handlers.ts`                                        |
| 교체서비스 OFF 장착비 제외                     | 장착 가능 상품, 서비스 OFF                | checkout 금액 확인       | 장착비가 최종 금액에서 제외된다.                      | `checkout/page.tsx`, `app/features/orders/api/handlers.ts`                                        |
| 패키지권 보유 시 장착비 차감 또는 무료 처리    | 장착 패키지권 보유 계정                   | 교체서비스 ON            | 정책에 맞게 장착비 차감 또는 무료 처리된다.           | `checkout/page.tsx`, `app/features/orders/api/handlers.ts`                                        |
| 포인트 100P 단위 적용                          | 포인트 보유 회원                          | 100P 미만 단위 포함 입력 | 적용 포인트가 100P 단위로 정규화된다.                 | `checkout/page.tsx`, `CheckoutButton.tsx`, `app/features/orders/api/handlers.ts`                  |
| 배송비에는 포인트 미적용                       | 상품가와 배송비가 모두 있는 주문          | 포인트 사용              | 포인트는 배송비를 제외한 정책 한도 내에서만 적용된다. | `checkout/page.tsx`, `lib/payments/toss/checkout-quote.ts`, `app/features/orders/api/handlers.ts` |
| 포인트 잔액보다 많이 입력                      | 보유 포인트보다 큰 값 입력                | 결제 시도                | 보유 잔액/정책 한도 이하로 clamp된다.                 | `checkout/page.tsx`, `CheckoutButton.tsx`, `app/features/orders/api/handlers.ts`                  |
| 포인트 사용 후 0원 결제                        | payable amount가 0원이 되도록 포인트 입력 | 결제 시도                | 0원 결제가 가능한 주문 생성 flow로 진행된다.          | `checkout/page.tsx`, `CheckoutButton.tsx`, `app/features/orders/api/handlers.ts`                  |
| 나이스페이 선택 중 0원 결제 시 무통장으로 전환 | 결제수단 나이스페이, payable 0원          | 포인트 적용 후 결제      | 결제수단이 무통장/0원 주문 flow로 전환된다.           | `checkout/page.tsx`, `NiceCheckoutButton.tsx`, `CheckoutButton.tsx`                               |

## 10. 주문 생성 API QA

| 케이스                                                                                   | 준비 조건                                              | 사용자 동작                       | 기대 결과                                              | 실패 시 의심 파일                                                            |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------ | --------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------- |
| 무통장 주문 생성 성공                                                                    | 유효한 주문자/배송/상품/금액 payload                   | 무통장 주문 생성                  | 주문이 생성되고 서버 저장 금액이 화면 계산과 일치한다. | `CheckoutButton.tsx`, `app/features/orders/api/handlers.ts`                  |
| `guestInfo` 누락 시 실패                                                                 | 비회원 주문 payload에서 guestInfo 누락                 | 주문 생성 시도                    | 서버가 유효성 오류로 실패 처리한다.                    | `CheckoutButton.tsx`, `app/features/orders/api/handlers.ts`                  |
| `shippingInfo` 누락 시 실패                                                              | 배송 정보 누락                                         | 주문 생성 시도                    | 서버가 유효성 오류로 실패 처리한다.                    | `CheckoutButton.tsx`, `app/features/orders/api/handlers.ts`                  |
| 택배수령 주소 누락 시 실패                                                               | delivery method 택배, 주소 누락                        | 주문 생성 시도                    | 주소 누락 오류로 실패한다.                             | `checkout/page.tsx`, `app/features/orders/api/handlers.ts`                   |
| 방문수령 주소 없이 성공                                                                  | delivery method 방문수령                               | 주문 생성 시도                    | 배송 주소 없이 주문 생성이 성공한다.                   | `checkout/page.tsx`, `app/features/orders/api/handlers.ts`                   |
| `variantInventories` 색상/게이지 누락 시 실패                                            | variant 상품에서 selectedColor 또는 selectedGauge 누락 | 주문 생성 시도                    | 서버가 옵션 누락으로 실패 처리한다.                    | `app/features/orders/api/handlers.ts`                                        |
| `variantInventories` 재고 부족 시 실패                                                   | 서버 재고가 주문 수량보다 적음                         | 주문 생성 시도                    | 서버가 재고 부족으로 실패 처리하고 차감하지 않는다.    | `app/features/orders/api/handlers.ts`                                        |
| 스트링 단품 판매 중단 정책 우회 실패                                                     | 스트링 단품 판매 정책 OFF                              | client 우회 payload로 주문 생성   | 서버에서 `STRING_ONLY_ORDER_DISABLED`로 실패한다.      | `app/features/orders/api/handlers.ts`                                        |
| 라켓+스트링 번들 수량 불일치 실패                                                        | 라켓 수량과 스트링 수량 불일치                         | 주문 생성 시도                    | 서버에서 `BUNDLE_QTY_MISMATCH`로 실패한다.             | `app/features/orders/api/handlers.ts`, `lib/payments/toss/checkout-quote.ts` |
| `PAYMENT_AMOUNT_MISMATCH` 발생 시 사용자 메시지 확인                                     | client expected payable과 서버 산출 금액 불일치        | 주문 생성 시도                    | 사용자에게 금액 변경/새로고침 안내가 표시된다.         | `CheckoutButton.tsx`, `app/features/orders/api/handlers.ts`                  |
| 서버 저장 `totalPrice`/`originalTotalPrice`/`shippingFee`/`serviceFee`/`pointsUsed` 확인 | 주문 생성 성공                                         | 주문 상세 또는 관리자 데이터 확인 | 저장 금액 필드가 서버 재계산 결과와 일치한다.          | `app/features/orders/api/handlers.ts`, `lib/payments/toss/checkout-quote.ts` |

## 11. 나이스페이 prepare QA

| 케이스                                               | 준비 조건                                   | 사용자 동작             | 기대 결과                                                      | 실패 시 의심 파일                                                                                         |
| ---------------------------------------------------- | ------------------------------------------- | ----------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 나이스페이 비활성 환경                               | 나이스페이 사용 불가 설정                   | 나이스페이 결제 선택    | prepare가 차단되거나 비활성 안내가 표시된다.                   | `NiceCheckoutButton.tsx`, `app/api/payments/nice/prepare/route.ts`                                        |
| `NICEPAY_CLIENT_KEY` 누락                            | client key 미설정 환경                      | 나이스페이 결제 선택    | 나이스페이 버튼/prepare가 안전하게 차단된다.                   | `NiceCheckoutButton.tsx`, `app/api/payments/nice/prepare/route.ts`                                        |
| 비회원 주문 차단 상태                                | 비로그인, guest checkout 차단               | 나이스페이 결제 시도    | 로그인 gate 또는 차단 메시지가 표시된다.                       | `checkout/page.tsx`, `NiceCheckoutButton.tsx`, `app/api/payments/nice/prepare/route.ts`                   |
| prepare 금액과 화면 금액 일치                        | 정상 상품/배송/포인트 구성                  | 나이스페이 prepare 호출 | prepare 금액이 화면 payable amount와 일치한다.                 | `NiceCheckoutButton.tsx`, `app/api/payments/nice/prepare/route.ts`, `lib/payments/toss/checkout-quote.ts` |
| 상품 가격/배송비/포인트 변경으로 prepare 금액 불일치 | checkout 체류 중 가격 또는 포인트 상태 변경 | 나이스페이 prepare 호출 | 금액 불일치가 실패 처리되고 사용자에게 재확인 안내가 표시된다. | `NiceCheckoutButton.tsx`, `app/api/payments/nice/prepare/route.ts`                                        |
| `withStringService` 포함 결제                        | 교체서비스 ON                               | 나이스페이 prepare 호출 | 장착비 포함 금액으로 prepare되고 서버 quote와 일치한다.        | `checkout/page.tsx`, `NiceCheckoutButton.tsx`, `app/api/payments/nice/prepare/route.ts`                   |

## 12. 성능/네트워크 계측 체크리스트

성능 개선안은 이 문서에 작성하지 않는다. 아래 항목은 실제 브라우저 QA/성능 계측 시 측정값과 관찰 로그만 기록한다.

| 계측 항목                                                                                | 기록 값 | 스크린샷/로그 | 비고 |
| ---------------------------------------------------------------------------------------- | ------- | ------------- | ---- |
| 상품 상세 최초 로드 시 document 응답 시간                                                |         |               |      |
| 상품 상세 최초 로드 시 JS bundle 요청 수                                                 |         |               |      |
| 상품 상세 최초 로드 시 이미지 총 용량                                                    |         |               |      |
| `/api/users/me` 호출 횟수                                                                |         |               |      |
| 리뷰 탭을 열기 전 `/api/reviews` 관련 호출이 발생하지 않는지                             |         |               |      |
| QnA 탭을 열기 전 `/api/products/[id]/qna` 호출이 발생하지 않는지                         |         |               |      |
| 관련상품 영역이 viewport 근처에 오기 전 `/api/products` 관련 추천 호출이 발생하지 않는지 |         |               |      |
| checkout 진입 후 `/api/products/[id]/mini` 호출 횟수                                     |         |               |      |
| checkout에서 동일 상품 id 중복 mini 호출이 중복 제거되는지                               |         |               |      |
| Lighthouse Performance/Mobile 점수                                                       |         |               |      |
| Network waterfall에서 가장 큰 병목                                                       |         |               |      |
| React Profiler에서 ProductDetailClient commit 시간                                       |         |               |      |

## 13. 실행 로그 템플릿

| 날짜 | 환경 | 브라우저 | 계정 상태 | 테스트 케이스 | 결과 | 스크린샷/로그 | 비고 |
| ---- | ---- | -------- | --------- | ------------- | ---- | ------------- | ---- |
|      |      |          |           |               |      |               |      |

## 14. 최종 판정 기준

| 등급 | 기준                                               | 예시                                                                                                |
| ---- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| P0   | 주문 생성/결제 금액/재고 차감/로그인 redirect 실패 | 주문 생성 불가, 결제 금액 불일치, 재고 차감 누락, 로그인 후 checkout 복귀 실패                      |
| P1   | 옵션 표시/장착비/배송비/포인트/품절 표시 오류      | 선택 색상 이미지 불일치, 장착비 합산 오류, 배송비 오류, 포인트 clamp 오류, 품절 상품 구매 버튼 활성 |
| P2   | 문구/레이아웃/성능 경미 이슈                       | 안내 문구 어색함, 모바일 간격 문제, 측정 가능한 경미한 성능 저하                                    |
