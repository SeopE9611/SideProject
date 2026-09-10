import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const ts = require("typescript");
require.extensions[".ts"] = (module, filename) => {
  const source = require("node:fs").readFileSync(filename, "utf8");
  module._compile(
    ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
      fileName: filename,
    }).outputText,
    filename,
  );
};

const { getRentalOverdueDays } = require("../app/features/rentals/utils/status.ts");

const NOW = new Date("2026-09-10T05:21:00.000Z");

test("연체 경과일은 완료된 24시간 단위만 계산한다", () => {
  assert.equal(getRentalOverdueDays("out", "2026-09-08T01:27:00.000Z", NOW), 2);
  assert.equal(getRentalOverdueDays("out", "2026-09-05T13:27:00.000Z", NOW), 4);
  assert.equal(
    getRentalOverdueDays("out", new Date(NOW.getTime() - 23 * 60 * 60 * 1_000), NOW),
    0,
  );
});

test("기한 전이거나 종결된 대여는 연체 경과일이 없다", () => {
  const pastDueAt = "2026-09-05T13:27:00.000Z";

  assert.equal(getRentalOverdueDays("out", "2026-09-11T05:21:00.000Z", NOW), null);
  assert.equal(getRentalOverdueDays("returned", pastDueAt, NOW), null);
  assert.equal(getRentalOverdueDays("cancelled", pastDueAt, NOW), null);
});
