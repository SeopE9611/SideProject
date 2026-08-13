import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const ts = require("typescript");
require.extensions[".ts"] = (module, filename) => {
  const source = require("node:fs").readFileSync(filename, "utf8");
  module._compile(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    fileName: filename,
  }).outputText, filename);
};

const { calculateRacketAvailability, reservePaidRentalRacket } = require("../app/features/rentals/api/paid-rental-availability.ts");

function fixture({ quantity = 2, activeCount = 0 } = {}) {
  const calls = { racketReads: 0, rentalReads: 0, writes: [] };
  const db = {
    collection(name) {
      if (name === "used_rackets") return {
        findOne: async (_filter, options) => {
          calls.racketReads += 1;
          assert.equal(options.session, session);
          return { quantity, status: "available" };
        },
        updateOne: async (filter, update, options) => {
          calls.writes.push({ filter, update, options });
          return { modifiedCount: 1 };
        },
      };
      return { countDocuments: async (_filter, options) => {
        calls.rentalReads += 1;
        assert.equal(options.session, session);
        return activeCount;
      } };
    },
  };
  const session = { id: "transaction-session" };
  return { db, session, calls, setActiveCount(value) { activeCount = value; } };
}

test("quantity 2 / active rental 0이면 paid rental이 used_rackets에 write한다", async () => {
  const f = fixture();
  const result = await reservePaidRentalRacket({ db: f.db, session: f.session, racketId: "racket", visibilityViewer: { isAdmin: false } });
  assert.equal(result.available, 2);
  assert.equal(f.calls.writes.length, 1);
  assert.equal(f.calls.writes[0].update.$inc.rentalConcurrencyVersion, 1);
});

test("quantity 2 / active rental 1이면 구매 1은 가능하고 구매 2는 불가하다", () => {
  const { available } = calculateRacketAvailability({ quantity: 2, status: "available" }, 1);
  assert.equal(available >= 1, true);
  assert.equal(available >= 2, false);
});

test("transaction retry마다 라켓과 active rental count를 새 snapshot에서 다시 읽는다", async () => {
  const f = fixture();
  await reservePaidRentalRacket({ db: f.db, session: f.session, racketId: "racket" });
  f.setActiveCount(2);
  await assert.rejects(() => reservePaidRentalRacket({ db: f.db, session: f.session, racketId: "racket" }), /재고 없음/);
  assert.deepEqual([f.calls.racketReads, f.calls.rentalReads, f.calls.writes.length], [2, 2, 1]);
});

test("레거시 단품은 available status만 1개로 계산한다", () => {
  assert.equal(calculateRacketAvailability({ status: "available" }, 0).available, 1);
  assert.equal(calculateRacketAvailability({ status: "rented" }, 0).available, 0);
});
