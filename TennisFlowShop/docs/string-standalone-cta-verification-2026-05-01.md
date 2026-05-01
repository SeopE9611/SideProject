# 스트링 단품 구매 CTA 노출 정책 검증 (2026-05-01)

## 결론
- 단품 구매 CTA는 feature flag(`ENABLE_STRING_STANDALONE_ORDER`)가 `true`일 때만 렌더링됩니다.
- 기본값은 `false`이며, `NEXT_PUBLIC_ENABLE_STRING_STANDALONE_ORDER`가 명시적으로 `true`가 아닌 이상 사용자 화면에 단품 구매 CTA가 노출되지 않습니다.

## 확인 근거
1. `lib/orders/string-standalone-policy.ts`
   - `NEXT_PUBLIC_ENABLE_STRING_STANDALONE_ORDER` -> `ENABLE_STRING_STANDALONE_ORDER` -> `"false"` 순으로 평가합니다.
   - 불리언 파싱은 `"1" | "true" | "yes" | "on"`만 활성값으로 인정합니다.
2. `app/products/[id]/ProductDetailClient.tsx`
   - 데스크톱 CTA의 `"바로 구매하기"` 버튼은 `{ENABLE_STRING_STANDALONE_ORDER && (...)}` 조건에서만 렌더링됩니다.
   - 모바일 sticky CTA의 `"스트링만 구매하기"` 버튼도 동일하게 `{ENABLE_STRING_STANDALONE_ORDER && (...)}` 조건에서만 렌더링됩니다.
   - 서비스 CTA(`serviceCtaLabel`)는 별도 조건(`canCheckoutWithService`)으로 유지됩니다.

## 참고
- 저장소 내 `.env.example` 파일은 존재하지 않았고, 관련 문서에도 해당 플래그 기본값을 덮어쓰는 설정은 확인되지 않았습니다.
