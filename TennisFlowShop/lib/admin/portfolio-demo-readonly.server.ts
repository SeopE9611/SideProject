import "server-only";

import { NextResponse } from "next/server";

const ADMIN_MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function isPortfolioDemoReadOnly(): boolean {
  return process.env.PORTFOLIO_DEMO_MODE === "true";
}

export function getPortfolioDemoAdminMutationBlock(req: Request): NextResponse | null {
  if (!isPortfolioDemoReadOnly() || !ADMIN_MUTATION_METHODS.has(req.method.toUpperCase())) {
    return null;
  }

  return NextResponse.json(
    {
      ok: false,
      code: "PORTFOLIO_DEMO_READ_ONLY",
      message: "포트폴리오 데모에서는 조회만 가능합니다.",
    },
    { status: 403 },
  );
}
