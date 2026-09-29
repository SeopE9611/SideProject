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

test("MiniApp 라켓 더 보기 cursor는 append 성공 뒤에만 증가한다", async () => {
  const catalog = await read("../TossMiniApp/src/components/RacketCatalogScreen.tsx");
  const successGuard = catalog.indexOf("if (controller.signal.aborted || requestId !== requestRef.current) return;");
  const successCommit = catalog.indexOf("if (append) queryRef.current = next;");
  const loadMoreStart = catalog.indexOf('onClick={() => { const next = { ...queryRef.current, page: (queryRef.current.page ?? 1) + 1 }');
  const loadMoreEnd = catalog.indexOf("className=", loadMoreStart);
  const loadMoreHandler = catalog.slice(loadMoreStart, loadMoreEnd);

  assert.ok(successGuard >= 0 && successCommit > successGuard, "stale/abort 확인 뒤에만 성공 page를 커밋해야 합니다.");
  assert.match(catalog, /const items = append[\s\S]*if \(append\) queryRef\.current = next;[\s\S]*items,[\s\S]*query: append \? next : current\.query/, "items 병합과 같은 성공 갱신에서만 append page를 커밋해야 합니다.");
  assert.match(loadMoreHandler, /page: \(queryRef\.current\.page \?\? 1\) \+ 1[\s\S]*void load\(next, true\)/, "다음 요청은 마지막 성공 page + 1이어야 합니다.");
  assert.doesNotMatch(loadMoreHandler, /queryRef\.current = next|setCatalog/, "더 보기 요청 전에는 성공 page를 선반영하면 안 됩니다.");
  assert.match(catalog, /catch \(error\) \{[\s\S]*if \(controller\.signal\.aborted\) return;[\s\S]*if \(!append\) setCatalog/, "append 실패/Abort는 기존 목록과 성공 cursor를 유지해야 합니다.");
});
