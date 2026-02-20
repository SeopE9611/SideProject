# 브랜드 예외 허용 고정 화이트리스트

다음 파일만 제휴사 브랜드 식별성 유지를 위해 hex/raw palette 사용을 허용합니다.
아래 목록은 **고정 화이트리스트**이며, 신규 파일 추가 시 본 문서와 `scripts/scan-brand-color-exceptions.mjs`를 함께 수정해야 합니다.

## 허용 파일
- `app/login/_components/SocialAuthButtons.tsx`
- `app/login/_components/LoginPageClient.tsx`
- `app/admin/users/_components/UsersClient.tsx`

## 운영 규칙
1. 화이트리스트 외 파일에서 `#hex` 또는 raw palette 클래스(`bg-blue-500`, `text-rose-600` 등)가 발견되면 자동 경고합니다.
2. 일반 UI에서는 토큰(`bg-primary`, `text-foreground`, `border-border` 등)만 사용합니다.
3. 브랜드 색상이 꼭 필요한 경우, 해당 분기 직전에 예외 사유 주석을 남기고 화이트리스트에 합의 후 반영합니다.

## 스캔 명령
```bash
npm run scan:brand-color-exceptions
```

> 현재 스캔은 경고 전용이며 빌드를 차단하지 않습니다.
