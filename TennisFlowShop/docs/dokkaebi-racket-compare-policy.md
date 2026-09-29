# Dokkaebi 라켓 비교 정책

## State

비교 목록은 `sessionStorage`에 저장되는 스냅샷입니다.

비교 목록 삭제는 사용자가 명시적으로 실행하는 다음 동작으로만 수행합니다.

- 개별 제거
- 모두 삭제

Finder 이동, 브라우저 뒤로가기, Compare 페이지 이탈, 상세 페이지 열기, Quick View 열기·닫기, 새로고침, Finder 재진입, 정렬·필터·페이지 이동에서는 비교 목록을 유지합니다.

## Return path

Finder 복귀 경로는 `normalizeInternalReturnPath`를 통과한 뒤 Finder 전용 경로인지 한 번 더 확인합니다.

허용 경로는 다음뿐입니다.

- `/rackets/finder`
- `/rackets/finder?...query`
- `/rackets/finder#...hash`

다른 내부 경로, 외부 경로, protocol-relative URL, 역슬래시 경로, 잘못된 encoding은 `/rackets/finder`로 fallback합니다. Query와 hash는 허용 경로에서 보존합니다.

## Baseline

첫 번째 라켓이 기준 라켓입니다. Item 순서는 사용자가 비교 목록에 담은 순서이며 비교 화면에서 임의로 재정렬하지 않습니다.

## Responsive

0~767px에서는 선택 라켓 rail과 스펙별 세로 비교 카드를 표시하고 desktop table은 표시하지 않습니다.

768px 이상에서는 비교표를 표시하며 항목 column은 sticky로 유지합니다. Table 내부 horizontal scroll은 허용하지만 페이지 전체 overflow를 만들지 않습니다.

## Delta

수치 차이는 방향 정보이며 우열 평가가 아닙니다.

양수·음수 모두 중립색을 사용합니다. 높은 값에 성공색을, 낮은 값에 위험색을 자동 적용하지 않습니다. 상대 막대도 현재 비교 중인 라켓 안에서의 상대 위치만 표시합니다.

## Labels

브랜드, 상태, 스트링 패턴, 그립 사이즈는 기존 SSOT helper를 사용합니다. Compare와 Quick View에서 raw enum을 그대로 노출하지 않습니다.

## Quick View

라켓 이미지는 `object-contain`을 사용해 라켓 형태가 잘리지 않게 표시합니다.

CTA 위계는 다음과 같습니다.

- 상세 페이지 열기: `outline`, 새 탭 유지
- 스트링 선택 후 구매: `highlight_soft`
