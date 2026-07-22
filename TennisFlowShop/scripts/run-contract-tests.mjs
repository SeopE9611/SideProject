import { spawnSync } from "node:child_process";
import { getContractTestFiles } from "./contract-test-manifest.mjs";

let files;
try {
  files = getContractTestFiles("core");
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}

if (!process.exitCode) {
  console.log(`[test:contract] ${files.length}개 핵심 파일 실행`);
  const result = spawnSync(process.execPath, ["--test", ...files], { cwd: process.cwd(), stdio: "inherit", shell: false });
  if (result.error) console.error(result.error);
  process.exitCode = result.error ? 1 : (result.status ?? 1);
}
