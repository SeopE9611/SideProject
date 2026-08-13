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
  const [api, app, catalog, detail, labels, webConstants] = await Promise.all([
    read("../TossMiniApp/src/api/rackets.ts"),
    read("../TossMiniApp/src/App.tsx"),
    read("../TossMiniApp/src/components/RacketCatalogScreen.tsx"),
    read("../TossMiniApp/src/components/RacketDetail.tsx"),
    read("../TossMiniApp/src/lib/racket-labels.ts"),
    read("lib/constants.ts"),
  ]);
  assert.match(api, /getJson<RacketsListResponse>/);
  assert.match(api, /withTotal: "1"/);
  assert.match(api, /getJson<RacketDetail>/);
  assert.match(api, /getJson<RacketAvailability>/);
  assert.ok(app.indexOf("if (pendingPayment)") < app.indexOf("if (isRackets"));
  assert.match(app, /get\("racketId"\)/);
  assert.match(app, /get\("productId"\)/);
  assert.doesNotMatch(`${catalog}\n${detail}`, /postJson|preparePayment|checkoutPayment|executeAppsPayment/);
  assert.match(app, /useState\(initialRacketCatalogState\)/, "상세가 unmount해도 목록 상태는 App이 보관해야 합니다.");
  assert.match(catalog, /queryRef\.current = next;[\s\S]*setCatalog\([\s\S]*query: next[\s\S]*void load\(next, false\)/, "필터 query는 요청 전에 즉시 반영해야 합니다.");
  assert.doesNotMatch(catalog, /setQuery\(next\)/, "네트워크 성공 뒤 query를 커밋하는 이전 패턴을 사용하면 안 됩니다.");
  assert.match(catalog, /controllerRef\.current\?\.abort\(\)/, "새 요청은 이전 요청을 취소해야 합니다.");
  assert.doesNotMatch(catalog, /active-count/, "목록은 카드별 실시간 재고를 조회하면 안 됩니다.");
  assert.doesNotMatch(catalog, /대여 가능/, "목록은 실시간 대여 가능 여부를 확정해서 표시하면 안 됩니다.");
  assert.match(catalog, /대여 지원/);
  assert.match(api, /active-count/);
  assert.match(detail, /availability\.quantity <= 0[\s\S]*availability\.available <= 0 && availability\.count > 0[\s\S]*availability\.available > 0/);
  assert.match(app, /onBack=\{handleRacketList\}/);
  assert.doesNotMatch(app, /RacketDetail[^\n]+window\.history\.back/);

  for (const alias of ["g1", "1grip", "4 1/8", "4.125", "g2", "2grip", "4 1/4", "4.25", "g3", "3grip", "4 3/8", "4.375"]) {
    assert.ok(webConstants.includes(`"${alias}"`), `웹 그립 별칭 ${alias}이 기준에 있어야 합니다.`);
    assert.ok(labels.includes(`"${alias}"`), `MiniApp도 웹 그립 별칭 ${alias}을 지원해야 합니다.`);
  }
});
