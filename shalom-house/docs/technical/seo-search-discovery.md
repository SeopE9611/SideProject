# SEO·검색 노출 운영 기준

공식 canonical origin은 `SHALOM_SITE_URL`로 관리하며 기본값은 `https://shalom-house.vercel.app`이다. `VERCEL_ENV`가 정의된 경우 `production`에서만 색인을 허용한다. Preview와 development는 전체 색인을 차단하고, fixture 콘텐츠는 production에서도 `noindex, nofollow`로 처리한다. production 색인은 `SHALOM_CONTENT_SOURCE`가 명시적으로 `empty` 또는 `mongodb`일 때만 허용한다. `SHALOM_CONTENT_SOURCE` 미설정 상태는 repository별 기본값 차이로 인한 fixture 노출을 막기 위해 `noindex, nofollow`로 처리한다. Vercel이 아닌 production도 명시적인 콘텐츠 소스가 있으면 정적 공개 페이지의 색인을 허용하며 관리자 화면은 계속 색인하지 않는다. 알 수 없는 `VERCEL_ENV` 또는 `SHALOM_CONTENT_SOURCE` 값은 색인을 차단한다.

정적 route는 단일 route 목록에서 title, description, query 없는 canonical을 생성한다. 소식·프로그램·활동사진 상세는 각각 `NewsArticle`, `Article`, `ImageObject`와 `BreadcrumbList`를 제공한다. 소식·프로그램 Article 이미지 URL은 공식 canonical origin을 사용하는 절대 URL이다. 전역 `Organization`, `WebSite`에는 확인된 기관 정보만 포함하며, 확인되지 않은 저작권자·촬영자 정보는 JSON-LD에 포함하지 않는다. 사진 없는 `/api/social-image`가 기본 Open Graph·Twitter 이미지다.

동적 sitemap은 repository의 sitemap 전용 조회로 공개 가능한 소식·프로그램과 공개 승인·동의·기간 검증을 통과한 활동사진만 포함한다. 공개 종료나 동의 철회는 sitemap에서도 제외되며 검색·필터·pagination query는 canonical이나 sitemap에 포함하지 않는다.

Google과 Naver 확인값은 각각 `SHALOM_GOOGLE_SITE_VERIFICATION`, `SHALOM_NAVER_SITE_VERIFICATION`으로 production에만 설정한다. 운영자는 Google Search Console 및 Naver Search Advisor 등록, 실제 확인값 설정, `robots.txt` 확인, `sitemap.xml` 제출과 색인 상태 확인을 별도로 수행해야 한다. 이 구현은 검색 순위 상승이나 색인 완료를 보장하지 않는다.
