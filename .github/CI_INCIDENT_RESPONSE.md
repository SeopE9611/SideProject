# CI 장애 대응 가이드 (Billing Lock / 정책 오진 방지)

## 1) 증상
GitHub Actions 실행 화면의 Annotation에 아래 문구가 보이면, **워크플로우 로직 실패가 아니라 결제 잠금 장애**입니다.

- `The job was not started because your account is locked due to a billing issue.`

이 상태에서는 `detect-admin-path-changes`, `go-no-go-checklist`, `admin-path-required-gate` 같은 job이
"실패"로 보이더라도 실제로는 **Runner가 시작되지 못한 상태**입니다.

## 2) 원인 분류

### A. 저장소/정책 로직 이슈 (코드 수정으로 해결 가능)
- job이 시작되었고, step 로그에서 스크립트/테스트 실패가 보임
- 예: lint/typecheck/test exit code != 0

### B. 플랫폼 결제 잠금 이슈 (코드 수정으로 해결 불가)
- job 자체가 시작되지 않음
- 위 billing lock 문구가 Annotation에 표시됨

## 3) 즉시 조치 순서
1. 조직/계정의 **Billing 상태 복구**
2. 문제가 난 Workflow run에서 **Re-run all jobs** 실행
3. branch protection required check가 pending/fail로 남아 있으면, 최신 run 기준으로 재검증

## 4) 브랜치 보호(Required checks) 운영 권고
- 필수 체크는 가급적 최종 게이트(job) 중심으로 단순화합니다.
  - 예: `admin-path-required-gate`, `go-no-go-checklist`
- Billing lock 기간에는 관리자 승인 하에 임시로 Required checks를 완화하고,
  복구 즉시 원복합니다.

## 5) 재발 방지
- 결제 한도/결제수단 만료 알림을 조직 알림 채널(Slack/메일)로 연동
- 월간 Actions 사용량 점검 및 예산 알림 설정
- 장애 발생 시 본 문서를 Incident runbook으로 사용
