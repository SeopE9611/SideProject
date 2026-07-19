# 마이페이지 확인할 항목 정책

## 정의

`확인할 항목`은 마이페이지에서 사용자가 다음에 처리할 수 있는 거래 단위 작업입니다. 필수 조치와 선택 활동을 함께 포함하지만, 하나의 거래 flow group은 사유가 여러 개여도 최대 1건으로 계산합니다.

- 내부 scope 값: `todo`
- 대표 URL: `/mypage?tab=orders&scope=todo`
- Summary 응답: `summary.todoCount`
- Counts 응답: `counts.todo`

## required / optional 구분

| kind       | UI label  | 의미                                              |
| ---------- | --------- | ------------------------------------------------- |
| `required` | 다음 조치 | 거래 진행을 위해 사용자가 처리해야 하는 필수 작업 |
| `optional` | 선택 활동 | 거래 완료 후 사용자가 선택적으로 할 수 있는 활동  |

## reason code

| code                              | kind     | label     | 메시지                                               |
| --------------------------------- | -------- | --------- | ---------------------------------------------------- |
| `application_inbound_tracking`    | required | 다음 조치 | 라켓 발송 운송장을 등록해주세요.                     |
| `order_confirm`                   | required | 다음 조치 | 상품을 받으셨다면 구매 확정을 진행해주세요.          |
| `application_confirm`             | required | 다음 조치 | 작업 내용을 확인하고 교체서비스 확정을 진행해주세요. |
| `rental_return_shipping_register` | required | 다음 조치 | 반납 운송장을 등록해주세요.                          |
| `rental_confirm`                  | required | 다음 조치 | 반납 내용을 확인하고 수령 확인을 진행해주세요.       |
| `rental_stringing_apply`          | required | 다음 조치 | 교체서비스 신청을 이어갈 수 있어요.                  |
| `product_review`                  | optional | 선택 활동 | 후기를 남길 수 있어요.                               |
| `product_stringing_review`        | optional | 선택 활동 | 상품과 교체서비스 후기를 남길 수 있어요.             |

## 도메인별 우선순위

### Application

1. `application_inbound_tracking`
2. `application_confirm`
3. `product_stringing_review`

### Order

1. 연결 교체서비스의 고객 라켓 운송장 등록: `application_inbound_tracking`
2. 주문 구매 확정: `order_confirm`
3. 주문 또는 연계 서비스 후기: `product_review` 또는 `product_stringing_review`
4. 없으면 `null`

### Rental

1. 대여 반납 운송장 등록: `rental_return_shipping_register`
2. 반납 후 수령 확인: `rental_confirm`
3. 후기 작성: `product_review` 또는 `product_stringing_review`
4. 대여 연계 교체서비스 신청: `rental_stringing_apply`
5. 없으면 `null`

## count 기준

- 1 order group = 최대 1 count
- 1 rental group = 최대 1 count
- 1 standalone application group = 최대 1 count

## 반납 운송장 등록 조건

다음 조건을 모두 만족할 때만 `rental_return_shipping_register` 확인할 항목입니다.

1. 대여 상태가 `out` 또는 동일 의미 상태입니다.
2. `returnedAt`이 없습니다.
3. `dueAt`이 유효합니다.
4. KST 기준 오늘 날짜가 `dueAt` 날짜 이상입니다.
5. 반납 운송장이 없습니다.

반납 예정일 이전, 반납 운송장 등록 완료, 반납 완료, 대여 취소 상태는 확인할 항목이 아닙니다.

## 반납 운송장 수정

반납 운송장 수정은 선택 가능한 보정 작업이며 Todo reason code를 만들지 않습니다. `scope=all`이나 상세 화면에서 secondary action으로 유지할 수 있지만 `counts.todo`, `summary.todoCount`, `scope=todo`에는 포함하지 않습니다.

## KST 날짜 기준

반납 예정일 판정은 KST 날짜 문자열(`toKstYmd`)을 기준으로 서버에서 계산합니다. 브라우저에서 `new Date()`로 Todo 여부를 다시 계산하지 않습니다.

## SSOT

Summary API, Activity Counts API, Activity API, 거래 카드 안내와 CTA는 `lib/mypage/activity-todo.ts`의 resolver와 metadata를 기준으로 동일한 reason code를 사용합니다.

## 표시 문구와 로직 key 분리

사용자에게 보이는 한국어 문구는 metadata의 `message`로만 사용하며, 로직 분기 key로 사용하지 않습니다. 로직은 `MypageTodoReasonCode`를 기준으로 판정합니다.
