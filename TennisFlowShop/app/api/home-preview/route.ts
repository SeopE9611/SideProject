import { NextRequest, NextResponse } from "next/server";

import { RACKET_BRANDS, type RacketBrand } from "@/lib/constants";
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
  const rawRacketBrand = req.nextUrl.searchParams.get("brand")?.trim().toLowerCase();
  if (rawRacketBrand && !sections.includes("rackets")) {
    return NextResponse.json(
      { error: "라켓 브랜드는 라켓 섹션 요청에서만 사용할 수 있습니다." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  const racketBrand: RacketBrand | undefined = rawRacketBrand && rawRacketBrand !== "all"
    ? RACKET_BRANDS.find((brand) => brand.value === rawRacketBrand)?.value
    : undefined;
  if (rawRacketBrand && rawRacketBrand !== "all" && !racketBrand) {
    return NextResponse.json(
      { error: "지원하지 않는 라켓 브랜드입니다." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  const result = await loadHomePreviewSections(sections, "revalidate-api", {
    fresh: true,
    racketBrand,
  });
  const allFailed = sections.every((section) => result.status[section] === "error");

  return NextResponse.json(result, {
    status: allFailed ? 503 : 200,
    headers: { "Cache-Control": "no-store" },
  });
}
