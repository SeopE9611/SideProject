// 독립 실행 전용. 기본 계약 테스트에 등록하지 않으며 .env 파일도 자동 로드하지 않는다.
// 승인 후: MONGODB_DB=tennis_academy_demo STOCK_AUDIT_DEMO_WRITE_APPROVAL=ALLOW_DEMO_STOCK_AUDIT node tests/product-stock-audit.mongo-integration.mjs
// MONGODB_URI는 승인된 데모 전용 비밀 환경변수로 미리 제공한다. 명령행에 넣지 않는다.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { MongoClient, ObjectId } from "mongodb";
import ts from "typescript";

const DEMO_DB = "tennis_academy_demo";
const APPROVAL = "ALLOW_DEMO_STOCK_AUDIT";
const runId = `stock-audit-integration:${randomUUID()}`;
const productIds = [];
const operationIds = [];
let phase = "연결 전 안전 조건 확인";
let writesStarted = false;
let cleanupFailed = false;

function requireCondition(condition, code) {
  if (!condition) throw new Error(code);
}

function validateEnvironment() {
  const uri = process.env.MONGODB_URI;
  requireCondition(typeof uri === "string" && uri.length > 0, "MONGODB_URI_REQUIRED");
  requireCondition(process.env.MONGODB_DB === DEMO_DB, "EXPLICIT_DEMO_DB_REQUIRED");
  requireCondition(process.env.STOCK_AUDIT_DEMO_WRITE_APPROVAL === APPROVAL, "WRITE_APPROVAL_REQUIRED");
  const match = uri.match(/^mongodb(?:\+srv)?:\/\/([^/]+)\/([^?]*)(?:\?(.*))?$/i);
  requireCondition(Boolean(match) && match[1].includes("@"), "AUTHENTICATED_URI_REQUIRED");
  requireCondition(decodeURIComponent(match[2]) === DEMO_DB, "URI_DEMO_DB_REQUIRED");
  // 암호화 비활성화/인증서 검증 우회 옵션은 허용하지 않는다.
  const query = new URLSearchParams(match[3] ?? "");
  for (const [key, value] of query) {
    const name = key.toLowerCase();
    requireCondition(!(["tls", "ssl"].includes(name) && value.toLowerCase() === "false"), "TLS_REQUIRED");
    requireCondition(!(["tlsinsecure", "tlsallowinvalidcertificates", "tlsallowinvalidhostnames"].includes(name) && value.toLowerCase() !== "false"), "TLS_VERIFICATION_REQUIRED");
  }
  return uri;
}

function loadAudit() {
  // 기존 합성 테스트와 같은 로더. 앱 DB 모듈/환경/HTTP 기능은 VM에 제공하지 않는다.
  const source = readFileSync(new URL("../lib/product-stock-audit.ts", import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const loaded = { exports: {} };
  vm.runInNewContext(`(function(require,module,exports){${outputText}\n})`, { Date })(
    (id) => {
      requireCondition(id === "mongodb", "UNEXPECTED_AUDIT_DEPENDENCY");
      return { ObjectId };
    }, loaded, loaded.exports,
  );
  return loaded.exports.updateProductStockWithAudit;
}

async function verifyAccount(db) {
  const status = await db.command({ connectionStatus: 1, showPrivileges: true });
  const info = status.authInfo;
  const roles = info?.authenticatedUserRoles;
  const privileges = info?.authenticatedUserPrivileges;
  requireCondition(info?.authenticatedUsers?.length === 1, "ONE_AUTHENTICATED_USER_REQUIRED");
  // 사용자 정의/알 수 없는 역할은 추정하지 않고 중단한다. 데모의 기본 readWrite/read 역할만 허용한다.
  requireCondition(Array.isArray(roles) && roles.length > 0 && roles.every((role) =>
    role.db === DEMO_DB && ["read", "readWrite"].includes(role.role)), "DEMO_ONLY_BUILTIN_ROLES_REQUIRED");
  requireCondition(roles.some((role) => role.role === "readWrite"), "DEMO_READWRITE_REQUIRED");
  requireCondition(Array.isArray(privileges) && privileges.length > 0, "EFFECTIVE_PRIVILEGES_REQUIRED");
  requireCondition(privileges.every(({ resource, actions }) => resource?.db === DEMO_DB &&
    typeof resource.collection === "string" && !resource.cluster && !resource.anyResource &&
    Array.isArray(actions) && actions.length > 0), "NON_DEMO_PRIVILEGES_FORBIDDEN");
  for (const collection of ["products", "product_stock_events"]) {
    const actions = new Set(privileges.filter(({ resource }) =>
      resource.collection === "" || resource.collection === collection).flatMap((entry) => entry.actions));
    for (const action of ["find", "insert", "update", "remove"]) {
      requireCondition(actions.has(action), "REQUIRED_COLLECTION_PRIVILEGES_MISSING");
    }
  }
}

async function verifyCollections(db) {
  for (const name of ["products", "product_stock_events"]) {
    const definition = await db.listCollections({ name }, { nameOnly: false }).next();
    requireCondition(definition?.type === "collection" && !definition.options?.capped && !definition.options?.timeseries,
      `PREPARE_NORMAL_COLLECTION_${name}`);
  }
  const indexes = await db.collection("product_stock_events").listIndexes().toArray();
  const valid = (index, key, unique) => JSON.stringify(index.key) === JSON.stringify(key) &&
    Boolean(index.unique) === unique && !index.sparse && !index.partialFilterExpression &&
    index.expireAfterSeconds === undefined && (!index.collation || index.collation.locale === "simple");
  requireCondition(indexes.some((index) => valid(index, { operationId: 1, productId: 1 }, true)),
    "PREPARE_UNIQUE_OPERATION_PRODUCT_INDEX");
  requireCondition(indexes.some((index) => valid(index, { productId: 1, occurredAt: -1, _id: -1 }, false)),
    "PREPARE_PRODUCT_TIME_INDEX");
}

async function main() {
  const uri = validateEnvironment();
  const updateStock = loadAudit();
  // 1회성 독립 실행의 두 동시 트랜잭션만 사용한다. 앱의 연결 설정은 변경하지 않는다.
  const client = new MongoClient(uri, {
    tls: true, readPreference: "primary", monitorCommands: true,
    // 외부 로깅 환경변수가 있어도 인증 정보/명령 원문을 출력하거나 파일에 남기지 않는다.
    mongodbLogComponentSeverities: { default: "off" }, mongodbLogPath: { write() {} },
  });
  let writeConflicts = 0;
  client.on("commandFailed", ({ failure }) => { if (failure?.code === 112) writeConflicts++; });
  const db = client.db(DEMO_DB);
  const products = db.collection("products");
  const logs = db.collection("product_stock_events");
  const context = (label) => {
    const operationId = `${runId}:${label}`;
    operationIds.push(operationId);
    return { operationId, reason: "admin_product_updated", mode: "admin" };
  };
  const transaction = async (work) => {
    const session = client.startSession();
    try { return await session.withTransaction(() => work(session), { readConcern: { level: "snapshot" }, writeConcern: { w: "majority" } }); }
    finally { await session.endSession(); }
  };
  const createProduct = async () => {
    const _id = new ObjectId();
    productIds.push(_id);
    // publicProductFilter와 관리자의 일반 상품 목록 모두에서 제외한다.
    const doc = { _id, stockAuditIntegrationRunId: runId, name: "재고 감사 통합 검증 임시 상품",
      isDeleted: true, isVisible: false, isActive: false, isPublished: false,
      inventory: { stock: 10 }, sold: 0,
      variantInventories: [{ colorValue: "integration-red", gaugeValue: "1.25", stock: 10 }],
      colorInventories: [{ value: "integration-red", stock: 10 }], gaugeInventories: [{ value: "1.25", stock: 10 }] };
    writesStarted = true;
    await products.insertOne(doc);
    return _id;
  };
  const filter = (_id) => ({ _id, stockAuditIntegrationRunId: runId });
  const events = (_id, ctx) => logs.find({ productId: _id, operationId: ctx.operationId }).toArray();
  const verifyChange = (event, axis, before, after) => {
    const change = event.changes.find((row) => row.axis === axis);
    assert.ok(change);
    assert.deepEqual([change.before, change.after, change.delta], [before, after, after - before]);
    if (axis === "color" || axis === "variant") assert.equal(change.color, "integration-red");
    if (axis === "gauge" || axis === "variant") assert.equal(change.gauge, "1.25");
  };
  const step = async (label, work) => { phase = label; await work(); console.log(`PASS ${label}`); };
  try {
    phase = "데모 연결·권한·인덱스 확인";
    await client.connect();
    requireCondition(db.databaseName === DEMO_DB, "ACTUAL_DEMO_DB_REQUIRED");
    await verifyAccount(db);
    const hello = await db.command({ hello: 1 });
    requireCondition(Boolean(hello.setName || hello.msg === "isdbgrid") && hello.logicalSessionTimeoutMinutes != null,
      "TRANSACTION_CAPABLE_TOPOLOGY_REQUIRED");
    await verifyCollections(db);
    // 첫 쓰기 전에 서버가 실제 세션 트랜잭션 읽기를 수락하는지도 검증한다.
    await transaction((session) => products.findOne({ _id: new ObjectId(), stockAuditIntegrationRunId: runId }, { session, projection: { _id: 1 } }));
    console.log("PASS 데모 DB·제한된 인증 권한·필수 인덱스·트랜잭션 읽기 확인");

    const basic = await createProduct();
    let decrementEvent;
    await step("1. 재고 10 → 9 차감·감사 기록", async () => {
      const ctx = context("decrement");
      await transaction((session) => updateStock(db, ctx, filter(basic), { $inc: { "inventory.stock": -1 } }, { session }));
      const rows = await events(basic, ctx);
      assert.equal(rows.length, 1);
      decrementEvent = rows[0];
      verifyChange(rows[0], "total", 10, 9);
      assert.equal((await products.findOne(filter(basic))).inventory.stock, 9);
    });
    await step("2. 재고 9 → 10 복원", async () => {
      const ctx = context("restore");
      await transaction((session) => updateStock(db, ctx, filter(basic), { $inc: { "inventory.stock": 1 } }, { session }));
      const rows = await events(basic, ctx);
      assert.equal(rows.length, 1);
      verifyChange(rows[0], "total", 9, 10);
      assert.equal((await products.findOne(filter(basic))).inventory.stock, 10);
    });
    const options = await createProduct();
    await step("3·4. 조합·색상·게이지 전후 수량과 단일 이벤트 통합", async () => {
      const ctx = context("options");
      await transaction(async (session) => {
        await updateStock(db, ctx, filter(options), { $inc: { "inventory.stock": -1, "variantInventories.0.stock": -1 } }, { session });
        await updateStock(db, ctx, filter(options), { $inc: { "colorInventories.0.stock": -1, "gaugeInventories.0.stock": -1 } }, { session });
      });
      const rows = await events(options, ctx);
      assert.equal(rows.length, 1);
      assert.equal(rows[0].changes.length, 4);
      for (const axis of ["total", "variant", "color", "gauge"]) verifyChange(rows[0], axis, 10, 9);
      const stored = await products.findOne(filter(options));
      assert.deepEqual([stored.inventory.stock, stored.variantInventories[0].stock, stored.colorInventories[0].stock, stored.gaugeInventories[0].stock], [9, 9, 9, 9]);
    });
    await step("5. 동일 수량 저장 시 이벤트 미생성", async () => {
      const ctx = context("noop");
      await transaction((session) => updateStock(db, ctx, filter(basic), { $set: { "inventory.stock": 10 } }, { session }));
      assert.equal((await events(basic, ctx)).length, 0);
    });
    const retryProduct = await createProduct();
    const retryContext = context("failure-retry");
    await step("6. 실제 감사 insert 실패 및 중간 실패의 전체 롤백", async () => {
      const before = await products.findOne(filter(retryProduct));
      // 실제 MongoDB의 _id 중복 오류를 감사 insert 시점에만 유도한다. PG/서버 설정은 건드리지 않는다.
      const failingDb = { client, collection: (name) => name === "product_stock_events"
        ? { findOne: logs.findOne.bind(logs), insertOne: (doc, opts) => logs.insertOne({ ...doc, _id: decrementEvent._id }, opts) }
        : db.collection(name) };
      await assert.rejects(transaction((session) => updateStock(failingDb, retryContext, filter(retryProduct), { $inc: { "inventory.stock": -1 } }, { session })),
        (error) => error.code === 11000 && error.keyPattern?._id === 1);
      assert.deepEqual(await products.findOne(filter(retryProduct)), before);
      assert.equal((await events(retryProduct, retryContext)).length, 0);
      const interrupted = context("interrupted");
      const marker = new Error("INTENTIONAL_TRANSACTION_ABORT");
      await assert.rejects(transaction(async (session) => {
        await updateStock(db, interrupted, filter(retryProduct), { $inc: { "inventory.stock": -1 } }, { session });
        throw marker;
      }), (error) => error === marker);
      assert.deepEqual(await products.findOne(filter(retryProduct)), before);
      assert.equal((await events(retryProduct, interrupted)).length, 0);
    });
    await step("7. 실패 후 같은 operationId로 재시도", async () => {
      await transaction((session) => updateStock(db, retryContext, filter(retryProduct), { $inc: { "inventory.stock": -1 } }, { session }));
      const rows = await events(retryProduct, retryContext);
      assert.equal(rows.length, 1);
      verifyChange(rows[0], "total", 10, 9);
      assert.equal((await products.findOne(filter(retryProduct))).inventory.stock, 9);
      // 이미 커밋된 재고 명령의 재실행 멱등성/주문 생성·취소 API는 이 테스트의 검증 범위가 아니다.
    });
    const concurrent = await createProduct();
    await step("8. 실제 write conflict·트랜잭션 재시도·연속 전후 수량", async () => {
      let release;
      const barrier = new Promise((resolve) => { release = resolve; });
      const seen = new Set();
      let attempts = 0;
      const conflictBefore = writeConflicts;
      const timeout = setTimeout(() => release(), 10_000); // 2개 초기 읽기를 기다리되 무한 대기하지 않는다.
      const concurrentDb = { client, collection: (name) => name !== "products" ? db.collection(name) : {
        findOne: async (query, opts) => {
          const result = await products.findOne(query, opts);
          if (!seen.has(opts.session)) {
            seen.add(opts.session);
            if (seen.size === 2) release();
            await barrier;
          }
          return result;
        }, updateOne: products.updateOne.bind(products),
      } };
      const contexts = [context("concurrent-a"), context("concurrent-b")];
      let results;
      try {
        // 한쪽이 실패해도 다른 세션이 종료된 뒤 finally에서 정리한다.
        results = await Promise.allSettled(contexts.map((ctx) => transaction((session) => {
          attempts++;
          return updateStock(concurrentDb, ctx, filter(concurrent), { $inc: { "inventory.stock": -1 } }, { session });
        })));
      } finally { clearTimeout(timeout); }
      for (const result of results) if (result.status === "rejected") throw result.reason;
      assert.ok(writeConflicts > conflictBefore && attempts > 2, "ACTUAL_WRITE_CONFLICT_AND_RETRY_REQUIRED");
      assert.equal((await products.findOne(filter(concurrent))).inventory.stock, 8);
      const rows = await logs.find({ productId: concurrent, operationId: { $in: contexts.map((ctx) => ctx.operationId) } }).toArray();
      assert.equal(rows.length, 2);
      rows.sort((a, b) => b.changes[0].before - a.changes[0].before);
      verifyChange(rows[0], "total", 10, 9);
      verifyChange(rows[1], "total", 9, 8);
    });
    await step("9. 고유 인덱스가 중복 작업·상품 이벤트를 거절", async () => {
      const duplicate = { ...decrementEvent, _id: new ObjectId() };
      await assert.rejects(transaction((session) => logs.insertOne(duplicate, { session })),
        (error) => error.code === 11000 && error.keyPattern?.operationId === 1 && error.keyPattern?.productId === 1);
      assert.equal(await logs.countDocuments({ operationId: decrementEvent.operationId, productId: basic }), 1);
    });
    await step("10. 실제 저장 수량과 모든 감사 변경의 산술 정합성", async () => {
      const rows = await logs.find({ productId: { $in: productIds }, operationId: { $in: operationIds } }).toArray();
      for (const event of rows) for (const change of event.changes) assert.equal(change.before + change.delta, change.after);
      const stored = await products.findOne(filter(concurrent));
      const latest = rows.filter((row) => row.productId.equals(concurrent)).sort((a, b) => a.changes[0].after - b.changes[0].after)[0];
      assert.equal(latest.changes[0].after, stored.inventory.stock);
    });
    console.log("주문 생성·취소 API 멱등성 및 관리자 HTTP 조회: 미검증");
  } finally {
    try {
      if (writesStarted) {
        const logFilter = { productId: { $in: productIds }, operationId: { $in: operationIds } };
        const productFilter = { _id: { $in: productIds }, stockAuditIntegrationRunId: runId };
        await logs.deleteMany(logFilter);
        await products.deleteMany(productFilter);
        requireCondition(await logs.countDocuments(logFilter) === 0 && await products.countDocuments(productFilter) === 0,
          "CLEANUP_RESIDUAL_DOCUMENTS");
        console.log(`PASS 테스트 문서 정리·잔여 0건 (${runId})`);
      }
    } catch {
      cleanupFailed = true;
      process.exitCode = 1;
      console.error(`FAIL CLEANUP_FAILED 정리 확인 필요: ${runId}; 상품 ID: ${productIds.map(String).join(",")}`);
    } finally {
      try { await client.close(); }
      catch {
        process.exitCode = 1;
        console.error(`FAIL CONNECTION_CLOSE_FAILED: ${runId}`);
      }
    }
  }
}

try { await main(); }
catch (error) {
  // 드라이버 메시지/stack/URI/계정/원본 문서는 출력하지 않는다.
  const safeCode = typeof error?.message === "string" && /^[A-Z][A-Z0-9_]+$/.test(error.message) ? error.message : "DETAILS_REDACTED";
  console.error(`FAIL ${phase}: ${safeCode}; 실행 식별자: ${runId}`);
  if (cleanupFailed) console.error("정리 실패: 삭제 범위를 확대하지 말고 위 실행 식별자만 확인하세요.");
  process.exitCode = 1;
}
