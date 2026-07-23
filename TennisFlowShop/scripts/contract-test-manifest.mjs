import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const testsDirectory = resolve(process.cwd(), "tests");

export const coreContractFiles = [
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
  "rich-text-sanitize-policy.contract.test.mjs",
  "rich-text-validation-behavior.contract.test.mjs",
  "security-contract.test.mjs",
  "stringing-single-payment.contract.test.mjs",
  "review-target-resolver.test.mjs",
  "review-write-flow.test.mjs",
  "public-review-surface.test.mjs",
  "review-security-integrity.core.test.mjs",
  "review-summary-cache.test.mjs",
  "review-api-policy.core.test.mjs",
  "review-management-context.core.test.mjs",
];

export const advisoryContractFiles = [
  "admin-boards-brand-compat.contract.test.mjs",
  "admin-boards-metrics.snapshot.test.mjs",
  "board-unsaved-changes-navigation.contract.test.mjs",
  "checkout-success-links.contract.test.mjs",
  "community-rich-text-ui.contract.test.mjs",
  "display-policy-contract.test.mjs",
  "mypage-confirmation-items-contract.test.mjs",
  "mypage-pass-state.contract.test.mjs",
  "mypage-transaction-flow-state.contract.test.mjs",
  "notice-rich-text-ui.contract.test.mjs",
  "package-order-success-access.contract.test.mjs",
  "package-order-success-state.contract.test.mjs",
  "review-api-policy.test.mjs",
  "review-security-integrity.test.mjs",
  "review-domain-contract.test.mjs",
  "review-management-context.test.mjs",
  "review-summary-cache.advisory.test.mjs",
  "typescript-project-boundary.contract.test.mjs",
];

function registeredFiles(files) {
  return files.map((file) => resolve(testsDirectory, file));
}

export function validateContractTestManifest() {
  const all = [...coreContractFiles, ...advisoryContractFiles];
  const duplicates = all.filter((file, index) => all.indexOf(file) !== index);
  const missingFiles = all.filter((file) => !existsSync(resolve(testsDirectory, file)));
  const testFiles = readdirSync(testsDirectory).filter((file) => file.endsWith(".test.mjs"));
  const required = testFiles.filter(
    (file) =>
      file.endsWith(".contract.test.mjs") ||
      file.endsWith("-contract.test.mjs") ||
      file.endsWith(".core.test.mjs") ||
      file.endsWith(".advisory.test.mjs"),
  );
  const unregistered = required.filter((file) => !all.includes(file));
  if (duplicates.length || missingFiles.length || unregistered.length) {
    throw new Error(
      `[contract manifest] 등록 중복: ${[...new Set(duplicates)].join(", ") || "없음"}; ` +
        `존재하지 않는 파일: ${missingFiles.join(", ") || "없음"}; ` +
        `manifest 누락 파일: ${unregistered.join(", ") || "없음"}`,
    );
  }
}

export function getContractTestFiles(kind) {
  validateContractTestManifest();
  if (kind === "core") return registeredFiles(coreContractFiles);
  if (kind === "advisory") return registeredFiles(advisoryContractFiles);
  throw new Error(`[contract manifest] 알 수 없는 테스트 종류: ${String(kind)}`);
}
