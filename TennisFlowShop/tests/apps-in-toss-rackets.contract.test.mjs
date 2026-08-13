import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("라켓 공개 조회 API가 Apps in Toss CORS 계약을 따른다", async () => {
  const paths = [
    "app/api/rackets/route.ts",
    "app/api/rackets/[id]/route.ts",
    "app/api/rentals/active-count/[racketId]/route.ts",
  ];
  for (const path of paths) {
    const source = await read(path);
    assert.match(source, /export function OPTIONS\(/, `${path}: OPTIONS가 필요합니다.`);
    assert.match(source, /createAppsInTossPreflightResponse\(req\.headers\.get\("origin"\)\)/);
    assert.match(source, /applyAppsInTossCors\(/, `${path}: GET 응답에 CORS가 필요합니다.`);
    assert.doesNotMatch(source, /Access-Control-Allow-Origin["']?\s*[,=:]\s*["']\*["']/);
  }
});

test("MiniApp 라켓 조회와 내비게이션이 읽기 전용 계약을 따른다", async () => {
  const [api, app, catalog, detail] = await Promise.all([
    read("../TossMiniApp/src/api/rackets.ts"),
    read("../TossMiniApp/src/App.tsx"),
    read("../TossMiniApp/src/components/RacketCatalogScreen.tsx"),
    read("../TossMiniApp/src/components/RacketDetail.tsx"),
  ]);
  assert.match(api, /getJson<RacketsListResponse>/);
  assert.match(api, /withTotal: "1"/);
  assert.match(api, /getJson<RacketDetail>/);
  assert.match(api, /getJson<RacketAvailability>/);
  assert.ok(app.indexOf("if (pendingPayment)") < app.indexOf("if (isRackets"));
  assert.match(app, /get\("racketId"\)/);
  assert.match(app, /get\("productId"\)/);
  assert.doesNotMatch(`${catalog}\n${detail}`, /postJson|preparePayment|checkoutPayment|executeAppsPayment/);
});
