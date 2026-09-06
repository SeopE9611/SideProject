#!/usr/bin/env node
import bcrypt from "bcryptjs";
import { MongoClient } from "mongodb";

const DEMO_DB_NAME = "tennis_academy_demo";
const CONFIRMATION = "SEED_PORTFOLIO_DEMO";
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
if (process.env.PORTFOLIO_DEMO_MODE !== "true") {
  safetyErrors.push("PORTFOLIO_DEMO_MODE가 true가 아닙니다.");
}
if (!uri) safetyErrors.push("MONGODB_URI 환경 변수가 필요합니다.");
if (!dbName) safetyErrors.push("MONGODB_DB 환경 변수가 필요합니다.");
if (dbName === "tennis_academy" || uriDbName === "tennis_academy") {
  safetyErrors.push("Production DB tennis_academy는 사용할 수 없습니다.");
}
if (dbName && dbName !== DEMO_DB_NAME) {
  safetyErrors.push(`MONGODB_DB는 ${DEMO_DB_NAME}여야 합니다.`);
}
if (!uriDbName) {
  safetyErrors.push("MONGODB_URI에 Demo DB path를 명시해야 합니다.");
} else if (uriDbName !== DEMO_DB_NAME) {
  safetyErrors.push(`MONGODB_URI의 기본 DB는 ${DEMO_DB_NAME}여야 합니다.`);
}
if (dbName && uriDbName && dbName !== uriDbName) {
  safetyErrors.push("MONGODB_URI의 기본 DB와 MONGODB_DB가 일치해야 합니다.");
}

if (safetyErrors.length > 0) {
  console.error("Demo Seed 안전 조건을 통과하지 못했습니다.");
  for (const message of safetyErrors) console.error(`- ${message}`);
  process.exit(1);
}

const DEMO_VERSION = 1;
const PRODUCT_IMAGE = "/images/home/home-string-product-showcase.webp";
const RACKET_IMAGE = "/images/home/home-racket-section-showcase.webp";

function product({ key, name, sku, brand, material, gauge, color, colorLabel, colorHex, price, stock, features, tags, inventory }) {
  const variant = {
    colorValue: color,
    colorLabel,
    colorHex,
    colorImage: PRODUCT_IMAGE,
    gaugeValue: gauge,
    gaugeLabel: `${gauge}mm`,
    stock,
    isSoldOut: false,
    showWhenSoldOut: true,
  };
  return {
    demoSeedKey: key,
    demoSeedVersion: DEMO_VERSION,
    isDemoData: true,
    name,
    sku,
    shortDescription: "포트폴리오 화면 확인을 위한 가상 스트링입니다.",
    description: "실제 판매 상품이나 재고가 아닌 포트폴리오 데모 데이터입니다.",
    brand,
    material,
    gauge,
    gaugeOptions: [gauge],
    gaugeInventories: [{ value: gauge, label: `${gauge}mm`, stock, isSoldOut: false, showWhenSoldOut: true }],
    color,
    colorOptions: [color],
    colorInventories: [{ value: color, label: colorLabel, colorHex, image: PRODUCT_IMAGE, stock, isSoldOut: false, showWhenSoldOut: true }],
    variantInventories: [variant],
    length: "12m",
    price,
    mountingFee: 15000,
    shippingFee: 3000,
    searchKeywords: ["포트폴리오", "데모", name, brand, material, gauge],
    isVisible: true,
    features,
    tags,
    specifications: { material, gauge, color, length: "12m" },
    additionalFeatures: "포트폴리오 데모 전용 가상 상품",
    images: [PRODUCT_IMAGE],
    inventory: { stock, lowStock: Math.min(3, stock), status: "instock", manageStock: true, allowBackorder: false, salePrice: 0, hideGaugeStock: false, ...inventory },
    isDeleted: false,
  };
}

const baseTags = { beginner: false, intermediate: true, advanced: false, baseline: false, serveVolley: false, allCourt: true, power: false };
const products = [
  product({ key: "portfolio-demo-string-control", name: "포트폴리오 데모 컨트롤 1.25", sku: "DEMO-CONTROL-125", brand: "wilson", material: "polyester", gauge: "1.25", color: "black", colorLabel: "블랙", colorHex: "#111827", price: 22000, stock: 12, features: { power: 55, control: 95, spin: 72, durability: 80, comfort: 58 }, tags: { ...baseTags, advanced: true }, inventory: { isFeatured: true, isNew: false, isSale: false } }),
  product({ key: "portfolio-demo-string-comfort", name: "포트폴리오 데모 컴포트 1.30", sku: "DEMO-COMFORT-130", brand: "tecnifibre", material: "multifilament", gauge: "1.30", color: "natural", colorLabel: "내추럴", colorHex: "#ead7b7", price: 24000, stock: 10, features: { power: 70, control: 68, spin: 55, durability: 62, comfort: 96 }, tags: { ...baseTags, beginner: true }, inventory: { isFeatured: false, isNew: true, isSale: false } }),
  product({ key: "portfolio-demo-string-spin", name: "포트폴리오 데모 스핀 1.25", sku: "DEMO-SPIN-125", brand: "babolat", material: "polyester", gauge: "1.25", color: "yellow", colorLabel: "옐로우", colorHex: "#facc15", price: 23000, stock: 14, features: { power: 72, control: 75, spin: 98, durability: 78, comfort: 52 }, tags: { ...baseTags, baseline: true, power: true }, inventory: { isFeatured: false, isNew: false, isSale: true, salePrice: 19000 } }),
  product({ key: "portfolio-demo-string-balanced", name: "포트폴리오 데모 밸런스 1.28", sku: "DEMO-BALANCED-128", brand: "yonex", material: "synthetic_gut", gauge: "1.28", color: "blue", colorLabel: "블루", colorHex: "#2563eb", price: 20000, stock: 16, features: { power: 70, control: 84, spin: 70, durability: 72, comfort: 86 }, tags: { ...baseTags, beginner: true }, inventory: { isFeatured: false, isNew: false, isSale: false } }),
];

const rackets = [
  { demoSeedKey: "portfolio-demo-racket-control", brand: "wilson", model: "포트폴리오 데모 컨트롤 라켓", year: 2025, searchKeywords: ["포트폴리오", "데모", "컨트롤"], spec: { weight: 305, balance: 320, headSize: 98, lengthIn: 27, swingWeight: 325, stiffnessRa: 62, pattern: "18x20", gripSize: "G2" }, condition: "A", price: 145000, shippingFee: 4000, images: [RACKET_IMAGE], status: "available", isVisible: true, rental: { enabled: true, deposit: 100000, fee: { d7: 18000, d15: 32000, d30: 52000 }, disabledReason: "" }, quantity: 1, marketing: { isFeatured: true, isNew: false, isSale: false, salePrice: 0 } },
  { demoSeedKey: "portfolio-demo-racket-spin", brand: "babolat", model: "포트폴리오 데모 스핀 라켓", year: 2024, searchKeywords: ["포트폴리오", "데모", "스핀"], spec: { weight: 300, balance: 320, headSize: 100, lengthIn: 27, swingWeight: 320, stiffnessRa: 68, pattern: "16x19", gripSize: "G2" }, condition: "B", price: 125000, shippingFee: 4000, images: [RACKET_IMAGE], status: "available", isVisible: true, rental: { enabled: true, deposit: 90000, fee: { d7: 16000, d15: 29000, d30: 47000 }, disabledReason: "" }, quantity: 1, marketing: { isFeatured: false, isNew: true, isSale: false, salePrice: 0 } },
  { demoSeedKey: "portfolio-demo-racket-balanced", brand: "yonex", model: "포트폴리오 데모 밸런스 라켓", year: 2023, searchKeywords: ["포트폴리오", "데모", "밸런스"], spec: { weight: 285, balance: 325, headSize: 100, lengthIn: 27, swingWeight: 315, stiffnessRa: 65, pattern: "16x20", gripSize: "G1" }, condition: "C", price: 98000, shippingFee: 4000, images: [RACKET_IMAGE], status: "available", isVisible: true, rental: { enabled: false, deposit: 0, fee: { d7: 0, d15: 0, d30: 0 }, disabledReason: "데모 상태 비교용 대여 불가 상품" }, quantity: 1, marketing: { isFeatured: false, isNew: false, isSale: true, salePrice: 89000 } },
].map((racket) => ({ ...racket, demoSeedVersion: DEMO_VERSION, isDemoData: true }));

const demoSeedKeys = ["portfolio-demo-admin", ...products.map(({ demoSeedKey }) => demoSeedKey), ...rackets.map(({ demoSeedKey }) => demoSeedKey), "portfolio-demo-notice"];

if (!shouldApply) {
  console.log("모드: DRY_RUN");
  console.log(`대상 DB 이름: ${dbName}`);
  console.log("Demo 환경 안전 조건 통과 여부: 통과");
  console.log("Seed 예정 users 수: 1");
  console.log(`Seed 예정 products 수: ${products.length}`);
  console.log(`Seed 예정 used_rackets 수: ${rackets.length}`);
  console.log("Seed 예정 board_posts 수: 1");
  console.log(`demoSeedKey 목록: ${demoSeedKeys.join(", ")}`);
  console.log("실제 변경 없음");
  process.exit(0);
}

const email = process.env.PORTFOLIO_DEMO_ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.PORTFOLIO_DEMO_ADMIN_PASSWORD;
if (!email || !password) {
  console.error("APPLY 모드에는 Demo 관리자 email과 password 환경 변수가 필요합니다.");
  process.exit(1);
}

const client = new MongoClient(uri);
const totals = new Map();
const addResult = (collection, result) => {
  const current = totals.get(collection) ?? { matched: 0, modified: 0, upserted: 0 };
  current.matched += result.matchedCount;
  current.modified += result.modifiedCount;
  current.upserted += result.upsertedCount;
  totals.set(collection, current);
};

try {
  await client.connect();
  const db = client.db(dbName);
  const users = db.collection("users");
  const existingEmailUser = await users.findOne({ email }, { projection: { demoSeedKey: 1 } });
  if (existingEmailUser && existingEmailUser.demoSeedKey !== "portfolio-demo-admin") {
    throw new Error("Demo 관리자 email이 기존 일반 계정과 충돌합니다.");
  }

  const now = new Date();
  const hashedPassword = await bcrypt.hash(password, 10);
  addResult("users", await users.updateOne(
    { demoSeedKey: "portfolio-demo-admin" },
    { $set: { email, name: "포트폴리오 데모 관리자", hashedPassword, role: "admin", isDeleted: false, isSuspended: false, passwordMustChange: false, pointsBalance: 0, pointsDebt: 0, demoSeedKey: "portfolio-demo-admin", demoSeedVersion: DEMO_VERSION, isDemoData: true, updatedAt: now }, $setOnInsert: { createdAt: now } },
    { upsert: true },
  ));
  const admin = await users.findOne({ demoSeedKey: "portfolio-demo-admin" }, { projection: { _id: 1 } });
  if (!admin?._id) throw new Error("Demo 관리자 ID를 조회하지 못했습니다.");

  for (const item of products) addResult("products", await db.collection("products").updateOne({ demoSeedKey: item.demoSeedKey }, { $set: { ...item, updatedAt: now }, $setOnInsert: { createdAt: now } }, { upsert: true }));
  for (const item of rackets) addResult("used_rackets", await db.collection("used_rackets").updateOne({ demoSeedKey: item.demoSeedKey }, { $set: { ...item, updatedAt: now }, $setOnInsert: { createdAt: now } }, { upsert: true }));
  const notice = { type: "notice", title: "포트폴리오 데모 사이트 안내", category: "일반", content: "<p>이 사이트의 상품과 재고는 포트폴리오 시연용 데모 데이터이며 실제 주문 및 재고와 무관합니다.</p>", isSecret: false, isPinned: true, attachments: [], authorId: admin._id.toString(), authorName: "포트폴리오 데모 관리자", status: "published", viewCount: 0, demoSeedKey: "portfolio-demo-notice", demoSeedVersion: DEMO_VERSION, isDemoData: true, updatedAt: now };
  addResult("board_posts", await db.collection("board_posts").updateOne({ demoSeedKey: notice.demoSeedKey }, { $set: notice, $setOnInsert: { createdAt: now } }, { upsert: true }));

  console.log("모드: APPLY");
  for (const collection of ["users", "products", "used_rackets", "board_posts"]) {
    const result = totals.get(collection);
    console.log(`${collection}: matched=${result.matched}, modified=${result.modified}, upserted=${result.upserted}`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : "Demo Seed 적용 중 오류가 발생했습니다.");
  process.exitCode = 1;
} finally {
  await client.close().catch(() => undefined);
}
