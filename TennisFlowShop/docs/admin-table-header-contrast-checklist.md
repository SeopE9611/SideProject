# Admin 리스트 페이지 테이블 헤더 대비 점검 체크리스트

## 변경 기준
- `TableHead` 기본 텍스트 컬러는 `text-foreground`를 사용한다.
- 보조 정보 성격의 컬럼만 각 화면에서 개별적으로 `text-muted-foreground`를 opt-in 한다.
- 각 화면의 `thClasses` 계열 상수도 기본은 `text-foreground`로 맞춘다.

## 점검 대상(주요 리스트)

### 1) 운영함 `/admin/operations`
- [x] 기본 헤더 색상은 `text-foreground` 기준으로 적용됨.
- [x] 보조 컬럼(`ID`, `날짜`, `연결`)만 `text-muted-foreground`를 개별 opt-in 적용.
- [x] 라이트/다크 모두에서 헤더 배경(`bg-muted`) 대비로 가독성 저하 클래스 없음.

### 2) 패키지 관리 `/admin/packages`
- [x] 공통 `thClasses`의 기본 헤더 색상은 `text-foreground`로 정리됨.
- [x] 보조 컬럼 muted 처리 없음(필요 시 컬럼 단위로만 opt-in 가능).
- [x] sticky 헤더(`bg-card`)와 텍스트 대비가 라이트/다크 기준에서 유지됨.

### 3) 회원 관리 `/admin/users`
- [x] 공통 헤더 유틸(`th`) 기본 색상은 `text-foreground`로 정리됨.
- [x] 보조 컬럼 muted 처리 없음(필요 시 화면 단위 opt-in 가능).
- [x] sticky 헤더 배경과 텍스트 대비가 라이트/다크 기준에서 유지됨.

## 점검 메모
- 이번 정리는 "기본은 선명(foreground), 보조만 muted opt-in" 정책으로 통일하는 1차 정리다.
- 추가 화면에서 보조 컬럼이 필요하면 `TableHead`/`thClasses` 사용처에 `text-muted-foreground`를 컬럼 단위로만 부여한다.
