# Portfolio Demo 관리자 주문 상세 수정 후 보고서

- 작성일: 2026-09-09 (UTC)
- 기준 브랜치: `fix/portfolio-demo-order-detail-audit`
- 기준 베이스: `main` / `d2969b6` (PR #2674 포함)
- 대상 기능: 관리자 주문 상세, 연결 교체서비스 상세, 배송/수령 변경 진입 경로, 주문 상세 공용 API
- 안전 원칙: 실제 주문·결제·배송·재고·취소 데이터 변경 및 PG 호출은 수행하지 않았다.

## 전체 판정

**PARTIAL PASS**

수정 코드의 TypeScript 검사, 계약 테스트, 관리자 API 경계 검사는 통과했다. 수정 브랜치가 아직 배포되지 않은 시점에 작성했으므로 실제 배포 URL에서의 수정 후 브라우저 재검증은 PR Preview 생성 후 보완한다. 아래에서 `코드 확인`은 실제 브라우저 관찰과 구분한다.

## 수정 결과

| 수정 전 ID | 심각도 | 조치 | 수정 후 상태 | 검증 방식 |
|---|---|---|---|---|
| PRE-01 | P1 | 교체서비스 상세의 고정 `baseUrl`을 제거하고 인증 쿠키가 유지되는 same-origin API 경로로 통일 | 해결 코드 반영 | TypeScript + 계약 테스트 |
| PRE-02 | P1 | 주문 배송 화면의 origin을 forwarded host/proto에서 구성하고 Demo 직행은 조회 상세로 redirect | 해결 코드 반영 | TypeScript + 계약 테스트 |
| PRE-03 | P2 | 서버에서 Demo 조회 전용 값을 주문/신청 상세 Client로 전달. 변경 CTA는 숨김 또는 정적 조회 표시 | 해결 코드 반영 | TypeScript + 계약 테스트 |
| PRE-04 | P2 | Demo에서 취소 승인·거절 버튼과 Dialog 미렌더링 | 해결 코드 반영 | 계약 테스트 + 소스 경계 검사 |
| PRE-05 | P2 | Demo 완료 주문의 강제 취소 UI 제거. 운영환경에서도 배송완료 상태의 일반 상태 Select 잠금 | 해결 코드 반영 | TypeScript + 계약 테스트 |
| PRE-06 | P2 | `상품준비중`을 UI/API 허용 상태에 추가하고 현재 단계 이후만 선택 가능하게 제한 | 해결 코드 반영 | 계약 테스트 |
| PRE-07 | P2 | 다음 단계 추론과 최근 이력에 배송 방식을 전달해 방문 수령 문구로 통일 | 해결 코드 반영 | 계약 테스트 |
| PRE-08 | P2 | 현재 상품의 장착비가 아니라 주문 item에 저장된 당시 장착비 스냅샷만 응답 | 해결 코드 반영 | 계약 테스트 |
| PRE-09 | P2 | 상품·교체서비스·배송비·포인트·최종 결제 구성을 노출하고 불일치 경고 추가 | 해결 코드 반영 | 계약 테스트 |
| PRE-10 | P3 | 상품 이미지 렌더링과 이미지 없음 placeholder 추가 | 해결 코드 반영 | 계약 테스트 |
| PRE-11 | P3 | 배송 단계 필수값이 모두 있을 때만 `등록됨`으로 판정 | 해결 코드 반영 | 공용 fulfillment guard 재사용 확인 |
| PRE-12 | P3 | 주문일을 분 단위 주문일시로 표시 | 해결 코드 반영 | 계약 테스트 |
| PRE-13 | P3 | 고객 전화번호를 공용 한국 전화번호 formatter로 표시 | 해결 코드 반영 | 계약 테스트 |
| PRE-14 | P3 | 취소 Dialog에 `DialogDescription` 추가 | 해결 코드 반영 | 계약 테스트 |
| PRE-15 | P3 | 방문 수령 주소는 고객 입력 주소이며 배송지로 사용하지 않는다는 안내 추가 | 해결 코드 반영 | 소스 확인 |
| PRE-16 | P2 | 저장된 라켓명과 스트링명이 동일하면 임의 보정 없이 `라켓명 확인 필요` 경고 표시 | 해결 코드 반영 | 계약 테스트 |

## Demo 조회 전용 UI

주문 상세과 연결 교체서비스 상세에서 적용한 정책은 다음과 같다.

| UI | 수정 후 정책 | 분류 |
|---|---|---|
| 편집 모드 | 주문 상세은 숨김, 신청 상세은 disabled와 Demo 사유 Tooltip | A/B |
| 고객 정보 수정 | 편집 진입 불가 | A |
| 결제 금액 수정 | 편집 진입 불가 | A |
| 요청사항 수정 | 편집 진입 불가 | A |
| 주문/신청 상태 변경 | 현재 상태를 `조회 전용` 정적 필드로 표시 | A |
| 배송/방문 수령 정보 변경 | CTA 숨김, 변경 URL 직접 접근 시 조회 상세로 redirect | A |
| 취소 승인·거절·직접/강제 취소 | 버튼·Dialog 미렌더링 | A |
| NICEPAY 재동기화 | CTA 미렌더링 | A |
| 내부 메모 | 기존 메모 조회/검색만 허용, 등록·수정·삭제 UI 미렌더링 | A |
| ID 복사·상세 이동·목록 이동·배송 조회 | 조회 보조 기능이므로 유지 | C(조회 기능) |

클라이언트 표시와 별개로 Demo 관리자 mutation은 서버 공통 경계에서 `403 PORTFOLIO_DEMO_READ_ONLY`로 차단된다.

## 코드 전역 영향 검사

### 결론

모든 문제가 Demo에만 한정되지는 않는다. 한 프로젝트의 공용 API·공용 상세 컴포넌트·상태 helper가 연결되어 있어 문제 성격이 세 종류로 나뉜다.

| 구분 | 범위 | 판단 근거 | 조치 |
|---|---|---|---|
| Demo 전용 정책 문제 | 관리자 주문/신청 상세의 활성 mutation UI | `PORTFOLIO_DEMO_MODE`는 서버 차단과 상단 배너에는 연결됐지만 상세 Client에 전달되지 않았음 | 페이지에서 `readOnly`를 전달하고 mutation UI를 차단 |
| 환경 공통 origin 문제 | Demo, Preview, 별도 도메인, 사용자 신청 상세 | 브라우저/서버 조회가 배포 host와 다른 `NEXT_PUBLIC_API_URL` 또는 `http://host`를 사용할 수 있었음 | Client는 relative same-origin, 서버 페이지는 forwarded proto/host 사용 |
| 공용 데이터 표시 문제 | 동일 주문 API를 읽는 모든 환경 | 상품의 현재 장착비를 과거 주문에 소급해 표시 | 주문 item 스냅샷만 사용 |
| 관리자 공용 상태 문제 | Demo와 운영 관리자 | `상품준비중`이 UI/API 상태 집합에서 누락되고 역방향 단계가 노출 | 상태 집합 추가, UI는 현재 이후 단계만 노출, 결제/배송 guard 유지 |
| 특정 저장 데이터 문제 | 해당 Demo Interaction 주문 | 저장된 라켓명과 스트링명이 동일 | 데이터를 추정·변경하지 않고 원본 확인 경고 표시 |

따라서 Demo의 활성 버튼 문제는 Demo 정책 전달 누락이지만, origin·장착비·상태 단계 문제는 같은 코드 경로를 사용하는 운영/Preview에서도 조건이 맞으면 발생할 수 있는 공용 결함이었다.

### 서버 mutation 경계

- `app/api/admin/**` route 122개를 정적 검색했다.
- mutation을 직접 구현하는 route는 `verifyAdminCsrf`, `getPortfolioDemoAdminMutationBlock` 또는 legacy proxy 경계 중 하나를 사용했다.
- 단순 재-export route 4개는 대상 원본 route에서 `verifyAdminCsrf`를 사용한다.
- `/api/orders/**`, `/api/applications/**`처럼 `/api/admin` 밖에 있으나 관리자 분기를 갖는 주요 mutation route는 기존 core 계약 테스트로 Demo guard를 확인했다.
- 관리자 화면에서 비관리자 API mutation 경로를 호출하지 않는지 `scripts/check-admin-api-boundary.mjs`로 검사했다.

이 결과는 “Demo에서 버튼이 활성이라도 실제 저장이 성공했다”는 뜻이 아니며, 반대로 서버가 막는다는 이유로 활성 버튼 UX가 정상이라는 뜻도 아니다. 수정 전 문제는 서버 무결성보다 UI 정책 불일치였고, 이번 변경으로 주문 상세의 양쪽을 일치시켰다.

### 남은 전역 리스크

- Demo 조회 전용 UI는 아직 전 관리자 앱의 단일 Client Context가 아니라 화면별로 적용된다. 이번 브라우저 점검 대상인 주문 상세과 연결 교체서비스 상세에는 적용했지만, 다른 관리자 모듈의 모든 CTA를 실제 브라우저로 전수 검증한 결과를 의미하지는 않는다.
- 운영환경의 관리자 강제 취소와 일부 역방향 상태 변경은 기존 운영 정책상 서버가 의도적으로 허용한다. 이번 변경은 Demo에서 이를 숨기고, 일반 상태 Select에서 완료/역방향 노출을 줄였으며 서버의 운영용 강제 취소 정책 자체는 변경하지 않았다.

## Console / Network

- 수정 전 취소 Dialog 접근성 경고는 설명 요소 추가로 제거했다.
- 수정 후 배포 브라우저의 console 및 Network 4xx/5xx 여부는 Preview 생성 후 재검증한다.
- 자동 polling이나 정상적인 read-only fetch는 오류로 분류하지 않는다.

## 검증 결과

| 검사 | 결과 |
|---|---|
| `./node_modules/.bin/tsc -p tsconfig.json --noEmit` | PASS |
| Demo read-only core/advisory + 주문 상세 표시 계약 테스트 15건 | PASS (15/15) |
| `node scripts/check-admin-api-boundary.mjs` | PASS |
| `git diff --check` | PASS |

## 정상 확인 항목

- 목록에서 확인한 6개 주문의 item 단가 × 수량과 상품 소계는 수정 전에도 일치했다.
- 주문 상세 자체에서는 React 예외나 hydration 오류를 관찰하지 않았다.
- 조회 전용에서도 ID 복사, 목록/상세 이동, 메모 검색, 배송조회 같은 비 mutation 동작은 유지했다.
- 고객·PG용 일반 route에 관리자 전용 Demo guard를 무조건 적용하지 않아 고객 체험 흐름은 보존했다.

## 수정 우선순위 결과

### 1차 수정 완료

1. 주문 상세 및 연결 신청 상세의 Demo mutation UI 차단
2. 연결 상세/배송 화면 origin 정합성
3. 상태·방문 수령 문맥 정합성
4. 주문 당시 금액 스냅샷과 결제 구성 표시
5. 이미지·전화번호·주문일시·Dialog 접근성 보완

### 후속 개선 권장

1. 다른 관리자 모듈에도 공통 read-only Context를 도입해 화면별 누락 가능성을 구조적으로 제거
2. 과거 주문의 가격 구성 스냅샷이 누락된 경우를 찾는 데이터 품질 리포트 추가
3. PR Preview 또는 배포 후 동일 6개 주문을 1440px에서 재검증하고 Console/Network 결과 확정
