# 상태 색상 사용 분리 가이드

## 1) 사용 위치 분류

| 분류 | 허용 토큰 | 사용 예시 |
|---|---|---|
| 배지(Badge) | `success`, `warning`, `destructive` | 신고 상태(대기/완료/반려), 휴무 표시 |
| 토스트(Toast) | `success`, `warning`, `destructive` | 저장 성공/유효성 경고/실패 안내 |
| 에러 영역(Error Surface) | `destructive` | 목록 로드 실패, 검증 실패 메시지 |
| 위험 버튼(Danger Action) | `destructive` | 삭제, 숨김 처리, 취소/파기 액션 |
| 일반 장식(Decorative) | `text-foreground`, `text-primary`, `bg-muted` 중심 | 아이콘, 카드 강조 배경, 구분용 점/칩 |

## 2) 색상 의미 사전

- `success`: 정상 완료, 반영 성공, 사용자 안심 상태
- `warning`: 확인 필요, 대기/주의, 조치 예정 상태
- `destructive`: 실패/오류, 데이터 파기/숨김/삭제 등 되돌리기 어려운 상태

## 3) 우선 리팩터링 적용 파일

- `components/system/LoginGate.tsx`
  - 장식용 `text-indigo-*`, `text-sky-*`, `bg-purple-*` 제거 후 `text-primary`, `text-foreground`, `bg-muted`로 환원.
- `app/admin/boards/BoardsClient.tsx`
  - 신고 상태 배지를 `warning|success|destructive`로 통일.
  - 에러 박스/위험 버튼에 `destructive` 토큰 유지.
  - 장식성 `indigo` 배지는 `bg-muted`/`text-foreground`로 환원.
- `app/admin/scheduling/page.tsx`
  - 장식성 `emerald/purple/orange` 그라디언트/포인트 색 제거.
  - 입력 포커스 링을 브랜드 색 강제 대신 공통 `ring` 토큰으로 정리.
  - 상태 의미가 있는 `휴무` 배지는 `destructive` 토큰 유지.
