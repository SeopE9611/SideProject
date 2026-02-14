# app/api/admin 가드 적용 점검

점검 대상: `app/api/admin/**/route.ts`

## 점검 결과

- 전체 라우트 파일 수: 43
- `@/lib/admin.guard` + `requireAdmin` 미사용 파일 수: 0

미사용 파일 목록:

- 없음

## 단계적 교체 계획

1. **신규 라우트 생성 단계**
   - `app/api/admin` 하위 신규 파일은 템플릿 수준에서 `requireAdmin` 호출을 기본 포함.
2. **리뷰 단계(정적 점검)**
   - PR 체크에서 `app/api/admin/**/route.ts` 파일에 `requireAdmin` 누락 여부를 스캔.
3. **확장 단계(비-admin 경로 정리)**
   - 관리자 기능이지만 `app/api/admin` 바깥에 존재하는 엔드포인트(예: `app/api/reviews/admin`)를 순차적으로 `requireAdmin` 기반으로 이관.
