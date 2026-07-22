import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

function readConfig(relativePath) {
  const configPath = path.join(projectRoot, relativePath);
  assert.ok(existsSync(configPath), `${relativePath} 파일이 있어야 합니다.`);

  const result = ts.readConfigFile(configPath, ts.sys.readFile);
  assert.equal(result.error, undefined, `${relativePath}을(를) 읽지 못했습니다.`);
  return result.config;
}

function read(relativePath) {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

test("루트 TypeScript 프로젝트는 Cypress를 제외한 앱 정책을 유지한다", () => {
  const config = readConfig("tsconfig.json");

  for (const entry of ["node_modules", "cypress", "cypress.config.ts"]) {
    assert.ok(config.exclude.includes(entry), `exclude에 ${entry}이(가) 있어야 합니다.`);
  }
  assert.ok(config.include.includes(".next/types/**/*.ts"));
  assert.equal(config.compilerOptions.strict, true);
  assert.equal(config.compilerOptions.noEmit, true);
});

test("Cypress TypeScript 프로젝트는 앱 설정을 상속하면서 자체 입력을 검사한다", () => {
  const config = readConfig("cypress/tsconfig.json");
  const options = config.compilerOptions;

  assert.equal(config.extends, "../tsconfig.json");
  assert.equal(options.noEmit, true);
  assert.equal(options.incremental, false);
  assert.deepEqual(options.types, ["cypress", "node"]);
  assert.deepEqual(options.plugins, []);
  assert.ok(config.include.includes("./**/*.ts"));
  assert.ok(config.include.includes("../cypress.config.ts"));
  assert.ok(config.exclude.some((entry) => entry.includes("node_modules")));
});

test("타입 검사 스크립트는 앱과 Cypress를 순서대로 검사하고 build를 분리한다", () => {
  const scripts = JSON.parse(read("package.json")).scripts;

  assert.match(scripts["typecheck:app"], /(?:^|\s)-p\s+tsconfig\.json(?:\s|$)/);
  assert.match(scripts["typecheck:cypress"], /(?:^|\s)-p\s+cypress\/tsconfig\.json(?:\s|$)/);
  assert.match(scripts.typecheck, /pnpm run typecheck:app/);
  assert.match(scripts.typecheck, /pnpm run typecheck:cypress/);
  assert.ok(scripts.typecheck.indexOf("typecheck:app") < scripts.typecheck.indexOf("typecheck:cypress"));
  assert.equal(scripts.build, "next build");
  assert.doesNotMatch(scripts.build, /cypress/i);
});

test("게시판 이탈 guard Cypress 명세의 여섯 시나리오와 alias 패턴을 보존한다", () => {
  const source = read("cypress/e2e/board.unsaved-changes-navigation.cy.ts");

  for (const name of ["내부 Link 취소", "내부 Link 승인", "모바일 메뉴 취소", "저장 성공", "저장 실패 후 guard", "첫 뒤로가기"]) {
    assert.ok(source.includes(name), `${name} 시나리오가 있어야 합니다.`);
  }
  assert.match(source, /cy\.wrap\(confirmStub,\s*\{\s*log:\s*false\s*\}\)\.as\(["']confirm["']\)/s);
  assert.doesNotMatch(source, /cy\s*\.\s*stub\([^;]*\)\s*\.\s*(?:returns\([^;]*\)\s*\.\s*)?as\(["']confirm["']\)/);
  assert.match(source, /button\[aria-label=["']메뉴 열기["']\]/);
  assert.match(source, /button\[aria-label=["']사용자 메뉴 더보기["']\]/);
  assert.doesNotMatch(source, /\b(?:it|describe)\.skip\b|\b(?:it|describe)\.only\b/);
  assert.doesNotMatch(source, /\bas any\b|@ts-ignore|@ts-expect-error/);
});
