# Vercel Function / MongoDB Atlas 리전 진단

## 현재 확인 결과

| 항목                             | 확인 결과            | 근거                                                                                                         |
| -------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------ |
| 운영 요청 수신 지점              | 서울 (`icn1`)        | Vercel 운영 로그의 `Received in Seoul, South Korea (icn1)`                                                   |
| 해당 요청의 Function 실행 리전   | 워싱턴 D.C. (`iad1`) | Vercel 운영 로그의 `Routed to Washington, D.C., USA (iad1)`                                                  |
| 저장소의 기본 Function 리전 지정 | 없음                 | `vercel.json`에 `regions` 설정이 없으며, 상품·라켓·users/me 라우트에도 `preferredRegion` 설정이 없음         |
| MongoDB Atlas 클러스터 리전      | 미확인               | 저장소에는 Atlas 클라우드 제공자/리전 메타데이터가 없으며 URI 또는 환경변수 값은 진단 과정에서 출력하지 않음 |

`Received in icn1`은 한국 사용자 요청을 가까운 Vercel PoP가 수신했다는 의미이고,
`Routed to iad1`은 해당 동적 요청을 처리한 Function이 `iad1`에서 실행되었다는 의미로 해석한다.
정적 자산의 수신 지점과 DB에 접근하는 Function 실행 지점은 서로 다를 수 있다.

현재 코드 설정만 보면 DB 접근이 많은 일반 라우트는 프로젝트 기본 Function 리전을 따른다.
Vercel의 기본 Function 리전은 `iad1`이므로, Dashboard에서 별도 기본 리전을 지정하지 않은 배포라면
운영 로그와 저장소 설정이 모두 `iad1` 실행을 가리킨다.

## Atlas 리전 확인 절차

MongoDB URI나 환경변수 값을 로그 또는 문서에 복사하지 않고 다음 정보만 확인한다.

1. MongoDB Atlas Dashboard에서 대상 프로젝트와 클러스터를 연다.
2. 클러스터의 **Cloud Provider & Region**에서 클라우드 제공자와 주 리전 이름을 확인한다.
3. 멀티 리전 클러스터라면 Primary가 위치할 수 있는 가장 높은 우선순위 리전도 확인한다.
4. 결과는 `AWS ap-northeast-2 (Seoul)` 또는 `AWS us-east-1 (N. Virginia)`처럼 설정명/지역명 수준으로만 기록한다.

## 거리로 인한 지연 가능성 판단

Vercel은 Function을 데이터 소스와 같거나 가까운 리전에 둘 것을 권장하고,
MongoDB도 애플리케이션과 Atlas를 같은 클라우드 제공자 및 리전에 배치할 것을 권장한다.
물리적 거리는 애플리케이션과 데이터 사이 지연의 주요 원인이다.

따라서 Atlas가 서울·도쿄 등 아시아 리전에 있고 Function이 `iad1`에서 실행된다면 다음 비용이 모든 DB 왕복에 추가될 수 있다.

- 최초 연결의 DNS/TCP/TLS/인증 및 서버 선택 왕복
- `countDocuments`, `find`, `findOne` 등 개별 DB 명령 왕복
- 한 요청 안에서 순차 실행되는 DB 명령의 누적 왕복

이 경우 `dbConnect`와 `query`가 함께 증가할 가능성이 높다. 다만 7초의 서버 선택 타임아웃이나
1~2초 쿼리 지연을 리전 거리만으로 단정해서는 안 된다. 연결 실패, Atlas 상태, 실행계획,
인덱스 적합성, 콜드 스타트도 함께 확인해야 한다.

반대로 Atlas가 미국 동부에 있다면 `iad1`은 DB와 가까운 실행 리전일 수 있다. 이 경우 한국 사용자가
`icn1`에서 수신된 뒤 `iad1`로 라우팅되는 사용자-Function 거리는 늘지만, DB 왕복 관점에서는 적절할 수 있다.

## 코드 문제와 플랫폼 설정 문제 구분

- **리전 불일치 자체**는 주로 Vercel 프로젝트 Function 리전 또는 Atlas 배포 리전 설정 문제다.
- `vercel.json`의 단일 `regions` 설정으로 Function 리전을 명시할 수 있지만, Atlas 리전을 먼저 확인한 뒤 결정해야 한다.
- 쿼리 실행계획, 인덱스 적합성, 불필요한 중복 조회, 캐싱은 코드·DB 쿼리 차원의 별도 최적화 대상이다.
- 리전을 맞춰도 비효율적인 `countDocuments`나 `find`는 계속 느릴 수 있으므로 기존 세부 계측을 유지한다.

## 요금제 판단

Vercel Hobby에서도 단일 Function 리전을 선택할 수 있으므로, 리전을 한 곳으로 맞추기 위해 Pro 구매가
반드시 필요한 것은 아니다. Pro는 여러 Function 리전 배포 등 추가 선택지가 필요할 때 검토한다.

우선순위는 다음과 같다.

1. Atlas 클러스터의 실제 클라우드 제공자와 주 리전을 확인한다.
2. 단일 리전으로 운영할 경우 Function과 Atlas를 같은 리전 또는 가까운 리전에 배치한다.
3. 변경 전후 `dbConnect`, `products.count/find`, `rackets.count/find`, `/api/users/me` 시간을 비교한다.
4. 리전 정렬 후에도 남는 병목은 실행계획, 인덱스, 캐싱, 중복 호출 관점에서 개선한다.
5. 사용자와 데이터가 여러 지역에 분산되어 단일 리전으로 요구사항을 충족하지 못할 때 Pro 이상의 다중 리전을 검토한다.

## 다음 운영 확인 체크리스트

- [ ] Vercel Dashboard의 **Project Settings → Functions → Function Regions**에서 기본 리전 확인
- [ ] 배포 상세 또는 Runtime Log에서 DB 접근 라우트가 실제로 `iad1`에서 실행되는지 재확인
- [ ] Atlas Dashboard에서 클라우드 제공자, 주 리전, Primary 우선순위 리전 확인
- [ ] Atlas 리전 확인 전에는 `regions` 또는 `preferredRegion`을 임의 변경하지 않기
- [ ] 리전 변경 전후 동일 요청 조건으로 성능 로그 비교
- [ ] MongoDB URI 및 환경변수 값은 출력하지 않기

## 참고 공식 문서

- Vercel: Configuring regions for Vercel Functions — https://vercel.com/docs/functions/configuring-functions/region
- Vercel: Project Configuration — https://vercel.com/docs/configuration
- Vercel: Regions — https://vercel.com/docs/regions
- MongoDB Atlas: Atlas overview — https://www.mongodb.com/docs/atlas/
- MongoDB Atlas: Guidance for Atlas Latency Reduction — https://www.mongodb.com/docs/atlas/architecture/current/latency-strategies/
