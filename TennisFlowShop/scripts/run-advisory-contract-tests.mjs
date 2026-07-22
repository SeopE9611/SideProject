import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const testsDirectory = resolve(process.cwd(), "tests");

// 이 목록은 기존 테스트에서 옮긴 정확한 소스 문자열·UI 구현 형태 검사다.
// 파일을 명시해 누락이나 core와의 중복 실행을 방지한다.
const advisoryContractFiles = [
  "admin-boards-brand-compat.contract.test.mjs",
  "board-unsaved-changes-navigation.contract.test.mjs",
  "checkout-success-links.contract.test.mjs",
  "community-rich-text-ui.contract.test.mjs",
  "display-policy-contract.test.mjs",
  "mypage-confirmation-items-contract.test.mjs",
  "mypage-transaction-flow-state.contract.test.mjs",
  "notice-rich-text-ui.contract.test.mjs",
  "review-api-policy.test.mjs",
  "review-domain-contract.test.mjs",
  "review-management-context.test.mjs",
].map((file) => resolve(testsDirectory, file));

console.log(`[test:contract:advisory] ${advisoryContractFiles.length}개 advisory 파일 실행`);
const result = spawnSync(process.execPath, ["--test", ...advisoryContractFiles], {
  cwd: process.cwd(),
  stdio: "inherit",
  shell: false,
});

if (result.error) console.error(result.error);
process.exitCode = result.error ? 1 : (result.status ?? 1);
