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


## V3-1.5 기관 포털 점검

- [ ] 개발 placeholder가 visual focal point가 아닌가
- [ ] 1440px에서 body/navigation이 지나치게 작지 않은가
- [ ] 콘텐츠가 적은 section이 불필요하게 크지 않은가
- [ ] dark green surface가 연속적으로 과도하게 사용되지 않는가
- [ ] wireframe/design-system-demo 인상이 없는가
- [ ] 실제 기관 사이트로 보이는가

## V3-2 Home Macro Reset 점검

- [ ] Before/After에서 section 배치 자체가 달라졌는가
- [ ] Header의 brand/navigation 비율이 실제로 달라졌는가
- [ ] 첫 viewport에 기관 정보 + 주요 업무가 함께 보이는가
- [ ] 별도 Quick Service band가 사라졌는가
- [ ] Home에 shadow content card가 없는가
- [ ] 동일 rounded card 3개 이상의 반복이 없는가
- [ ] 7개의 full-width section band가 다시 만들어지지 않았는가
- [ ] 색상 변경만으로 구분한 section 반복이 없는가
