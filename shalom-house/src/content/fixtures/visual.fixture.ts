import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { PublicGalleryItem } from "@/features/gallery/gallery.repository";
import type { PublicProgram } from "@/features/programs/program.types";
import type { PublicTransparencyDocument } from "@/features/transparency/transparency.repository";
import type { PublicStaffProfile } from "@/features/staff/staff.repository";
import type { PublicFacilitySpace } from "@/features/facility-spaces/facility-space.repository";
import type { GreetingContent } from "@/features/site-content/site-content.types";
import assets from "./assets/manifest.json";

/** Explicit local opt-in; production and Vercel previews cannot enable these fixtures. */
export function isVisualFixtureEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    !process.env.VERCEL_ENV &&
    process.env.SHALOM_CONTENT_SOURCE === "fixture" &&
    process.env.SHALOM_VISUAL_FIXTURES === "1"
  );
}

export function getVisualAboutFixtures<T>(items: readonly T[]): readonly T[] {
  if (!isVisualFixtureEnabled()) return [];
  if (process.env.SHALOM_ABOUT_FIXTURE_STATE === "error") throw new Error("시설소개 조회 실패 테스트");
  return process.env.SHALOM_ABOUT_FIXTURE_STATE === "empty" ? [] : items;
}

export const visualStaffFixtures: readonly PublicStaffProfile[] = [
  {
    id: "fixture-role-only",
    role: "[테스트] 이름 없이 표시하는 역할",
    responsibility:
      "역할명과 담당 업무의 배치를 확인하는 예시입니다. 실제 직원이나 시설의 인력 구성을 나타내지 않습니다.",
  },
  {
    id: "fixture-role-long",
    role: "[테스트] 여러 줄로 이어지는 긴 역할명과 업무 구분",
    name: "[테스트] 공개 이름 표시 영역",
    responsibility:
      "긴 업무 설명을 읽기 쉬운 폭으로 표시하는지 확인합니다.\n실제 직원 정보가 아닌 화면 검증용 문장이며, 입력한 줄바꿈도 확인합니다.",
  },
];

export const visualSpaceFixtures: readonly PublicFacilitySpace[] = [
  {
    id: "fixture-space-short",
    title: "[테스트] 짧은 공간명",
    description: "공간명과 설명의 정렬을 확인하는 예시입니다. 실제 시설의 공간이나 용도를 나타내지 않습니다.",
  },
  {
    id: "fixture-space-long",
    title: "[테스트] 긴 공간명이 여러 줄에 걸쳐 표시되는 경우",
    description:
      "공간 설명이 길어졌을 때 제목과 본문의 읽기 순서를 확인합니다.\n두 번째 줄에서도 기존 문단의 흐름과 간격이 유지되어야 합니다. 실제 위치나 출입 안내는 포함하지 않습니다.",
  },
];

export const visualGreetingFixture: GreetingContent = {
  pageDescription: "테스트 문구로 인사말의 읽기 순서와 줄바꿈을 확인합니다.",
  notice: "테스트용 메시지입니다. 실제 기관의 공식 인사말이나 운영 방침이 아닙니다.",
  statusLabel: "테스트용 인사말",
  title: "[테스트] 긴 인사말 제목과 본문의 읽기 순서를 확인합니다",
  paragraphs: [
    "이 문단은 인사말 화면을 검증하기 위한 예시입니다. 제목 다음에 본문을 읽을 수 있고, 긴 문장이 모바일에서도 잘리지 않는지 확인합니다.",
    "두 번째 문단은 여러 줄의 메시지를 확인합니다.\n작성자가 입력한 줄바꿈은 문맥과 함께 유지되어야 합니다.",
  ],
  signerRole: "[테스트] 발신 직책",
  signerName: "비공개이름검증용문구",
  showSignerName: false,
};

const galleryAssets = [assets.landscape, assets.portrait, assets.square] as const;
export const visualHomeImage = {
  src: "/api/gallery/fixture-home-still-life/media",
  alt: "붓과 수채화 종이를 배치한 AI 생성 디자인 예시. 실제 시설이나 활동 사진이 아닙니다.",
  width: 1536,
  height: 1024,
  caption: "AI 생성 디자인 예시 · 실제 기관 사진 아님",
};
export const visualGalleryFixtures: readonly PublicGalleryItem[] = galleryAssets.map((asset, index) => ({
  slug: ["fixture-landscape", "fixture-portrait", "fixture-square"][index],
  title: [
    "[테스트] 가로 이미지와 짧은 제목",
    "[테스트] 세로 이미지와 여러 줄로 이어지는 긴 제목의 줄바꿈과 읽기 순서를 확인합니다",
    "[테스트] 정사각형 이미지",
  ][index],
  category: "레이아웃 검증",
  description:
    index === 1
      ? "세로 이미지의 전체 비율과 목록 썸네일 크롭을 비교하는 테스트입니다.\n이 설명은 실제 활동 기록이 아니며, 상세 화면에서 줄바꿈이 유지되는지도 확인합니다."
      : "직접 만든 도형 이미지로 화면 배치를 확인합니다. 실제 시설이나 활동을 촬영한 사진이 아닙니다.",
  altText: `${asset.width}×${asset.height} 크기의 도형과 테스트 표시. 실제 시설 사진 아님.`,
  activityDate: `2025-01-0${3 - index}`,
  publishedAt: "2025-01-04T00:00:00.000Z",
  width: asset.width,
  height: asset.height,
}));

export const visualDocumentFixtures: readonly PublicTransparencyDocument[] = [
  {
    slug: "fixture-document-layout",
    title: "[테스트] 긴 자료 제목과 기준 기간, 문서일 및 PDF 열기 표시를 확인하는 예시 자료",
    category: "budget_settlement",
    periodLabel: "2025년 (테스트)",
  },
  {
    slug: "fixture-document-previous",
    title: "[테스트] 다른 기준 기간의 예시",
    category: "budget_settlement",
    periodLabel: "2024년 (테스트)",
  },
  {
    slug: "fixture-document-operations",
    title: "[테스트] 다른 분류의 예시",
    category: "operations",
    periodLabel: "2025년 (테스트)",
  },
].map((document) => ({
  ...document,
  category: document.category as PublicTransparencyDocument["category"],
  summary: "파일 열기와 필터 확인을 위해 같은 테스트 PDF를 연결했습니다. 실제 예산·결산이나 운영 보고서가 아닙니다.",
  documentDate: "2025-01-03",
  publishedAt: "2025-01-04T00:00:00.000Z",
  fileType: "PDF",
  byteSize: assets.pdf.byteSize,
}));

export const visualProgramFixtures: readonly PublicProgram[] = [
  {
    id: "fixture-program-media",
    slug: "fixture-program-media",
    category: "화면 검증",
    title: "[테스트] 대표 이미지와 긴 제목, 활동 내용 및 첨부파일을 함께 확인하는 프로그램 예시",
    summary: "실제 운영 프로그램이 아닙니다. 이미지와 본문, PDF가 모두 있는 상세 화면을 확인하기 위한 예시입니다.",
    purpose: "공개 콘텐츠가 채워진 상태에서 제목과 본문의 가독성, 이미지 비율과 파일 이용 경로를 확인합니다.",
    body: [
      "이 문장은 실제 활동 설명이 아닙니다. 충분한 길이의 본문이 작은 화면에서도 자연스럽게 줄바꿈되는지 확인하기 위한 테스트 문장입니다.",
      "두 번째 문단입니다.\n직접 입력한 줄바꿈과 문단 사이 간격을 확인합니다.",
    ],
    operationStatusLabel: "테스트용 · 실제 운영 정보 아님",
    sortOrder: 0,
    publishedAt: "2025-01-04T00:00:00.000Z",
    updatedAt: "2025-01-05T00:00:00.000Z",
    coverImage: {
      src: "/api/gallery/fixture-landscape/media",
      altText: visualGalleryFixtures[0].altText,
      width: assets.landscape.width,
      height: assets.landscape.height,
    },
    attachment: {
      href: "/api/transparency/fixture-document-layout/document",
      label: "[테스트] 첨부파일 내려받기 확인",
      originalFileName: "테스트용_실제기관자료아님_긴파일명의줄바꿈과다운로드동작확인.pdf",
      byteSize: assets.pdf.byteSize,
    },
  },
  {
    id: "fixture-program-text",
    slug: "fixture-program-text",
    category: "화면 검증",
    title: "[테스트] 텍스트만 있는 예시",
    summary: "이미지와 첨부파일이 없는 상태를 비교합니다.",
    purpose: "콘텐츠의 유무에 따른 배치를 확인합니다.",
    body: ["실제 프로그램이나 모집 안내가 아닌 화면 검증용 문장입니다."],
    operationStatusLabel: null,
    sortOrder: 1,
    publishedAt: "2025-01-04T00:00:00.000Z",
    updatedAt: "2025-01-04T00:00:00.000Z",
    coverImage: null,
    attachment: null,
  },
];

/** Fixed allowlist only. Does not access MongoDB, Supabase, or a user-supplied path. */
export async function serveVisualFixtureFile(kind: "gallery" | "document", slug: string): Promise<Response | null> {
  if (!isVisualFixtureEnabled()) return null;
  const index = visualGalleryFixtures.findIndex((item) => item.slug === slug);
  const asset =
    kind === "gallery"
      ? slug === "fixture-home-still-life"
        ? { fileName: "home-still-life.png" }
        : galleryAssets[index]
      : visualDocumentFixtures.some((item) => item.slug === slug)
        ? assets.pdf
        : undefined;
  const headers = {
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "X-Robots-Tag": "noindex, nofollow",
    "Cross-Origin-Resource-Policy": "same-origin",
  };
  if (!asset) return new Response(null, { status: 404, headers });
  try {
    const buffer = await readFile(join(process.cwd(), "src/content/fixtures/assets", asset.fileName));
    return new Response(new Uint8Array(buffer), {
      headers: {
        ...headers,
        "Content-Type":
          kind === "gallery" ? (asset.fileName.endsWith(".png") ? "image/png" : "image/webp") : "application/pdf",
        "Content-Disposition": `inline; filename="${asset.fileName}"`,
        "Content-Length": String(buffer.byteLength),
      },
    });
  } catch {
    return new Response(null, { status: 503, headers });
  }
}
