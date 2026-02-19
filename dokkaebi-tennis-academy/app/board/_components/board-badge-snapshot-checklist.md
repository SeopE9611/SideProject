# Board 배지 대비 스냅샷 점검 체크리스트

## 목적
- 카테고리 배지가 토큰 프리셋(`neutral`/`highlight`/`status`)만 사용해도 라이트/다크 테마에서 충분한 대비를 유지하는지 확인한다.
- 카테고리 의미 전달이 색상 의존 없이 아이콘/라벨 접두어(semantic tag)로 유지되는지 점검한다.

## 점검 대상 화면
- `BoardListClient` 목록 화면 (`/board/free`, `/board/market`, `/board/gear`)
- `BoardDetailClient` 상세 화면 (`/board/free/[id]`, `/board/market/[id]`, `/board/gear/[id]`)
- 글쓰기 화면 (`/board/free/write`, `/board/market/write`, `/board/gear/write`)
- 글수정 화면 (`/board/free/[id]/edit`, `/board/market/[id]/edit`, `/board/gear/[id]/edit`)

## 스냅샷 체크 항목
- [ ] 라이트 테마 목록에서 카테고리 배지 텍스트가 배경과 충분히 구분된다.
- [ ] 다크 테마 목록에서 카테고리 배지 텍스트가 배경과 충분히 구분된다.
- [ ] 라이트 테마 상세에서 카테고리 배지가 제목과 시각적으로 충돌하지 않는다.
- [ ] 다크 테마 상세에서 카테고리 배지 대비가 유지된다.
- [ ] 글쓰기/수정 화면의 카테고리 선택 UI(텍스트/선택값)가 라이트·다크에서 식별 가능하다.
- [ ] 같은 프리셋을 쓰는 카테고리라도 아이콘/라벨 접두어로 의미가 구분된다.

## 캡처 가이드
- 각 보드 타입(free/market/gear)별로 최소 1건씩 목록+상세를 캡처한다.
- 글쓰기/수정 화면은 보드 타입별로 1건 이상, 라이트/다크를 각각 캡처한다.
- 이슈 발생 시 캡처 파일명에 `contrast-issue`를 포함하고, 어떤 프리셋(`neutral`/`highlight`/`status`)에서 발생했는지 기록한다.
