# 샬롬의 집 공식 홈페이지

## 기술 구성

- Next.js
- React
- TypeScript
- Tailwind CSS
- pnpm

## 실행 명령

```bash
pnpm dev
pnpm typecheck
pnpm lint
pnpm build
```

## 현재 주요 공개 경로

- `/`
- `/about`
- `/life`
- `/news`
- `/support`
- `/transparency`

홈 페이지 파일은 `src/app/(public)/page.tsx`입니다.

공개 뉴스 데이터 소스와 관리자 기반이 구현되어 있습니다. Vercel 프로젝트와 Preview 배포 연동은 존재하지만, 정식 운영 도메인과 프로덕션 배포 정책은 아직 확정되지 않았습니다.

## 프로젝트 문서

- [프로젝트 요구사항](./docs/requirements.md)
- [정보구조](./docs/information-architecture.md)
- [콘텐츠 운영 및 공개 원칙](./docs/content-governance.md)
- [디자인 시스템](./docs/design-system.md)
- [메인 랜딩 개편 기준](./docs/home-landing-plan.md)

위 문서는 구현 범위, 정보구조, 콘텐츠 공개 기준을 결정하는 프로젝트 기준 문서입니다. 확정되지 않은 시설 정보와 운영 정책은 임의로 작성하지 않고 `확인 필요`로 관리합니다.
