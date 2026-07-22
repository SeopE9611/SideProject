import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const testsDirectory = resolve(process.cwd(), "tests");
// Core 목록은 보안·권한·결제·주문·재고·상태 전이처럼 병합을 막아야 하는
// 계약만 담는다. 구현 문자열/문구/레이아웃 검사는 advisory runner에 둔다.
const coreContractFiles = [
  "admin-board-detail-actions.contract.test.mjs",
  "admin-board-edit.contract.test.mjs",
  "admin-community-posts-metrics.contract.test.mjs",
  "admin-community-reports-status.contract.test.mjs",
  "admin-mutation-authz.contract.test.mjs",
  "admin-points-history.contract.test.mjs",
  "board-public-url-policy.contract.test.mjs",
  "boards-rich-text-content.contract.test.mjs",
  "community-access-and-moderation.contract.test.mjs",
  "community-list-query.contract.test.mjs",
  "community-posts-patch-conflict.contract.test.mjs",
  "community-rich-text-content.contract.test.mjs",
  "domain-state-transition.contract.test.mjs",
  "guest-order-access-boundary.contract.test.mjs",
  "guest-order-rental-cross-boundary.contract.test.mjs",
  "guest-rental-access-boundary.contract.test.mjs",
  "mypage-rental-detail-state.contract.test.mjs",
  "mypage-stringing-application-priority.contract.test.mjs",
  "mypage-stringing-detail-state.contract.test.mjs",
  "review-summary-cache.test.mjs",
  "rich-text-sanitize-policy.contract.test.mjs",
  "rich-text-validation-behavior.contract.test.mjs",
  "security-contract.test.mjs",
  "stringing-single-payment.contract.test.mjs",
].map((file) => resolve(testsDirectory, file));

if (coreContractFiles.length === 0) {
  console.error("[test:contract] 계약 테스트 파일을 찾지 못했습니다.");
  process.exitCode = 1;
} else {
  console.log(`[test:contract] ${coreContractFiles.length}개 핵심 파일 실행`);

  for (const file of coreContractFiles) {
    console.log(`- ${file}`);
  }

  const result = spawnSync(process.execPath, ["--test", ...coreContractFiles], {
    cwd: process.cwd(),
    stdio: "inherit",
    shell: false,
  });

  if (result.error) {
    console.error(result.error);
    process.exitCode = 1;
  } else {
    process.exitCode = result.status ?? 1;
  }
}
