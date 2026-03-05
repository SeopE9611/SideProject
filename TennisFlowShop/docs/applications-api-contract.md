# Applications API 계약 단일화

작성일: 2026-03-05

## 1) 정식 데이터 소스(컬렉션) 결정

- 정식 컬렉션은 **`stringing_applications`** 입니다.
- 레거시 명칭인 `applications` 컬렉션은 운영 API의 기준 소스로 사용하지 않습니다.

근거:
- 사용자 목록 API(`/api/applications/me`)는 `stringing_applications`를 조회합니다.
- 상세/상태/취소/확정 및 주문/대여 연계 로직이 모두 `stringing_applications`를 기준으로 동작합니다.
- `/api/applications` 레거시 목록 경로는 410 Gone으로 종료(sunset)했습니다.

## 2) 운영 API 응답 계약(단일화)

- 사용자 신청 목록: `GET /api/applications/me`
  - 목적: 마이페이지 사용자 본인 신청 목록 조회
  - 응답: 페이지네이션 메타 + 사용자 노출용 최소 필드(가공된 DTO)
- 스트링 신청 목록(기존 호환): `GET /api/applications/stringing/list`
  - 목적: 기존 화면 호환용 목록 조회
  - 데이터 소스: `stringing_applications`

## 3) 레거시 경로 정리 원칙

- `GET /api/applications`
  - 상태: **410 Gone**
  - 사유: 운영 경로에서 미사용이며, 컬렉션 기준 혼선(`applications` vs `stringing_applications`)을 유발
  - 대체: `/api/applications/me`, `/api/applications/stringing/list`

## 4) 호출처 전수 검색 결과

다음 키워드로 검색 시 `/api/applications` 루트 경로의 실제 호출처는 확인되지 않았고,
모두 `/api/applications/stringing/*` 또는 `/api/applications/me` 경로를 사용 중입니다.

- `app/api/applications/route.ts`
- `collection('applications')`
- `/api/applications`
- `stringing_applications`
