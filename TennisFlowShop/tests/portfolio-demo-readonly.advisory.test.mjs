import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));

function read(relPath) {
  return readFileSync(join(REPO_ROOT, relPath), "utf8");
}

test("관리자 공통 레이아웃은 서버 환경값으로 Demo 조회 전용 안내를 조건부 렌더링한다", () => {
  const layout = read("app/admin/layout.tsx");

  assert.ok(layout.includes("isPortfolioDemoReadOnly()"));
  assert.ok(layout.includes("{isDemoReadOnly ? ("));
  assert.ok(layout.includes("포트폴리오 데모 · 조회 전용"));
  assert.ok(
    layout.includes(
      "실제 운영 환경과 분리된 시연용 데이터입니다. 등록·수정·삭제 등 변경 작업은",
    ),
  );
});

test("Portfolio Demo의 Storage와 Seed source marker를 유지한다", () => {
  const storage = read("lib/storage-config.server.ts");
  const seed = read("scripts/db/seed-portfolio-demo.mjs");

  assert.ok(storage.includes("IS_PORTFOLIO_DEMO"));
  assert.ok(seed.length > 0);
});
