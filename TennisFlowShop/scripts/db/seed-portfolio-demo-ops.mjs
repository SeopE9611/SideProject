#!/usr/bin/env node
import { MongoClient } from "mongodb";

const DEMO_DB_NAME = "tennis_academy_demo";
const CONFIRMATION = "SEED_PORTFOLIO_DEMO_OPS";
const DEMO_VERSION = 2;
const args = process.argv.slice(2);
const shouldApply = args.includes("--apply");
const confirmationArgs = args.filter((arg) => arg.startsWith("--confirm="));

if (
  (shouldApply && !confirmationArgs.includes(`--confirm=${CONFIRMATION}`)) ||
  confirmationArgs.some((arg) => arg !== `--confirm=${CONFIRMATION}`)
) {
  console.error("실제 적용에는 --apply와 올바른 --confirm 값이 모두 필요합니다.");
  process.exit(1);
}

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;

function getUriDatabaseName(value) {
  if (!value) return null;
  const match = value.match(/^mongodb(?:\+srv)?:\/\/[^/]+\/([^?]*)/i);
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

const uriDbName = getUriDatabaseName(uri);
const safetyErrors = [];
if (process.env.PORTFOLIO_DEMO_MODE !== "true") safetyErrors.push("PORTFOLIO_DEMO_MODE가 true가 아닙니다.");
if (!uri) safetyErrors.push("MONGODB_URI 환경 변수가 필요합니다.");
if (!dbName) safetyErrors.push("MONGODB_DB 환경 변수가 필요합니다.");
if (dbName === "tennis_academy" || uriDbName === "tennis_academy") safetyErrors.push("Production DB tennis_academy는 사용할 수 없습니다.");
if (dbName && dbName !== DEMO_DB_NAME) safetyErrors.push(`MONGODB_DB는 ${DEMO_DB_NAME}여야 합니다.`);
if (!uriDbName) safetyErrors.push("MONGODB_URI에 Demo DB path를 명시해야 합니다.");
else if (uriDbName !== DEMO_DB_NAME) safetyErrors.push(`MONGODB_URI의 기본 DB는 ${DEMO_DB_NAME}여야 합니다.`);
if (dbName && uriDbName && dbName !== uriDbName) safetyErrors.push("MONGODB_URI의 기본 DB와 MONGODB_DB가 일치해야 합니다.");

if (safetyErrors.length) {
  console.error("Demo Ops Seed 안전 조건을 통과하지 못했습니다.");
  for (const message of safetyErrors) console.error(`- ${message}`);
  process.exit(1);
}

const dependencyKeys = {
  users: ["portfolio-demo-admin"],
  products: ["portfolio-demo-string-control", "portfolio-demo-string-comfort", "portfolio-demo-string-spin", "portfolio-demo-string-balanced"],
  used_rackets: ["portfolio-demo-racket-control", "portfolio-demo-racket-spin", "portfolio-demo-racket-balanced"],
};
const plan = {
  users: ["portfolio-demo-customer-1", "portfolio-demo-customer-2", "portfolio-demo-customer-3"],
  orders: ["portfolio-demo-order-paid", "portfolio-demo-order-shipping-pending", "portfolio-demo-order-cancel-requested", "portfolio-demo-order-payment-pending", "portfolio-demo-order-completed"],
  stringing_applications: ["portfolio-demo-stringing-recent", "portfolio-demo-stringing-in-progress", "portfolio-demo-stringing-aging", "portfolio-demo-stringing-cancel-review"],
  rental_orders: ["portfolio-demo-rental-paid", "portfolio-demo-rental-overdue", "portfolio-demo-rental-due-soon", "portfolio-demo-rental-payment-pending"],
  packageOrders: ["portfolio-demo-package-paid", "portfolio-demo-package-payment-pending"],
  service_passes: ["portfolio-demo-service-pass-expiring"],
  academy_classes: ["portfolio-demo-academy-class-group"],
  academy_lesson_applications: ["portfolio-demo-academy-submitted", "portfolio-demo-academy-reviewing", "portfolio-demo-academy-confirmed"],
};

if (!shouldApply) {
  console.log("모드: DRY_RUN");
  console.log(`대상 DB 이름: ${dbName}`);
  console.log("Demo 환경 안전 조건: 통과");
  console.log("1차 Seed dependency: APPLY 연결 후 write 전에 검증 예정 (users 1, products 4, used_rackets 3)");
  for (const [collection, keys] of Object.entries(plan)) {
    console.log(`${collection}: 신규/갱신 예정 ${keys.length}건`);
    console.log(`  demoSeedKey: ${keys.join(", ")}`);
  }
  console.log("예상 Dashboard scenario: 최근 7일 주문/교체서비스/대여/패키지 및 매출, 취소 요청, 배송 처리 대기, 24시간 초과 결제 대기, 대여 연체/반납 임박, 이용권 만료 임박, 3일 이상 교체서비스");
  console.log("실제 변경 없음");
  process.exit(0);
}

const marker = (demoSeedKey) => ({ isDemoData: true, demoSeedVersion: DEMO_VERSION, demoSeedKey });
const demoFilter = (demoSeedKey) => ({ demoSeedKey, isDemoData: true });
const ago = (now, hours) => new Date(now.getTime() - hours * 60 * 60 * 1000);
const after = (now, hours) => new Date(now.getTime() + hours * 60 * 60 * 1000);
const addDays = (date, days) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
const iso = (date) => date.toISOString();

const client = new MongoClient(uri);
const totals = new Map();
function addResult(collection, result) {
  const total = totals.get(collection) ?? { matched: 0, modified: 0, upserted: 0 };
  total.matched += result.matchedCount;
  total.modified += result.modifiedCount;
  total.upserted += result.upsertedCount;
  totals.set(collection, total);
}
async function upsert(db, collection, document, createdAt) {
  const { demoSeedKey, ...managed } = document;
  const result = await db.collection(collection).updateOne(
    demoFilter(demoSeedKey),
    { $set: { ...managed, ...marker(demoSeedKey), createdAt } },
    { upsert: true },
  );
  addResult(collection, result);
}

try {
  await client.connect();
  const db = client.db(dbName);

  const resolved = {};
  for (const [collection, keys] of Object.entries(dependencyKeys)) {
    const docs = await db.collection(collection).find(
      { demoSeedKey: { $in: keys }, isDemoData: true, demoSeedVersion: 1 },
      { projection: { _id: 1, demoSeedKey: 1, name: 1, model: 1, brand: 1, price: 1, mountingFee: 1, images: 1, color: 1, colorInventories: 1, gauge: 1, inventory: 1, rental: 1 } },
    ).toArray();
    resolved[collection] = new Map(docs.map((doc) => [doc.demoSeedKey, doc]));
    const missing = keys.filter((key) => !resolved[collection].has(key));
    if (missing.length) throw new Error(`1차 Seed dependency 누락 (${collection}): ${missing.join(", ")}`);
  }

  const collisions = [];
  for (const [collection, keys] of Object.entries(plan)) {
    const docs = await db.collection(collection).find(
      { demoSeedKey: { $in: keys }, isDemoData: { $ne: true } },
      { projection: { _id: 1, demoSeedKey: 1 } },
    ).toArray();
    for (const doc of docs) collisions.push(`${collection}:${doc.demoSeedKey}`);
  }
  if (collisions.length) throw new Error(`Ops demoSeedKey 일반 문서 충돌: ${collisions.join(", ")}`);

  const now = new Date();
  const customers = [
    { key: plan.users[0], name: "데모 고객 김민수", email: "minsu.demo@example.com", phone: "010-0000-1001" },
    { key: plan.users[1], name: "데모 고객 이서연", email: "seoyeon.demo@example.com", phone: "010-0000-1002" },
    { key: plan.users[2], name: "데모 고객 박준호", email: "junho.demo@example.com", phone: "010-0000-1003" },
  ];
  for (const customer of customers) await upsert(db, "users", { ...marker(customer.key), name: customer.name, email: customer.email, phone: customer.phone, role: "user", isDeleted: false, isSuspended: false, pointsBalance: 0, pointsDebt: 0, updatedAt: now }, now);
  const customerDocs = await db.collection("users").find(demoFilterQuery(plan.users), { projection: { _id: 1, demoSeedKey: 1, name: 1, email: 1, phone: 1 } }).toArray();
  if (customerDocs.length !== customers.length) throw new Error("Demo 고객 ID를 모두 조회하지 못했습니다.");
  const customerByKey = new Map(customerDocs.map((doc) => [doc.demoSeedKey, doc]));
  const c1 = customerByKey.get(plan.users[0]);
  const c2 = customerByKey.get(plan.users[1]);
  const c3 = customerByKey.get(plan.users[2]);
  const products = resolved.products;
  const rackets = resolved.used_rackets;

  const address = (customer, shippingMethod = "courier") => ({ name: customer.name, phone: customer.phone, address: "데모시 테니스로 2", addressDetail: "포트폴리오 데모", postalCode: "00000", depositor: customer.name, deliveryRequest: "데모 주문 - 실제 배송 금지", shippingMethod });
  const item = (product, quantity = 1) => ({ productId: product._id, name: product.name, brand: product.brand, price: product.inventory?.isSale && Number(product.inventory?.salePrice) > 0 ? Number(product.inventory.salePrice) : Number(product.price), imageUrl: product.images?.[0] ?? null, quantity, kind: "product", selectedColor: product.color, selectedColorLabel: product.colorInventories?.[0]?.label ?? product.color, selectedColorHex: product.colorInventories?.[0]?.colorHex, selectedColorImage: product.colorInventories?.[0]?.image, selectedGauge: product.gauge });
  const order = (key, customer, product, options) => {
    const items = [item(product, options.quantity ?? 1)];
    const shippingFee = options.shippingFee ?? 3000;
    const totalPrice = items.reduce((sum, row) => sum + row.price * row.quantity, 0) + shippingFee;
    return { ...marker(key), userId: customer._id, userSnapshot: { name: customer.name, email: customer.email }, items, shippingInfo: { ...address(customer, options.shippingMethod), ...(options.estimatedDate ? { estimatedDate: options.estimatedDate } : {}) }, guestInfo: null, originalTotalPrice: totalPrice, pointsUsed: 0, totalPrice, shippingFee, serviceFee: 0, status: options.status, paymentStatus: options.paymentStatus, paymentInfo: { provider: "manual_bank_transfer", method: "무통장 입금", status: options.paymentInfoStatus, total: totalPrice, shippingFee, serviceFee: 0, createdAt: options.createdAt }, history: [{ status: options.status, date: options.createdAt, description: "포트폴리오 Demo 운영 시연 주문" }], updatedAt: now, ...(options.cancelRequest ? { cancelRequest: options.cancelRequest } : {}) };
  };
  const orderSpecs = [
    [plan.orders[0], c1, products.get(dependencyKeys.products[0]), { status: "결제완료", paymentStatus: "결제완료", paymentInfoStatus: "paid", createdAt: ago(now, 6), quantity: 2 }],
    [plan.orders[1], c2, products.get(dependencyKeys.products[2]), { status: "상품준비중", paymentStatus: "결제완료", paymentInfoStatus: "paid", createdAt: ago(now, 12) }],
    [plan.orders[2], c3, products.get(dependencyKeys.products[1]), { status: "결제완료", paymentStatus: "결제완료", paymentInfoStatus: "paid", createdAt: ago(now, 18), cancelRequest: { status: "requested", reasonCode: "단순 변심", reasonText: "포트폴리오 Demo 취소 검토", requestedAt: ago(now, 2), refundAccount: { bank: "demo-bank", account: "000-0000-0000", holder: "데모 고객" } } }],
    [plan.orders[3], c1, products.get(dependencyKeys.products[3]), { status: "대기중", paymentStatus: "결제대기", paymentInfoStatus: "pending", createdAt: ago(now, 30) }],
    [plan.orders[4], c2, products.get(dependencyKeys.products[0]), { status: "배송완료", paymentStatus: "결제완료", paymentInfoStatus: "paid", createdAt: ago(now, 48), shippingMethod: "visit", estimatedDate: iso(ago(now, 24)) }],
  ];
  for (const spec of orderSpecs) { const doc = order(...spec); await upsert(db, "orders", doc, doc.paymentInfo.createdAt); }

  const stringing = (key, customer, product, status, paymentStatus, createdAt, extra = {}) => { const serviceFee = Number(product.mountingFee ?? 0); const line = { racketType: "Demo Racket", stringProductId: product._id.toString(), stringName: product.name, tensionMain: 48, tensionCross: 46, note: "Demo 작업", mountingFee: serviceFee }; return { ...marker(key), userId: customer._id, name: customer.name, phone: customer.phone, email: customer.email, customer: { name: customer.name, email: customer.email, phone: customer.phone }, userSnapshot: { name: customer.name, email: customer.email }, searchEmailLower: customer.email, contactEmail: customer.email, contactPhone: customer.phone.replace(/\D/g, ""), stringDetails: { racketType: "Demo Racket", stringTypes: [product._id.toString()], customStringName: "", lines: [line], racketLines: [line], preferredDate: iso(after(now, 48)).slice(0, 10), preferredTime: "14:00", requirements: "포트폴리오 Demo 교체서비스" }, stringItems: [{ productId: product._id.toString(), name: product.name, mountingFee: serviceFee, quantity: 1 }], shippingInfo: { ...address(customer), email: customer.email, collectionMethod: "self_ship", bank: "demo-bank" }, collectionMethod: "self_ship", totalPrice: serviceFee, serviceFeeBefore: serviceFee, serviceFee, serviceAmount: serviceFee, packageApplied: false, packagePassId: null, status, paymentStatus, paymentInfo: { provider: "bank", method: "무통장입금", status: paymentStatus }, submittedAt: createdAt, history: [{ status, date: iso(createdAt), description: "포트폴리오 Demo 교체서비스" }], updatedAt: now, ...extra }; };
  const stringingDocs = [
    stringing(plan.stringing_applications[0], c1, products.get(dependencyKeys.products[0]), "교체완료", "결제완료", ago(now, 10)),
    stringing(plan.stringing_applications[1], c2, products.get(dependencyKeys.products[2]), "작업 중", "결제완료", ago(now, 36)),
    stringing(plan.stringing_applications[2], c3, products.get(dependencyKeys.products[1]), "접수완료", "결제완료", ago(now, 96)),
    stringing(plan.stringing_applications[3], c1, products.get(dependencyKeys.products[3]), "검토 중", "결제완료", ago(now, 20), { cancelRequest: { status: "requested", reasonCode: "일정 변경", reasonText: "Demo 검토 요청", requestedAt: ago(now, 3) } }),
  ];
  for (const doc of stringingDocs) await upsert(db, "stringing_applications", doc, doc.history[0].date ? new Date(doc.history[0].date) : now);

  const rental = (key, customer, racket, status, createdAt, paidAt, outAt) => { const deposit = Number(racket.rental?.deposit ?? 0); const fee = Number(racket.rental?.fee?.d7 ?? 0); const isOut = status === "out"; const servicePickupMethod = isOut ? "SHOP_VISIT" : "SELF_SEND"; return { ...marker(key), userId: customer._id, racketId: racket._id, brand: racket.brand, model: racket.model, days: 7, amount: { fee, deposit, stringPrice: 0, stringingFee: 0, total: deposit + fee }, originalTotal: deposit + fee, pointsUsed: 0, servicePickupMethod, status, paymentStatus: status === "pending" ? "결제대기" : "결제완료", paymentInfo: { provider: "manual_bank_transfer", method: "무통장 입금", status: status === "pending" ? "pending" : "paid" }, shipping: { name: customer.name, phone: customer.phone, postalCode: isOut ? "" : "00000", address: isOut ? "" : "데모시 테니스로 2", addressDetail: isOut ? "" : "포트폴리오 데모", deliveryRequest: "데모 대여 - 실제 배송 금지", shippingMethod: isOut ? "pickup" : "delivery" }, createdAt, ...(paidAt ? { paidAt } : {}), ...(outAt ? { outAt: iso(outAt), dueAt: iso(addDays(outAt, 7)) } : {}), updatedAt: now }; };
  const overdueDueAt = ago(now, 48);
  const overdueOutAt = addDays(overdueDueAt, -7);
  const dueSoonDueAt = after(now, 12);
  const dueSoonOutAt = addDays(dueSoonDueAt, -7);
  const rentalDocs = [rental(plan.rental_orders[0], c1, rackets.get(dependencyKeys.used_rackets[0]), "paid", ago(now, 8), ago(now, 7)), rental(plan.rental_orders[1], c2, rackets.get(dependencyKeys.used_rackets[1]), "out", ago(now, 240), ago(now, 239), overdueOutAt), rental(plan.rental_orders[2], c3, rackets.get(dependencyKeys.used_rackets[0]), "out", ago(now, 168), ago(now, 167), dueSoonOutAt), rental(plan.rental_orders[3], c1, rackets.get(dependencyKeys.used_rackets[1]), "pending", ago(now, 30))];
  for (const doc of rentalDocs) await upsert(db, "rental_orders", doc, doc.createdAt);

  const packageItemId = "portfolio-demo-package-item-10";
  const packageDoc = (key, customer, status, paymentStatus, createdAt) => ({ ...marker(key), userId: customer._id, status, paymentStatus, totalPrice: 180000, packageInfo: { id: "10-sessions", title: "Demo 스트링 케어 10회권", sessions: 10, price: 180000, validityPeriod: 30 }, items: [{ id: packageItemId, name: "Demo 스트링 케어 10회권", price: 180000, quantity: 1, meta: { kind: "service_package", packageSize: 10, validityPeriod: 30, planId: "10-sessions", planTitle: "Demo 스트링 케어 10회권" } }], serviceInfo: { depositor: customer.name, serviceMethod: "courier", name: customer.name, phone: customer.phone, email: customer.email, address: "데모시 테니스로 2", postalCode: "00000" }, paymentInfo: { provider: "manual_bank_transfer", method: "무통장 입금", status: paymentStatus === "결제완료" ? "paid" : "pending", bank: "demo-bank", depositor: customer.name, ...(paymentStatus === "결제완료" ? { approvedAt: createdAt } : {}) }, history: [{ status, date: createdAt, description: "포트폴리오 Demo 패키지 주문" }], userSnapshot: { name: customer.name, email: customer.email }, meta: { source: "portfolio_demo", channel: "online_demo" }, updatedAt: now });
  const paidPackageAt = ago(now, 5);
  const packageDocs = [packageDoc(plan.packageOrders[0], c2, "결제완료", "결제완료", paidPackageAt), packageDoc(plan.packageOrders[1], c3, "결제대기", "결제대기", ago(now, 30))];
  for (const doc of packageDocs) await upsert(db, "packageOrders", doc, doc.history[0].date);
  const paidPackage = await db.collection("packageOrders").findOne(demoFilter(plan.packageOrders[0]), { projection: { _id: 1 } });
  if (!paidPackage?._id) throw new Error("Demo 결제완료 패키지 주문 ID를 조회하지 못했습니다.");
  await upsert(db, "service_passes", { ...marker(plan.service_passes[0]), userId: c2._id, orderId: paidPackage._id, orderItemId: packageItemId, packageSize: 10, usedCount: 0, remainingCount: 10, status: "active", purchasedAt: paidPackageAt, activatedAt: paidPackageAt, expiresAt: addDays(paidPackageAt, 30), remainingValidityMs: null, redemptions: [], meta: { planId: "10-sessions", planTitle: "Demo 스트링 케어 10회권" }, updatedAt: now }, paidPackageAt);

  const academyClassCreatedAt = iso(ago(now, 24));
  await upsert(db, "academy_classes", { ...marker(plan.academy_classes[0]), name: "포트폴리오 데모 그룹 레슨", description: "실제 수업이 아닌 포트폴리오 시연용 클래스입니다.", level: "all", lessonType: "group", instructorName: "데모 코치", location: "포트폴리오 데모 코트", scheduleText: "화·목 19:00", capacity: 12, price: 120000, status: "visible", enrolledCount: 0, updatedAt: iso(now) }, academyClassCreatedAt);
  const academyClass = await db.collection("academy_classes").findOne(demoFilter(plan.academy_classes[0]), { projection: { _id: 1, name: 1, description: 1, level: 1, lessonType: 1, instructorName: 1, location: 1, scheduleText: 1, capacity: 1, price: 1, status: 1 } });
  if (!academyClass?._id) throw new Error("Demo Academy Class ID를 조회하지 못했습니다.");
  const academyClassId = academyClass._id.toString();
  const classSnapshot = { classId: academyClassId, name: academyClass.name, description: academyClass.description, level: academyClass.level, levelLabel: "전체 레벨", lessonType: academyClass.lessonType, lessonTypeLabel: "그룹 레슨", instructorName: academyClass.instructorName, location: academyClass.location, scheduleText: academyClass.scheduleText, capacity: academyClass.capacity, price: academyClass.price, status: academyClass.status, statusLabel: "모집 중" };
  const academySpecs = [[plan.academy_lesson_applications[0], c1, "submitted", "beginner", ["화", "목"], "19:00 이후"], [plan.academy_lesson_applications[1], c2, "reviewing", "intermediate", ["수", "금"], "오전 10:00~12:00"], [plan.academy_lesson_applications[2], c3, "confirmed", "new", ["토"], "오후 14:00"]];
  for (let index = 0; index < academySpecs.length; index++) { const [key, customer, status, currentLevel, preferredDays, preferredTimeText] = academySpecs[index]; const createdAt = iso(ago(now, 4 + index * 6)); await upsert(db, "academy_lesson_applications", { ...marker(key), userId: customer._id.toString(), classId: academyClassId, classSnapshot, applicantName: customer.name, phone: customer.phone, email: customer.email, desiredLessonType: "group", currentLevel, preferredDays, preferredTimeText, lessonGoal: "포트폴리오 Demo 레슨 상담", requestMemo: "실제 연락 금지", status, adminMemo: null, customerMessage: null, history: [{ status, date: createdAt, description: "포트폴리오 Demo 아카데미 신청" }], updatedAt: iso(now) }, createdAt); }

  console.log("모드: APPLY");
  console.log("Demo 환경 안전 조건 및 1차 Seed dependency: 통과");
  console.log(`resolved dependency: customer users=${customerDocs.length}, products=${resolved.products.size}, rackets=${resolved.used_rackets.size}`);
  for (const collection of Object.keys(plan)) { const result = totals.get(collection) ?? { matched: 0, modified: 0, upserted: 0 }; console.log(`${collection}: matched=${result.matched}, modified=${result.modified}, upserted=${result.upserted}`); }
} catch (error) {
  console.error(error instanceof Error ? error.message : "Demo Ops Seed 적용 중 오류가 발생했습니다.");
  process.exitCode = 1;
} finally {
  await client.close().catch(() => undefined);
}

function demoFilterQuery(keys) {
  return { demoSeedKey: { $in: keys }, isDemoData: true, demoSeedVersion: DEMO_VERSION };
}
