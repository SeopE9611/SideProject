import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { resolve } from "node:path";

const testsDirectory = resolve(process.cwd(), "tests");

const contractFiles = readdirSync(testsDirectory, { withFileTypes: true })
  .filter(
    (entry) =>
      entry.isFile() &&
      (entry.name.endsWith(".contract.test.mjs") || entry.name.endsWith("-contract.test.mjs")),
  )
  .map((entry) => resolve(testsDirectory, entry.name))
  .sort();

if (contractFiles.length === 0) {
  console.error("[test:contract] 계약 테스트 파일을 찾지 못했습니다.");
  process.exitCode = 1;
} else {
  console.log(`[test:contract] ${contractFiles.length}개 파일 실행`);

  for (const file of contractFiles) {
    console.log(`- ${file}`);
  }

  const result = spawnSync(process.execPath, ["--test", ...contractFiles], {
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
