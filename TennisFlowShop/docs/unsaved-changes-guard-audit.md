# Unsaved Changes Guard 조사/정책 (2026-03-04)

## 전수 조사 요약

- `useUnsavedChangesGuard(...)` 사용 파일: **54개**
- `window.confirm(UNSAVED_CHANGES_MESSAGE)` 중복 사용 파일: **29개**
- `beforeunload | popstate | pushState | history.back` 직접 사용 파일: **14개**

## 위험 포인트

1. 공통 훅(`lib/hooks/useUnsavedChangesGuard.tsx`)이 `beforeunload + popstate + document click capture + dummy pushState + cleanup history.back`를 동시에 담당.
2. 다수 페이지에서 공통 훅과 로컬 `window.confirm(...)`을 함께 써 중복 경고 가능.
3. 모달/다이얼로그에서도 전역 가드를 켜서, 화면 외부 이탈과 모달 닫기 UX 경계가 섞임.

## 화면별 정책 표 (대표)

| 파일 | 화면 성격 | 기존 guard 방식 | 문제점 | 방침 |
|---|---|---|---|---|
| `lib/hooks/useUnsavedChangesGuard.tsx` | 공통 훅 | beforeunload + popstate + click capture + history 조작 | 히스토리 체인 오염, 입력 중 오탐, 모바일 민감도 증가 | **수정**: beforeunload 전용 최소 책임 |
| `app/services/_components/BackButtonGuard.tsx` | 성공 페이지 보조 가드 | `pushState + popstate` | 불필요한 더미 히스토리 추가 | **수정**: `pushState` 제거, popstate만 유지 |
| `app/services/apply/page.tsx` | 대형 폼(프리필+스냅샷) | 공통 훅 + baseline dirty | 공통 훅 과책임에 의존 | **유지(후속 확장)**: baseline 유지, 내부 이동은 점진 로컬 confirm 전환 |
| `app/checkout/page.tsx` | 대형 폼(체크아웃) | 공통 훅 + 로컬 confirm | 공통 훅 과책임 시 중복/과민 가능 | **유지**: 훅 최소화 후 로컬 confirm 중심 |
| `app/rentals/[id]/checkout/_components/RentalsCheckoutClient.tsx` | 체크아웃 | 공통 훅 + 로컬 confirm | 공통 훅 과책임 | **유지** |
| `app/rackets/[id]/_components/RacketPurchaseCheckoutClient.tsx` | 체크아웃 | 공통 훅 단독 | 내부 이동 confirm이 페이지에 따라 부족 가능 | **유지(후속 확장)** |
| `app/board/free/_components/FreeBoardWriteClient.tsx` | 게시글 작성 | 공통 훅 + 로컬 confirm | 중복 confirm 잠재 | **유지** |
| `app/board/free/[id]/edit/_components/FreeBoardEditClient.tsx` | 게시글 수정 | 공통 훅 + 로컬 confirm | 중복 confirm 잠재 | **유지** |
| `app/reviews/write/page.tsx` | 작성 폼 | 공통 훅 + 로컬 confirm | 중복 confirm 잠재 | **유지** |
| `app/login/_components/LoginPageClient.tsx` | 로그인/비밀번호 입력 | 공통 훅 + 로컬 confirm | 중복 confirm 잠재 | **유지** |
| `app/messages/_components/MessageComposeDialog.tsx` | 모달/다이얼로그 | 공통 훅 + 모달 닫기 confirm | 모달에서 전역 guard 불필요/과민 | **수정**: 전역 훅 제거, 모달 close confirm만 유지 |
| `app/messages/_components/AdminBroadcastDialog.tsx` | 모달/다이얼로그 | 공통 훅 + 모달 닫기 confirm | 모달에서 전역 guard 불필요/과민 | **수정**: 전역 훅 제거, 모달 close confirm만 유지 |

## 조사 명령어

```bash
rg -l "useUnsavedChangesGuard\(" app lib
rg -l "window\.confirm\(UNSAVED_CHANGES_MESSAGE\)" app lib
rg -l "beforeunload|popstate|pushState\(|history\.back\(" app lib
```
