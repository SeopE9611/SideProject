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
    layout.includes("관리자 데이터는 조회만 가능하며 등록·수정·삭제 등 변경 작업은 제한됩니다."),
  );
  assert.ok(layout.includes("{isDemoTour"));
  assert.ok(layout.includes("고객 화면으로 돌아가 주문·신청 흐름을 계속 체험할 수 있습니다."));
});

test("Portfolio Demo의 Storage와 Seed source marker를 유지한다", () => {
  const storage = read("lib/storage-config.server.ts");
  const seed = read("scripts/db/seed-portfolio-demo.mjs");

  assert.ok(storage.includes("IS_PORTFOLIO_DEMO"));
  assert.ok(seed.length > 0);
});

test("Demo 주문 상세은 서버 조회 전용 상태를 클라이언트에 전달한다", () => {
  const page = read("app/admin/orders/[id]/page.tsx");
  const detail = read("app/features/orders/components/OrderDetailClient.tsx");

  assert.ok(page.includes("readOnly={isPortfolioDemoReadOnly()}"));
  assert.ok(detail.includes("readOnly?: boolean"));
  assert.ok(detail.includes("Portfolio Demo 조회 전용"));
  assert.ok(detail.includes("readOnly={readOnly}"));
  assert.ok(detail.includes("!readOnly &&"));
});

test("Demo 대여 상세은 내부 메모 카드에 조회 전용 상태를 전달한다", () => {
  const detail = read("app/admin/rentals/[id]/_components/AdminRentalDetailClient.tsx");

  assert.ok(
    detail.includes(
      '<AdminInternalNotesCard targetType="rental" targetId={data.id} readOnly={readOnly} />',
    ),
  );
});

test("Demo의 주문/교체서비스 배송 변경 직행 경로는 조회 상세로 되돌린다", () => {
  const orderShipping = read("app/admin/orders/[id]/shipping-update/page.tsx");
  const stringingShipping = read("app/admin/applications/stringing/[id]/shipping-update/page.tsx");

  assert.ok(orderShipping.includes("if (isPortfolioDemoReadOnly())"));
  assert.ok(orderShipping.includes("redirect(`/admin/orders/${id}`)"));
  assert.ok(stringingShipping.includes("if (isPortfolioDemoReadOnly())"));
  assert.ok(stringingShipping.includes("redirect(`/admin/applications/stringing/${id}`)"));
});

test("신청서 상세 조회는 배포 host에 고정된 public API URL 대신 same-origin 경로를 사용한다", () => {
  const adminPage = read("app/admin/applications/stringing/[id]/page.tsx");
  const mypage = read("app/mypage/applications/_components/ApplicationDetail.tsx");
  const detail = read(
    "app/features/stringing-applications/components/StringingApplicationDetailClient.tsx",
  );

  assert.ok(!adminPage.includes("NEXT_PUBLIC_API_URL"));
  assert.ok(!mypage.includes("NEXT_PUBLIC_API_URL"));
  assert.ok(!detail.includes("baseUrl"));
  assert.ok(detail.includes("`/api/applications/stringing/${applicationId}`"));
});

test("Demo의 연결 교체서비스 상세은 mutation UI와 메모 변경을 차단한다", () => {
  const page = read("app/admin/applications/stringing/[id]/page.tsx");
  const detail = read(
    "app/features/stringing-applications/components/StringingApplicationDetailClient.tsx",
  );
  const notes = read("components/admin/AdminInternalNotesCard.tsx");

  assert.ok(page.includes("readOnly={isPortfolioDemoReadOnly()}"));
  assert.ok(detail.includes("Portfolio Demo에서는 편집할 수 없습니다."));
  assert.ok(detail.includes('readOnly\n      ? "주문 진행 단계 보기"'));
  assert.ok(detail.includes('readOnly ? "작업 상태" : "작업 상태 관리"'));
  assert.ok(detail.includes("접수·작업·완성 라켓 배송/수령 상태를 조회합니다."));
  assert.ok(detail.includes("{isAdmin && !readOnly && ("));
  assert.ok(detail.includes("readOnly={readOnly}"));
  assert.ok(notes.includes("readOnly?: boolean"));
  assert.ok(notes.includes("if (readOnly || isCreating) return"));
});
