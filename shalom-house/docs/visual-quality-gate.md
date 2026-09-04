# 공개 UI Visual Quality Gate

typecheck 통과를 UI 완료로 오해하지 않기 위한 장기 검증표다. 각 항목은 실제 확인 후 `PASS`, `FAIL`, `NOT VERIFIED` 중 하나로 기록한다.

## First Impression

- 5초 안에 기관명과 시설 유형을 인지하는가
- 공식 기관 홈페이지로 보이는가
- 템플릿 랜딩페이지처럼 보이지 않는가

## Hierarchy

- H1은 1개인가
- 대표 행동 우선순위가 명확한가
- 뉴스·생활·자료·참여의 위계가 다른가

## Composition

- 같은 카드 grid 반복이 없는가
- 동일한 section header pattern이 반복되지 않는가
- section rhythm 차이가 있는가

## Content Density

- 첫 화면 이후 실제 정보가 바로 등장하는가
- 빈 여백으로 콘텐츠 부족을 숨기지 않는가

## Media

- 승인 이미지가 없을 때 fixture임이 데이터에서 명확한가
- placeholder가 실제 거주인·시설 사진으로 오해되지 않는가
- 실제 이미지로 교체해도 media slot layout이 유지되는가

## Responsive

- 320 / 390 / 768 / 1024 / 1440에서 overflow와 정보 우선순위를 확인했는가

## Korean Typography

- 단어 중간의 부자연스러운 줄바꿈을 방지했는가
- 긴 URL·파일명이 overflow하지 않는가

## Header / Navigation

- desktop, hover, keyboard, focus, mobile, active state를 확인했는가
- dropdown이 잘리지 않고 mobile menu가 viewport를 넘지 않는가

## Footer

- 기관 정보, 연락, 주요 navigation이 있는가
- 개인정보·공식 정보 영역이 시각적으로 구분되는가

## Validation result

검증 결과는 추정하지 않는다. 실제 화면에서 확인한 항목만 `PASS`, 결함은 `FAIL`, 도구나 조건 때문에 확인하지 못한 항목은 `NOT VERIFIED`로 기록한다.

## 대표 화면 점검

- 홈은 남색 기관 영역과 승인 사진 또는 정보 중심 대체 구성이 명확한가
- 소식 목록은 검색·분류·결과 수·게시물 행의 위계가 구분되는가
- 찾아오시는 길은 주소·지도·전화·방문 문의를 첫 화면에서 찾을 수 있는가
- 함께하기는 후원·자원봉사 안내와 문의 접수를 혼동하지 않는가
- 자료공개는 기간·문서일·게시일·형식·크기·열기 행동을 파일을 열기 전에 확인할 수 있는가
- 상세 화면은 목록 복귀, 분류, 제목, 메타데이터, 본문과 첨부파일 순서를 유지하는가

## 완료 판정

대표 화면은 변경 전후를 같은 viewport에서 비교한다. 기능, 접근성, 시각 품질을 각각 판정하며 정적 검사만으로 시각 품질을 `PASS` 처리하지 않는다. 운영 데이터가 없는 상태, 조회 실패, 긴 제목·파일명과 공식 이미지가 없는 상태는 확인 여부를 별도로 기록한다.
