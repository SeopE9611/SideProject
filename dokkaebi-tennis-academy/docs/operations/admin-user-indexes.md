# Admin Users API 인덱스 운영 가이드

`app/api/admin/users/[id]/*` 라우트는 런타임에 인덱스를 생성하지 않습니다. 배포 전/마이그레이션 단계에서 아래 인덱스를 선반영하세요.

## 선반영 대상 인덱스

| 컬렉션 | 키 | 옵션 | 사용 라우트 |
| --- | --- | --- | --- |
| `orders` | `{ userId: 1, createdAt: -1 }` | `{ name: "orders_userId_createdAt" }` | `/admin/users/[id]/orders`, `/admin/users/[id]/kpi` |
| `stringing_applications` | `{ userId: 1, createdAt: -1 }` | `{ name: "apps_userId_createdAt" }` | `/admin/users/[id]/applications/stringing`, `/admin/users/[id]/kpi` |
| `reviews` | `{ userId: 1, createdAt: -1 }` | `{ name: "reviews_userId_createdAt" }` | `/admin/users/[id]/reviews`, `/admin/users/[id]/kpi` |
| `user_audit_logs` | `{ userId: 1, at: -1 }` | `{ name: "audit_userId_at" }` | `/admin/users/[id]/audit` |
| `user_sessions` | `{ userId: 1, at: -1 }` | `{ name: "sessions_userId_at" }` | `/admin/users/[id]/sessions` |

## 적용 방법

아래 명령을 배포 파이프라인(예: migration step)에서 실행합니다.

```bash
pnpm db:ensure-admin-user-indexes
```

> `MONGODB_URI` 및 필요시 `MONGODB_DB` 환경 변수가 설정되어 있어야 합니다.
