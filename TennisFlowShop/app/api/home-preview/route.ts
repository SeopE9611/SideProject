import { NextRequest, NextResponse } from "next/server";

import {
  loadHomePreviewSections,
  type HomePreviewSection,
} from "@/lib/home/home-preview";

export const dynamic = "force-dynamic";

const ALLOWED_SECTIONS: readonly HomePreviewSection[] = [
  "products",
  "rackets",
  "packages",
  "notices",
];

function isHomePreviewSection(value: string): value is HomePreviewSection {
  return ALLOWED_SECTIONS.some((section) => section === value);
}

export async function GET(req: NextRequest) {
  const rawSections = req.nextUrl.searchParams.get("sections");
  if (!rawSections) {
    return NextResponse.json(
      { error: "요청할 홈 섹션을 지정해 주세요." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const requested = [...new Set(rawSections.split(",").map((value) => value.trim()))];
  if (requested.length === 0 || requested.some((section) => !isHomePreviewSection(section))) {
    return NextResponse.json(
      { error: "지원하지 않는 홈 섹션이 포함되어 있습니다." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const sections = requested.filter(isHomePreviewSection);
  const result = await loadHomePreviewSections(sections, "revalidate-api");
  const allFailed = sections.every((section) => result.status[section] === "error");

  return NextResponse.json(result, {
    status: allFailed ? 503 : 200,
    headers: { "Cache-Control": "no-store" },
  });
}
